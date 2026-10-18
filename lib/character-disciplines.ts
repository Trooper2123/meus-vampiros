import { randomUUID } from 'node:crypto'
import { CharacterCommandError, runCharacterCommand, type CommandCharacter } from './character-commands'
import { disciplineContext, disciplineRows, recordDisciplinePurchase, validateDisciplineAllocation, xpAcquisitions } from './discipline-allocation'
import { DISCIPLINE_CONTENTS } from './vtm-v5/discipline-contents'
import { DISCIPLINES, disciplineDefinition } from './vtm-v5/disciplines'
import { evaluateDisciplineAccess, type AcquisitionSource, type DisciplineAccessGrant, type DisciplineRequirement } from './vtm-v5/discipline-access'

type DisciplineCommand = { kind: 'PURCHASE' | 'AUTHORIZE' | 'REVOKE'; disciplineId: string; targetLevel: number; acquisitionSource?: AcquisitionSource; requirement?: DisciplineRequirement; grantId?: string; reason: string; expectedRevision: number; idempotencyKey: string }
export function disciplineView(character: CommandCharacter, actorId: string) {
  if (character.ownerId !== actorId && character.masterId !== actorId) throw new CharacterCommandError(403, 'Acesso negado.')
  const context = disciplineContext(character)
  const rows = disciplineRows(character.data)
  return {
    contents: DISCIPLINE_CONTENTS,
    revision: character.revision, availableXp: character.totalXp - character.spentXp, canAuthorize: Boolean(character.campaignId && character.masterId === actorId),
    disciplines: DISCIPLINES.map(definition => {
      const level = Number(rows.find(row => disciplineDefinition(row.disciplineId ?? row.name)?.id === definition.id)?.level ?? 0)
      return { id: definition.id, name: definition.name, level, ...evaluateDisciplineAccess({ character: { ...context, currentLevel: level }, disciplineId: definition.id, acquisitionSource: 'XP', targetLevel: level + 1 }) }
    }),
    acquisitions: xpAcquisitions(character).map(({ disciplineId, source, fromLevel, targetLevel, xpCost }) => ({ disciplineId, source, fromLevel, targetLevel, xpCost })),
    grants: (context.grants ?? []).map(grant => character.masterId === actorId ? grant : { id: grant.id, disciplineId: grant.disciplineId, requirement: grant.requirement, acquisitionSource: grant.acquisitionSource, targetLevel: grant.targetLevel, revokedAt: grant.revokedAt }),
  }
}
export function changeCharacterDiscipline(actorId: string, characterId: string, input: DisciplineCommand) {
  const definition = DISCIPLINES.find(entry => entry.id === input.disciplineId)
  if (!definition || !['PURCHASE', 'AUTHORIZE', 'REVOKE'].includes(input.kind) || !Number.isSafeInteger(input.targetLevel) || input.targetLevel < 1 || input.targetLevel > 5 || typeof input.reason !== 'string' || !input.reason.trim() || input.reason.length > 500 || !Number.isSafeInteger(input.expectedRevision) || input.expectedRevision < 0 || !input.idempotencyKey) throw new CharacterCommandError(400, 'Aquisição ou autorização inválida.')
  return runCharacterCommand(actorId, characterId, { key: input.idempotencyKey, expectedRevision: input.expectedRevision, type: `DISCIPLINE_${input.kind}`, payload: input },
    character => input.kind === 'PURCHASE' ? character.ownerId === actorId || character.masterId === actorId : Boolean(character.campaignId && character.masterId === actorId), character => {
      if (character.characterType !== 'PLAYER_VAMPIRE' || ['ARCHIVED', 'DISABLED'].includes(character.status)) throw new CharacterCommandError(422, 'Esta ficha não permite aquisições de Disciplinas.')
      if (input.kind === 'AUTHORIZE') authorizeDiscipline(character, actorId, input, definition)
      else if (input.kind === 'REVOKE') revokeDiscipline(character, actorId, input, definition)
      else purchaseDiscipline(character, actorId, input, definition)
      return { ok: true, ...disciplineView(character, actorId) }
    })
}


function authorizeDiscipline(character: CommandCharacter, actorId: string, input: DisciplineCommand, definition: NonNullable<ReturnType<typeof disciplineDefinition>>) {
  const context = disciplineContext(character)
  if (!['CLAN_ASSOCIATION', 'LEARNING_APPROVAL'].includes(input.requirement ?? '') || (input.requirement === 'CLAN_ASSOCIATION' ? input.acquisitionSource !== 'CLAN' || input.targetLevel > 2 : input.acquisitionSource !== 'XP')) throw new CharacterCommandError(400, 'Indique exatamente o requisito e a origem autorizados.')
  if (context.clanCode === 'THIN_BLOOD' || definition.id === 'THIN_BLOOD_ALCHEMY') throw new CharacterCommandError(422, 'Esta autorização não dispensa a política própria de sangue-ralo.')
  if (input.requirement === 'CLAN_ASSOCIATION' && !context.clanCode) throw new CharacterCommandError(422, 'Defina o clã antes de autorizar sua exceção.')
  const grants = [...context.grants ?? []]
  grants.push({ id: randomUUID(), disciplineId: definition.id, targetLevel: input.targetLevel, acquisitionSource: input.acquisitionSource!, requirement: input.requirement!, clanCode: context.clanCode, campaignId: character.campaignId!, createdByUserId: actorId, reason: input.reason.trim(), createdAt: new Date().toISOString() })
  character.gameState.disciplineAccessGrants = grants

}

function revokeDiscipline(character: CommandCharacter, actorId: string, input: DisciplineCommand, definition: NonNullable<ReturnType<typeof disciplineDefinition>>) {
  const context = disciplineContext(character)

  const grants = structuredClone(context.grants ?? []) as DisciplineAccessGrant[]
  const grant = grants.find(entry => entry.id === input.grantId && entry.disciplineId === definition.id && entry.targetLevel === input.targetLevel && entry.campaignId === character.campaignId)
  if (!grant) throw new CharacterCommandError(404, 'Autorização não encontrada.')
  grant.revokedAt = new Date().toISOString()
  if (grant.requirement === 'CLAN_ASSOCIATION') character.status = 'DRAFT'
  character.gameState.disciplineAccessGrants = grants

}

function purchaseDiscipline(character: CommandCharacter, actorId: string, input: DisciplineCommand, definition: NonNullable<ReturnType<typeof disciplineDefinition>>) {
  const context = disciplineContext(character)

  validateDisciplineAllocation(character, true)
  const level = Number(disciplineRows(character.data).find(row => disciplineDefinition(row.disciplineId ?? row.name)?.id === definition.id)?.level ?? 0)
  const access = evaluateDisciplineAccess({ character: { ...context, currentLevel: level }, disciplineId: definition.id, acquisitionSource: 'XP', targetLevel: input.targetLevel })
  if (!access.eligible) throw new CharacterCommandError(422, access.blockers[0].message)
  if (![character.totalXp, character.spentXp].every(Number.isSafeInteger) || character.spentXp < 0 || character.spentXp > character.totalXp || character.totalXp - character.spentXp < access.xpCost) throw new CharacterCommandError(422, 'Saldo de XP insuficiente ou inválido.')
  recordDisciplinePurchase(character, definition.id, input.targetLevel, access.xpCost, actorId)
  character.status = 'DRAFT'
  validateDisciplineAllocation(character, true)
}
