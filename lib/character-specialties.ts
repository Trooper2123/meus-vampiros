import { randomUUID } from 'node:crypto'
import { CharacterCommandError, runCharacterCommand, type CommandCharacter } from './character-commands'
import { validateCharacterSkills } from './vtm-v5/skills'
import { PREDATOR_TYPE_BY_CODE, type PredatorTypeCode } from './vtm-v5/predator-types'
import { calculateSpecialtyGrants, eligibleSpecialtySkills, selectSpecialtyGrant, validateSpecialty, calculateSpecialtyPurchase, normalizeSpecialtySkillId, normalizeSpecialtyName, type SpecialtyRules, type Specialty } from './vtm-v5/specialties'

export function specialtyRules(character: CommandCharacter, preview = false): SpecialtyRules {
  const validation = validateCharacterSkills(character.data)
  if (!preview && !validation.valid) throw new CharacterCommandError(422, 'Revise as habilidades inválidas antes de escolher uma especialidade.')
  const selection = character.data.predatorTypeSelection as { code?: PredatorTypeCode } | undefined
  const predator = selection?.code ? PREDATOR_TYPE_BY_CODE.get(selection.code) : undefined
  return { skills: validation.skills, creation: true, ...(predator ? { predator: { code: predator.code, options: predator.specialtyOptions.map(name => ({ skillId: normalizeSpecialtySkillId(name.split('(')[0]), name })) } } : {}) }
}

export function characterSpecialties(character: CommandCharacter): Specialty[] {
  return Array.isArray(character.gameState.specialties) ? character.gameState.specialties as Specialty[] : []
}

export function specialtyView(character: CommandCharacter, actorId: string) {
  const specialties = characterSpecialties(character)
  const rules = specialtyRules(character, true)
  const skills = Object.fromEntries(Object.entries(rules.skills).map(([skill, dots]) => [normalizeSpecialtySkillId(skill), dots]))
  const grants = calculateSpecialtyGrants(rules).filter(grant => !specialties.some(specialty => specialty.grantId === grant.id))
  return { specialties, skills, grants, skillValidation: validateCharacterSkills(character.data), eligibility: { purchase: eligibleSpecialtySkills(rules, specialties), grants: Object.fromEntries(grants.map(grant => [grant.id, eligibleSpecialtySkills(rules, specialties, grant)])) }, availableXp: character.totalXp - character.spentXp, revision: character.revision, requiresApproval: Boolean(character.campaignId), canApprove: character.masterId === actorId }
}

type SpecialtyInput = { kind: 'GRANT' | 'PURCHASE' | 'APPROVE' | 'REJECT'; grantId?: string; skillId?: string; name?: string; specialtyId?: string; reason: string; expectedRevision: number; idempotencyKey: string }

export function changeSpecialty(actorId: string, id: string, input: SpecialtyInput) {
  return runCharacterCommand(actorId, id, { key: input.idempotencyKey, type: `SPECIALTY_${input.kind}`, expectedRevision: input.expectedRevision, payload: input }, character => character.ownerId === actorId || character.masterId === actorId, character => {
    if (character.characterType !== 'PLAYER_VAMPIRE') throw new CharacterCommandError(422, 'Este fluxo exige um vampiro jogável.')
    const rules = specialtyRules(character)
    let specialties = structuredClone(characterSpecialties(character))
    const master = character.masterId === actorId
    try {
      if (input.kind === 'APPROVE' || input.kind === 'REJECT') {
        if (!master) throw new CharacterCommandError(403, 'Somente o Narrador pode revisar especialidades.')
        const specialty = specialties.find(entry => entry.id === input.specialtyId)
        if (!specialty) throw new CharacterCommandError(404, 'Especialidade não encontrada.')
        if (specialty.status !== 'PENDING') throw new CharacterCommandError(409, 'A especialidade já foi revisada.')
        if (input.kind === 'REJECT') {
          if (specialty.origin === 'XP') {
            if (character.spentXp < 3) throw new CharacterCommandError(422, 'Saldo de XP inconsistente.')
            character.spentXp -= 3
          }
          specialties = specialties.filter(entry => entry.id !== specialty.id)
        } else {
          const errors = validateSpecialty(specialty, specialties, rules)
          if (errors.length) throw new CharacterCommandError(422, errors.join(' '))
          specialty.status = 'APPROVED'
        }
      } else if (input.kind === 'GRANT') {
        if (character.status !== 'DRAFT') throw new CharacterCommandError(409, 'Escolhas iniciais exigem ficha em rascunho.')
        const specialty = selectSpecialtyGrant({ grantId: input.grantId!, skillId: input.skillId!, name: input.name! }, specialties, rules)
        if (!character.campaignId) specialty.status = 'APPROVED'
        if (!specialties.some(entry => entry.id === specialty.id)) specialties.push(specialty)
      } else {
        if (!Number.isSafeInteger(character.totalXp) || !Number.isSafeInteger(character.spentXp) || character.totalXp < 0 || character.spentXp < 0 || character.spentXp > character.totalXp) throw new CharacterCommandError(422, 'Saldo de XP inconsistente.')
        calculateSpecialtyPurchase(character.totalXp - character.spentXp)
        const specialty: Specialty = { id: randomUUID(), skillId: normalizeSpecialtySkillId(input.skillId!), name: normalizeSpecialtyName(input.name!), origin: 'XP', status: character.campaignId ? 'PENDING' : 'APPROVED', costXp: 3 }
        const errors = validateSpecialty(specialty, specialties, rules)
        if (errors.length) throw new CharacterCommandError(422, errors.join(' '))
        character.spentXp += 3
        specialties.push(specialty)
      }
    } catch (error) { if (error instanceof CharacterCommandError) throw error; throw new CharacterCommandError(422, error instanceof Error ? error.message : 'Especialidade inválida.') }
    character.gameState = { ...character.gameState, specialties }
    return { ok: true, specialties, availableXp: character.totalXp - character.spentXp }
  })
}
