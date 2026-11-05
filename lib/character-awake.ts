import { randomUUID } from 'node:crypto'
import { sql } from 'drizzle-orm'
import { getCommandCharacter, CharacterCommandError, runCharacterCommand } from './character-commands'
import { serverDiceProvider, type DiceProvider } from './vtm-v5/dice-provider'
import { drawD10 } from './vtm-v5/dice-roll-service'
import { applyAwakening, readSessionState } from './vtm-v5/session-state'

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export type AwakeIntent = { action: 'DECLARE_EXTERNAL' | 'START_NIGHT' | 'AWAKE'; expectedRevision: number; idempotencyKey: string; nightId?: string; inGameDate?: string; sessionId?: string }
type StartedIndependentNight = { night: { id: string; number: number; inGameDate: string | null; createdAt: string; origin: 'EXTERNAL_TABLE' }; hunger: number; condition: string; revision: number }

function validate(input: AwakeIntent) {
  if (!input || !['DECLARE_EXTERNAL', 'START_NIGHT', 'AWAKE'].includes(input.action) || !Number.isSafeInteger(input.expectedRevision) || input.expectedRevision < 0 || !uuid.test(input.idempotencyKey) || input.nightId !== undefined && !uuid.test(input.nightId) || input.sessionId !== undefined && !uuid.test(input.sessionId) || input.inGameDate !== undefined && (!/^\d{4}-\d{2}-\d{2}$/.test(input.inGameDate) || Number.isNaN(Date.parse(input.inGameDate)) || new Date(input.inGameDate).toISOString().slice(0,10) !== input.inGameDate)) throw new CharacterCommandError(400, 'Dados do despertar inválidos.')
  if (input.action === 'AWAKE' && !input.nightId || input.action !== 'AWAKE' && (input.nightId || input.sessionId)) throw new CharacterCommandError(400, 'Contexto de noite inválido.')
}

export async function getCharacterAwake(actorId: string, characterId: string) {
  if (!uuid.test(characterId)) throw new CharacterCommandError(400, 'Ficha inválida.')
  const character = await getCommandCharacter(characterId)
  if (!character) throw new CharacterCommandError(404, 'Ficha não encontrada.')
  if (character.ownerId !== actorId && character.masterId !== actorId) throw new CharacterCommandError(403, 'Acesso negado.')
  const state = readSessionState(character.data, character.gameState)
  if (!character.campaignId) return { context: character.gameState.playContext === 'EXTERNAL_TABLE' ? 'EXTERNAL_TABLE' as const : 'UNLINKED' as const, night: character.gameState.independentNight ?? null, last: character.gameState.lastAwakening ?? null, revision: character.revision, hunger: state.hunger, condition: state.condition, eligible: character.characterType === 'PLAYER_VAMPIRE' && state.condition !== 'FINAL_DEATH' }
  const rows = await (await import('./db')).db.execute<{ id: string; in_game_date: string; execution_mode: string; night_number: number }>(sql`SELECT id, in_game_date::text, execution_mode, night_number FROM chronicle_nights WHERE campaign_id = ${character.campaignId}::uuid AND status = 'ACTIVE' ORDER BY night_number DESC LIMIT 1`)
  const night = rows.rows[0] ?? null
  const completed = night ? await (await import('./db')).db.execute<{ outcome: string; roll: number | null }>(sql`SELECT outcome, roll FROM night_awakenings WHERE night_id = ${night.id}::uuid AND character_id = ${character.id}::uuid`) : null
  return { context: 'CAMPAIGN' as const, night, completed: completed?.rows[0] ?? null, revision: character.revision, hunger: state.hunger, condition: state.condition, eligible: character.characterType === 'PLAYER_VAMPIRE' && character.status === 'APPROVED' && state.condition !== 'FINAL_DEATH' }
}

export function executeCharacterAwake(actorId: string, characterId: string, input: AwakeIntent & { action: 'START_NIGHT' }, dice?: DiceProvider): Promise<StartedIndependentNight>
export function executeCharacterAwake(actorId: string, characterId: string, input: AwakeIntent, dice?: DiceProvider): Promise<Record<string, unknown>>
export async function executeCharacterAwake(actorId: string, characterId: string, input: AwakeIntent, dice: DiceProvider = serverDiceProvider): Promise<Record<string, unknown>> {
  validate(input)
  return runCharacterCommand(actorId, characterId, { type: input.action === 'START_NIGHT' ? 'INDEPENDENT_NIGHT_STARTED' : input.action === 'DECLARE_EXTERNAL' ? 'EXTERNAL_TABLE_DECLARED' : 'CHARACTER_AWAKENED', key: input.idempotencyKey, expectedRevision: input.expectedRevision, payload: input }, character => character.ownerId === actorId, async (character, transaction) => {
    if (character.characterType !== 'PLAYER_VAMPIRE' || ['ARCHIVED','DISABLED','DELETED'].includes(character.status)) throw new CharacterCommandError(422, 'Despertar disponível apenas para vampiros jogáveis.')
    const before = readSessionState(character.data, character.gameState)
    if (before.condition === 'FINAL_DEATH') throw new CharacterCommandError(422, 'Personagem morto definitivamente.')
    if (input.action === 'DECLARE_EXTERNAL') {
      if (character.campaignId) throw new CharacterCommandError(403,'A ficha já está vinculada a uma mesa do aplicativo.')
      character.gameState.playContext = 'EXTERNAL_TABLE'
      return { playContext:'EXTERNAL_TABLE', hunger:before.hunger, condition:before.condition }
    }
    if (input.action === 'START_NIGHT') {
      if (character.campaignId) throw new CharacterCommandError(403, 'Noites de mesa cadastrada são iniciadas pelo Narrador.')
      if (character.gameState.playContext !== 'EXTERNAL_TABLE') throw new CharacterCommandError(409,'Indique primeiro que esta ficha pertence a uma mesa fora do aplicativo.')
      const last = character.gameState.independentNight as { number?: number } | undefined
      const night = { id: randomUUID(), number: Number(last?.number ?? 0) + 1, inGameDate: input.inGameDate ?? null, createdAt: new Date().toISOString(), origin: 'EXTERNAL_TABLE' }
      character.gameState.independentNight = night
      character.gameState.playContext = 'EXTERNAL_TABLE'
      return { night, hunger: before.hunger, condition: before.condition }
    }
    let nightId = input.nightId!
    if (!character.campaignId) {
      if (input.sessionId) throw new CharacterCommandError(400, 'Fichas de mesa externa não possuem sessão do aplicativo.')
      const night = character.gameState.independentNight as { id?: string } | undefined
      if (night?.id !== nightId) throw new CharacterCommandError(409, 'Inicie uma noite válida para esta ficha.')
      if ((character.gameState.lastAwakening as { nightId?: string } | undefined)?.nightId === nightId) throw new CharacterCommandError(409, 'Este personagem já despertou nesta noite.')
    } else {
      const rows = await transaction.execute<{ execution_mode: string }>(sql`SELECT execution_mode FROM chronicle_nights WHERE id = ${nightId}::uuid AND campaign_id = ${character.campaignId}::uuid AND status = 'ACTIVE' AND night_number = (SELECT MAX(night_number) FROM chronicle_nights WHERE campaign_id = ${character.campaignId}::uuid AND status = 'ACTIVE') FOR SHARE`)
      if (rows.rows[0]?.execution_mode !== 'PLAYER_ROLLS') throw new CharacterCommandError(403, 'O Narrador executa o despertar nesta noite, ou a noite não está preparada.')
      if (!input.sessionId) throw new CharacterCommandError(403, 'Abra a sessão ativa da mesa para despertar.')
      const sessions = await transaction.execute<{ id: string }>(sql`SELECT s.id FROM game_sessions s WHERE s.id = ${input.sessionId}::uuid AND s.campaign_id = ${character.campaignId}::uuid AND s.status = 'ACTIVE'`)
      if (!sessions.rows.length || character.status !== 'APPROVED') throw new CharacterCommandError(403, 'Sessão ou ficha não autorizada.')
      const seen = await transaction.execute<{ id: string }>(sql`SELECT id FROM night_awakenings WHERE night_id = ${nightId}::uuid AND character_id = ${character.id}::uuid`)
      if (seen.rows.length) throw new CharacterCommandError(409, 'O personagem já despertou nesta noite.')
    }
    const roll = before.condition === 'TORPOR' ? null : drawD10(dice, 1)[0]
    const resolved = roll === null ? { state: before, outcome: 'SKIPPED' as const } : applyAwakening(before, roll, nightId)
    const record = { nightId, roll, outcome: resolved.outcome, before, after: resolved.state, actorId, at: new Date().toISOString() }
    if (character.campaignId) {
      await transaction.execute(sql`INSERT INTO night_awakenings (night_id,character_id,status,roll,before_state,after_state,outcome,processed_at) VALUES (${nightId}::uuid,${character.id}::uuid,${roll === null ? 'SKIPPED' : 'COMPLETED'},${roll},${JSON.stringify(before)}::jsonb,${JSON.stringify(resolved.state)}::jsonb,${resolved.outcome},NOW())`)
    }
    character.gameState = { ...character.gameState, ...resolved.state, lastAwakening: record }
    character.data = { ...character.data, fome: resolved.state.hunger, humanidade: resolved.state.humanity, vitalidade: resolved.state.healthCurrent, vontade: resolved.state.willpowerCurrent }
    return { ...record, revision: character.revision + 1 }
  })
}
