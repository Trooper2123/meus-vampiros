import { normalizeSkillId, SPECIALTY_SKILL_NAMES, validateSkillValues } from './skills'

export type Specialty = {
  id: string
  skillId: string
  name: string
  origin: 'SKILL' | 'CREATION' | 'PREDATOR' | 'XP' | 'CUSTOM'
  grantId?: string
  status: 'PENDING' | 'APPROVED'
  costXp: number
}

export type SpecialtyGrant = {
  id: string
  origin: 'SKILL' | 'CREATION' | 'PREDATOR'
  skillId?: string
  options?: readonly { skillId: string; name: string }[]
}

export type SpecialtyRules = {
  skills: Record<string, number>
  creation?: boolean
  predator?: { code: string; options: readonly { skillId: string; name: string }[] }
  limits?: Record<string, number>
}

const skillIds = new Set(Object.keys(SPECIALTY_SKILL_NAMES))
const freeSkills = ['academicos', 'oficios', 'performance', 'ciencia']

export function normalizeSpecialtyName(name: string): string {
  return name.normalize('NFKC').trim().replace(/\s+/gu, ' ')
}

export function normalizeSpecialtySkillId(skillId: string): string {
  return normalizeSkillId(skillId)
}

function normalizeSkills(skills: Record<string, number>): Record<string, number> {
  const validation = validateSkillValues(skills)
  if (!validation.valid) throw new Error('Habilidade ou pontos inválidos.')
  return validation.skills
}

function specialtyLimit(rules: SpecialtyRules, skillId: string, dots: number): number {
  const limit = rules.limits?.[skillId]
  if (limit !== undefined && (!Number.isSafeInteger(limit) || limit < 0)) throw new Error('Limite de especialidades inválido.')
  return limit ?? (skillId === 'oficios' ? Number.POSITIVE_INFINITY : dots)
}

export function eligibleSpecialtySkills(rules: SpecialtyRules, existing: readonly Specialty[], grant?: SpecialtyGrant) {
  const skills = normalizeSkills(rules.skills)
  return Object.entries(skills).filter(([skillId, dots]) => {
    if (dots < 1 || (grant?.skillId && normalizeSkillId(grant.skillId) !== skillId)) return false
    const count = existing.filter(specialty => normalizeSkillId(specialty.skillId) === skillId).length
    const limit = specialtyLimit(rules, skillId, dots)
    if (count >= limit) return false
    return !grant?.options || grant.options.some(option => normalizeSkillId(option.skillId) === skillId && !existing.some(specialty => normalizeSkillId(specialty.skillId) === skillId && normalizeSpecialtyName(specialty.name).toLocaleLowerCase('pt-BR') === normalizeSpecialtyName(option.name).toLocaleLowerCase('pt-BR')))
  }).map(([skillId, dots]) => ({ skillId, dots, name: SPECIALTY_SKILL_NAMES[skillId] }))
}

export function calculateSpecialtyGrants(rules: SpecialtyRules): SpecialtyGrant[] {
  const skills = normalizeSkills(rules.skills)
  const grants: SpecialtyGrant[] = freeSkills.filter(skillId => (skills[skillId] ?? 0) > 0).map(skillId => ({ id: `skill:${skillId}:first-dot`, origin: 'SKILL', skillId }))
  if (rules.creation) grants.push({ id: 'creation:additional', origin: 'CREATION' })
  if (rules.predator) {
    if (!rules.predator.code.trim() || rules.predator.options.length === 0) throw new Error('Concessão de predador inválida.')
    const options = rules.predator.options.map(option => {
      const skillId = normalizeSpecialtySkillId(option.skillId)
      const name = normalizeSpecialtyName(option.name)
      if (!skillIds.has(skillId) || !name || name.length > 100) throw new Error('Opção de especialidade inválida.')
      return { skillId, name }
    })
    grants.push({ id: `predator:${rules.predator.code}:specialty`, origin: 'PREDATOR', options })
  }
  return grants
}

export function validateSpecialty(specialty: Specialty, existing: readonly Specialty[], rules: SpecialtyRules): string[] {
  const errors: string[] = []
  const skills = normalizeSkills(rules.skills)
  const skillId = normalizeSpecialtySkillId(specialty.skillId)
  const name = normalizeSpecialtyName(specialty.name)
  if (!specialty.id.trim() || !name || name.length > 100 || /[\p{Cc}\p{Cf}]/u.test(name)) errors.push('Especialidade inválida.')
  if (!skillIds.has(skillId) || !(skills[skillId] > 0)) errors.push('A habilidade precisa de ao menos um ponto.')
  if (!['PENDING', 'APPROVED'].includes(specialty.status) || !['SKILL', 'CREATION', 'PREDATOR', 'XP', 'CUSTOM'].includes(specialty.origin)) errors.push('Origem ou estado inválido.')
  if (specialty.costXp !== (specialty.origin === 'XP' ? 3 : 0)) errors.push('Custo de especialidade inválido.')
  const others = existing.filter(entry => entry.id !== specialty.id)
  if (others.some(entry => normalizeSpecialtySkillId(entry.skillId) === skillId && normalizeSpecialtyName(entry.name).toLocaleLowerCase('pt-BR') === name.toLocaleLowerCase('pt-BR'))) errors.push('Especialidade duplicada.')
  if (others.filter(entry => normalizeSpecialtySkillId(entry.skillId) === skillId).length + 1 > specialtyLimit(rules, skillId, skills[skillId] ?? 0)) errors.push('Limite de especialidades excedido.')
  if (['SKILL', 'CREATION', 'PREDATOR'].includes(specialty.origin)) {
    const grant = calculateSpecialtyGrants(rules).find(entry => entry.id === specialty.grantId)
    if (grant?.origin !== specialty.origin || (grant.skillId && grant.skillId !== skillId) || (grant.options && !grant.options.some(option => option.skillId === skillId && option.name.toLocaleLowerCase('pt-BR') === name.toLocaleLowerCase('pt-BR')))) errors.push('Concessão incompatível.')
    if (others.some(entry => entry.grantId === specialty.grantId)) errors.push('Concessão já utilizada.')
  } else if (specialty.grantId) errors.push('Origem incompatível com concessão.')
  return errors
}

export function reconcileSpecialties(existing: readonly Specialty[], rules: SpecialtyRules): { preserved: Specialty[]; incompatible: Array<{ specialty: Specialty; errors: string[] }>; availableGrants: SpecialtyGrant[] } {
  const preserved: Specialty[] = []
  const incompatible: Array<{ specialty: Specialty; errors: string[] }> = []
  for (const specialty of existing) {
    const errors = preserved.some(entry => entry.id === specialty.id) ? ['Identificador duplicado.'] : validateSpecialty(specialty, preserved, rules)
    if (errors.length) incompatible.push({ specialty, errors })
    else preserved.push({ ...specialty, skillId: normalizeSpecialtySkillId(specialty.skillId), name: normalizeSpecialtyName(specialty.name) })
  }
  return { preserved, incompatible, availableGrants: calculateSpecialtyGrants(rules).filter(grant => !preserved.some(specialty => specialty.grantId === grant.id)) }
}

export function createCustomSpecialty(input: { id: string; skillId: string; name: string }, existing: readonly Specialty[], rules: SpecialtyRules): Specialty {
  if (existing.some(entry => entry.id === input.id)) throw new Error('Identificador duplicado.')
  const specialty: Specialty = { id: input.id, skillId: normalizeSpecialtySkillId(input.skillId), name: normalizeSpecialtyName(input.name), origin: 'CUSTOM', status: 'PENDING', costXp: 0 }
  const errors = validateSpecialty(specialty, existing, rules)
  if (errors.length) throw new Error(errors.join(' '))
  return specialty
}

export function selectSpecialtyGrant(input: { grantId: string; skillId: string; name: string }, existing: readonly Specialty[], rules: SpecialtyRules): Specialty {
  const grant = calculateSpecialtyGrants(rules).find(entry => entry.id === input.grantId)
  if (!grant) throw new Error('Concessão inválida.')
  const skillId = normalizeSpecialtySkillId(input.skillId)
  const name = normalizeSpecialtyName(input.name)
  const previous = existing.find(entry => entry.grantId === grant.id)
  if (previous && (previous.skillId !== skillId || previous.name !== name)) throw new Error('Concessão já utilizada.')
  const specialty: Specialty = previous ?? { id: `specialty:${grant.id}`, skillId, name, origin: grant.origin, grantId: grant.id, status: 'PENDING', costXp: 0 }
  const errors = validateSpecialty(specialty, existing, rules)
  if (errors.length) throw new Error(errors.join(' '))
  return specialty
}

export function calculateSpecialtyPurchase(availableXp: number): { costXp: 3; remainingXp: number } {
  if (!Number.isSafeInteger(availableXp) || availableXp < 0) throw new Error('Saldo de XP inválido.')
  if (availableXp < 3) throw new Error('Saldo de XP insuficiente.')
  return { costXp: 3, remainingXp: availableXp - 3 }
}

export function specialtyRollBonus(selectedIds: readonly string[], skill: string, authorizedSpecialties: readonly Specialty[], applicable: boolean): 0 | 1 {
  if (selectedIds.length > 1) throw new Error('Apenas uma especialidade por rolagem.')
  if (!selectedIds.length) return 0
  const specialty = authorizedSpecialties.find(entry => entry.id === selectedIds[0])
  if (specialty?.status !== 'APPROVED' || normalizeSpecialtySkillId(specialty.skillId) !== normalizeSpecialtySkillId(skill) || !applicable) throw new Error('Especialidade não aplicável à rolagem.')
  return 1
}
