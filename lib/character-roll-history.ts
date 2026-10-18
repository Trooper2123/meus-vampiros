import { randomUUID } from 'node:crypto'
import { CharacterCommandError, getCommandCharacter, runCharacterCommand, type CommandCharacter } from './character-commands'
import { serverDiceProvider, type DiceProvider } from './vtm-v5/dice-provider'
import { evaluateV5Roll } from './vtm-v5/dice-evaluator'
import { readSessionState } from './vtm-v5/session-state'
import { RULE_PROFILE, publicRuleSource } from './vtm-v5/rule-profile'

export const ROLL_MODES = ['TEST', 'CHECK', 'WILLPOWER', 'HUMANITY', 'TAKING_HALF', 'AUTOMATIC'] as const
export type RollMode = typeof ROLL_MODES[number]
type RollResult = ReturnType<typeof evaluateV5Roll>
type Adjudication = { id: string; kind: 'COMPLICATION' | 'NARRATIVE_FAILURE' | 'OFFER_COST' | 'ACCEPT_COST'; note: string; shared: boolean; actorId: string; offerId?: string }
export type StoredRoll = { id: string; mode: RollMode; pool: number; specialtyBonus: number; visibility: 'PUBLIC' | 'SECRET'; hiddenDifficulty: boolean; reason: string; actorId: string; campaignId: string | null; ruleProfile: typeof RULE_PROFILE; revisions: { number: number; result: RollResult; replacements?: { dieId: string; before: number; after: number }[] }[]; willpowerUsed: boolean; adjudications: Adjudication[] }

export function characterRollHistory(character: Pick<CommandCharacter, 'gameState'>): StoredRoll[] {
  // shortcut: histórico no agregado da ficha; separar e paginar antes de persistência externa ou sessões extensas.
  return (character.gameState.rolls as StoredRoll[] | undefined) ?? []
}

export function projectRoll(roll: StoredRoll, isMaster: boolean) {
  roll = structuredClone(roll)
  const visibleResult = (result: RollResult) => isMaster || !roll.hiddenDifficulty ? result : { normalDice: result.normalDice, hungerDice: result.hungerDice, successes: result.successes, totalFailure: result.totalFailure }
  const revision = roll.revisions.at(-1)!
  return {
    id: roll.id, mode: roll.mode, pool: roll.pool, specialtyBonus: roll.specialtyBonus, visibility: roll.visibility, reason: roll.reason, hiddenDifficulty: roll.hiddenDifficulty,
    ruleProfile: roll.ruleProfile, sources: ['CORE-DICE', 'CORE-HUNGER', 'CORE-WP', 'COMP-DICE'].map(id => publicRuleSource(id as Parameters<typeof publicRuleSource>[0])),
    result: visibleResult(revision.result), rollRevision: revision.number,
    dice: [...revision.result.normalDice.map((value, index) => ({ id: `N:${index}`, type: 'NORMAL', value })), ...revision.result.hungerDice.map((value, index) => ({ id: `H:${index}`, type: 'HUNGER', value }))],
    revisions: roll.revisions.map(entry => ({ number: entry.number, result: visibleResult(entry.result), replacements: entry.replacements })),
    canReroll: (isMaster || !roll.hiddenDifficulty) && roll.mode === 'TEST' && !roll.willpowerUsed && revision.result.normalDice.length > 0 && !roll.adjudications.some(entry => ['OFFER_COST', 'ACCEPT_COST', 'NARRATIVE_FAILURE'].includes(entry.kind)),
    adjudications: roll.adjudications.filter(entry => isMaster || entry.shared).map(({ id, kind, note, offerId }) => ({ id, kind, note, offerId })),
  }
}

export function storeRoll(character: CommandCharacter, actorId: string, input: { mode: RollMode; pool: number; specialtyBonus: number; visibility: 'PUBLIC' | 'SECRET'; hiddenDifficulty?: boolean; reason: string }, result: RollResult) {
  const roll: StoredRoll = { id: randomUUID(), ...input, actorId, campaignId: character.campaignId, hiddenDifficulty: input.hiddenDifficulty === true, ruleProfile: RULE_PROFILE, revisions: [{ number: 0, result }], willpowerUsed: false, adjudications: [] }
  character.gameState.rolls = [...characterRollHistory(character), roll]
  return projectRoll(roll, character.masterId === actorId)
}

export async function getCharacterRollHistory(actorId: string, characterId: string) {
  const character = await getCommandCharacter(characterId)
  if (!character) throw new CharacterCommandError(404, 'Ficha não encontrada.')
  if (character.ownerId !== actorId && character.masterId !== actorId) throw new CharacterCommandError(403, 'Acesso negado.')
  const isMaster = character.masterId === actorId
  return { revision: character.revision, canAdjudicate: isMaster, rolls: visibleCharacterRolls(character, actorId) }
}

export function visibleCharacterRolls(character: CommandCharacter, actorId: string) {
  const isMaster = character.masterId === actorId
  return characterRollHistory(character).filter(roll => roll.visibility !== 'SECRET' || isMaster && roll.campaignId === character.campaignId).map(roll => {
    const sameCampaign = roll.campaignId === character.campaignId
    const projection = projectRoll(roll, isMaster && sameCampaign)
    return { ...projection, canReroll: sameCampaign && projection.canReroll, canAdjudicate: sameCampaign && isMaster }
  })
}

type RevisionInput = { expectedRevision: number; idempotencyKey: string }
export async function rerollCharacterDice(actorId: string, characterId: string, rollId: string, input: RevisionInput & { dieIds: string[] }, provider: DiceProvider = serverDiceProvider) {
  if (!Array.isArray(input.dieIds) || input.dieIds.length < 1 || input.dieIds.length > 3 || new Set(input.dieIds).size !== input.dieIds.length || input.dieIds.some(id => typeof id !== 'string' || !/^N:(?:0|[1-9]\d*)$/u.test(id))) throw new CharacterCommandError(400, 'Selecione de um a três dados comuns distintos.')
  const command = await runCharacterCommand(actorId, characterId, { key: input.idempotencyKey, expectedRevision: input.expectedRevision, type: 'DICE_REROLLED', payload: { rollId, dieIds: input.dieIds } }, character => {
    const roll = characterRollHistory(character).find(entry => entry.id === rollId)
    return (character.ownerId === actorId || character.masterId === actorId) && (!roll || roll.campaignId === character.campaignId && (roll.visibility !== 'SECRET' && !roll.hiddenDifficulty || character.masterId === actorId))
  }, character => {
    const roll = findRoll(character, actorId, rollId)
    if (character.status !== 'APPROVED' || roll.campaignId !== character.campaignId) throw new CharacterCommandError(409, 'Revalide a ficha e o contexto da rolagem.')
    const projection = projectRoll(roll, character.masterId === actorId)
    if (!projection.canReroll) throw new CharacterCommandError(422, 'Esta rolagem não permite outra rerrolagem por Força de Vontade.')
    const previous = roll.revisions.at(-1)!.result
    const indexes = input.dieIds.map(id => Number(id.slice(2)))
    if (indexes.some(index => !Number.isSafeInteger(index) || index >= previous.normalDice.length)) throw new CharacterCommandError(400, 'Dado comum não encontrado.')
    const state = readSessionState(character.data, character.gameState)
    if (state.willpowerCurrent < 1) throw new CharacterCommandError(422, 'Força de Vontade insuficiente.')
    const replacements = provider.rollD10(indexes.length)
    if (replacements.length !== indexes.length) throw new CharacterCommandError(500, 'Resposta inválida do provedor de dados.')
    const normalDice = [...previous.normalDice]
    indexes.forEach((index, position) => { normalDice[index] = replacements[position] })
    const result = evaluateV5Roll(normalDice, previous.hungerDice, previous.difficulty)
    roll.revisions.push({ number: roll.revisions.length, result, replacements: indexes.map((index, position) => ({ dieId: input.dieIds[position], before: previous.normalDice[index], after: replacements[position] })) })
    roll.willpowerUsed = true
    character.gameState = { ...character.gameState, willpowerDamage: { ...state.willpowerDamage, superficial: state.willpowerDamage.superficial + 1 }, willpowerCurrent: state.willpowerCurrent - 1 }
    return { ok: true, rollSnapshot: structuredClone(roll) }
  })
  return projectCommandRoll(actorId, characterId, command)
}

async function projectCommandRoll(actorId: string, characterId: string, command: Record<string, unknown>, forcePlayer = false) {
  const character = await getCommandCharacter(characterId)
  if (!character || character.ownerId !== actorId && character.masterId !== actorId) throw new CharacterCommandError(403, 'Acesso negado.')
  const roll = command.rollSnapshot as StoredRoll
  if (roll.campaignId !== character.campaignId) throw new CharacterCommandError(409, 'O contexto da rolagem mudou.')
  if (roll.visibility === 'SECRET' && character.masterId !== actorId) throw new CharacterCommandError(404, 'Rolagem não encontrada.')
  return { ok: true, revision: command.revision, ...projectRoll(roll, !forcePlayer && character.masterId === actorId) }
}

function findRoll(character: CommandCharacter, actorId: string, id: string) {
  const roll = characterRollHistory(character).find(entry => entry.id === id)
  if (!roll || roll.visibility === 'SECRET' && character.masterId !== actorId) throw new CharacterCommandError(404, 'Rolagem não encontrada.')
  return roll
}

export async function adjudicateCharacterRoll(actorId: string, characterId: string, rollId: string, input: RevisionInput & { kind: Adjudication['kind']; note: string; shared?: boolean; offerId?: string }) {
  if (!['COMPLICATION', 'NARRATIVE_FAILURE', 'OFFER_COST', 'ACCEPT_COST'].includes(input.kind) || typeof input.note !== 'string' || !input.note.trim() || input.note.length > 1000 || input.shared !== undefined && typeof input.shared !== 'boolean') throw new CharacterCommandError(400, 'Decisão narrativa inválida.')
  const command = await runCharacterCommand(actorId, characterId, { key: input.idempotencyKey, expectedRevision: input.expectedRevision, type: 'ROLL_ADJUDICATED', payload: { rollId, ...input } }, character => input.kind === 'ACCEPT_COST' ? character.ownerId === actorId : character.masterId === actorId, character => {
    const roll = findRoll(character, actorId, rollId)
    const result = roll.revisions.at(-1)!.result
    if (roll.campaignId !== character.campaignId) throw new CharacterCommandError(409, 'O vínculo da ficha mudou.')
    if (input.kind === 'OFFER_COST' && (result.success || result.successes < 1 || roll.mode !== 'TEST' || roll.adjudications.some(entry => ['OFFER_COST', 'ACCEPT_COST'].includes(entry.kind)))) throw new CharacterCommandError(422, 'Vitória a custo exige falha com ao menos um sucesso e oferta única.')
    if (input.kind === 'ACCEPT_COST' && (!roll.adjudications.some(entry => entry.id === input.offerId && entry.kind === 'OFFER_COST' && entry.shared) || roll.adjudications.some(entry => entry.kind === 'ACCEPT_COST'))) throw new CharacterCommandError(422, 'Oferta indisponível ou já aceita.')
    if (input.kind === 'NARRATIVE_FAILURE' && (!result.messyCritical || roll.adjudications.some(entry => ['NARRATIVE_FAILURE', 'ACCEPT_COST'].includes(entry.kind)))) throw new CharacterCommandError(422, 'A falha narrativa exige um crítico com Fome ainda não resolvido.')
    roll.adjudications.push({ id: randomUUID(), kind: input.kind, note: input.note.trim(), actorId, shared: ['OFFER_COST', 'ACCEPT_COST'].includes(input.kind) || input.shared === true, ...(input.offerId ? { offerId: input.offerId } : {}) })
    return { ok: true, rollSnapshot: structuredClone(roll) }
  })
  return projectCommandRoll(actorId, characterId, command, input.kind === 'ACCEPT_COST')
}
