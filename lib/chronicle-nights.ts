import { createHash, randomUUID } from 'node:crypto'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { CharacterCommandError } from '@/lib/character-commands'
import { serverDiceProvider, type DiceProvider } from '@/lib/vtm-v5/dice-provider'
import { drawD10 } from '@/lib/vtm-v5/dice-roll-service'
import { applyAwakening, readSessionState, type SessionState } from '@/lib/vtm-v5/session-state'

export type NightRequest = { inGameDate: string; characterIds: string[]; idempotencyKey: string; confirmed: true }
export type AwakeningResult = { characterId: string; name: string; roll: number | null; outcome: 'SKIPPED' | 'AWAKENED' | 'AWAKENED_HUNGRIER' | 'TORPOR'; before: SessionState; after: SessionState }
export type NightResult = { id: string; campaignId: string; nightNumber: number; inGameDate: string; status: 'ACTIVE'; results: AwakeningResult[] }
type NightCharacter = { id: string; name: string; campaignId: string | null; characterType: string; status: string; data: Record<string, unknown>; gameState: Record<string, unknown>; revision: number }
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function validateNightRequest(value: unknown): value is NightRequest {
  if (!value || typeof value !== 'object' || Array.isArray(value)) { return false }
  const body = value as Record<string, unknown>
  if (typeof body.inGameDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.inGameDate)) { return false }
  const parsed = new Date(`${body.inGameDate}T00:00:00.000Z`)
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== body.inGameDate || Number(body.inGameDate.slice(0, 4)) < 1) { return false }
  return body.confirmed === true && typeof body.idempotencyKey === 'string' && uuid.test(body.idempotencyKey) && Array.isArray(body.characterIds) && body.characterIds.length > 0 && body.characterIds.length <= 100 && body.characterIds.every(id => typeof id === 'string' && uuid.test(id)) && new Set(body.characterIds.map(id => id.toLowerCase())).size === body.characterIds.length && Object.keys(body).every(key => ['inGameDate', 'characterIds', 'idempotencyKey', 'confirmed'].includes(key))
}

function hashRequest(input: NightRequest) {
  return createHash('sha256').update(JSON.stringify({ inGameDate: input.inGameDate, characterIds: [...input.characterIds].sort((first, second) => first.localeCompare(second)), confirmed: true })).digest('hex')
}

function validateSelection(characters: NightCharacter[], ids: string[], campaignId: string) {
  if (characters.length !== ids.length || characters.some(character => character.campaignId !== campaignId)) { throw new CharacterCommandError(403, 'A seleção contém fichas sem autorização nesta mesa.') }
  if (characters.some(character => character.characterType !== 'PLAYER_VAMPIRE' || character.status !== 'APPROVED')) { throw new CharacterCommandError(400, 'Selecione somente vampiros com fichas aprovadas.') }
  if (characters.some(character => readSessionState(character.data, character.gameState).condition === 'FINAL_DEATH')) { throw new CharacterCommandError(400, 'Personagens mortos definitivamente não podem despertar.') }
  for (const character of characters) {
    const state = readSessionState(character.data, character.gameState)
    if (!Number.isInteger(state.hunger) || state.hunger < 0 || state.hunger > 5 || !Number.isInteger(state.humanity) || state.humanity < 0 || state.humanity > 10 || !['ACTIVE', 'DAY_SLEEP', 'STAKED', 'TORPOR'].includes(state.condition)) { throw new CharacterCommandError(400, 'A seleção contém uma ficha com recursos ou condição inválidos.') }
  }
}

function resolveNight(characters: NightCharacter[], campaignId: string, nightNumber: number, input: NightRequest, dice: DiceProvider): NightResult {
  const id = randomUUID()
  const results = characters.map(character => {
    const before = readSessionState(character.data, character.gameState)
    if (before.condition === 'TORPOR') { return { characterId: character.id, name: character.name, roll: null, outcome: 'SKIPPED' as const, before, after: structuredClone(before) } }
    const [roll] = drawD10(dice, 1)
    const resolved = applyAwakening(before, roll, id)
    return { characterId: character.id, name: character.name, roll, outcome: resolved.outcome, before, after: resolved.state }
  })
  return { id, campaignId, nightNumber, inGameDate: input.inGameDate, status: 'ACTIVE', results }
}

function updateData(character: NightCharacter, result: AwakeningResult) {
  return { ...character.data, fome: result.after.hunger, humanidade: result.after.humanity, vitalidade: result.after.healthCurrent, vontade: result.after.willpowerCurrent }
}

export async function startChronicleNight(actorId: string, campaignId: string, input: NightRequest, dice: DiceProvider = serverDiceProvider): Promise<NightResult> {
  if (!uuid.test(campaignId) || !validateNightRequest(input)) { throw new CharacterCommandError(400, 'Dados de início de noite inválidos.') }
  input = { ...input, characterIds: input.characterIds.map(id => id.toLowerCase()).sort((first, second) => first.localeCompare(second)), idempotencyKey: input.idempotencyKey.toLowerCase() }
  campaignId = campaignId.toLowerCase()
  const hash = hashRequest(input)
  return await db.transaction(async transaction => {
    const campaignRows = await transaction.execute<{ master_user_id: string }>(sql`SELECT master_user_id FROM campaigns WHERE id = ${campaignId}::uuid FOR UPDATE`)
    if (campaignRows.rows[0]?.master_user_id !== actorId) { throw new CharacterCommandError(403, 'Somente o Narrador desta mesa pode iniciar a noite.') }
    const previous = await transaction.execute<{ started_by_user_id: string; request_hash: string; result: NightResult }>(sql`SELECT started_by_user_id, request_hash, result FROM chronicle_nights WHERE campaign_id = ${campaignId}::uuid AND idempotency_key = ${input.idempotencyKey}`)
    if (previous.rows[0]) {
      if (previous.rows[0].started_by_user_id !== actorId || previous.rows[0].request_hash !== hash) { throw new CharacterCommandError(409, 'A chave já foi usada para outro início de noite.') }
      if (!previous.rows[0].result) { throw new CharacterCommandError(409, 'O início de noite está em processamento.') }
      return previous.rows[0].result
    }
    const processing = await transaction.execute<{ id: string }>(sql`SELECT id FROM chronicle_nights WHERE campaign_id = ${campaignId}::uuid AND status = 'PROCESSING'`)
    if (processing.rows.length) { throw new CharacterCommandError(409, 'Já existe um início de noite em processamento.') }
    const selection = sql.join(input.characterIds.map(id => sql`${id}::uuid`), sql`, `)
    const rows = await transaction.execute<{ id: string; name: string; campaign_id: string | null; character_type: string; status: string; data: Record<string, unknown>; game_state: Record<string, unknown>; revision: number }>(sql`SELECT id, name, campaign_id, character_type, status, data, game_state, revision FROM characters WHERE id IN (${selection}) ORDER BY id FOR UPDATE`)
    const characters: NightCharacter[] = rows.rows.map(row => ({ id: row.id, name: row.name, campaignId: row.campaign_id, characterType: row.character_type, status: row.status, data: row.data ?? {}, gameState: row.game_state ?? {}, revision: row.revision }))
    validateSelection(characters, input.characterIds, campaignId)
    const sequence = await transaction.execute<{ number: number }>(sql`SELECT COALESCE(MAX(night_number), 0) + 1 AS number FROM chronicle_nights WHERE campaign_id = ${campaignId}::uuid`)
    const result = resolveNight(characters, campaignId, Number(sequence.rows[0].number), input, dice)
    await transaction.execute(sql`INSERT INTO chronicle_nights (id, campaign_id, night_number, in_game_date, status, started_by_user_id, idempotency_key, request_hash, ruleset_version) VALUES (${result.id}::uuid, ${campaignId}::uuid, ${result.nightNumber}, ${input.inGameDate}::date, 'PROCESSING', ${actorId}, ${input.idempotencyKey}, ${hash}, 'V5-AWAKE-1')`)
    for (const entry of result.results) {
      const character = characters.find(current => current.id === entry.characterId)!
      await transaction.execute(sql`INSERT INTO night_awakenings (night_id, character_id, status, roll, before_state, after_state, outcome, processed_at) VALUES (${result.id}::uuid, ${entry.characterId}::uuid, ${entry.outcome === 'SKIPPED' ? 'SKIPPED' : 'COMPLETED'}, ${entry.roll}, ${JSON.stringify(entry.before)}::jsonb, ${JSON.stringify(entry.after)}::jsonb, ${entry.outcome}, NOW())`)
      await transaction.execute(sql`UPDATE characters SET data = ${JSON.stringify(updateData(character, entry))}::jsonb, game_state = ${JSON.stringify({ ...character.gameState, ...entry.after })}::jsonb, revision = revision + 1, updated_at = NOW() WHERE id = ${entry.characterId}::uuid`)
      await transaction.execute(sql`INSERT INTO character_ledger_events (character_id, event_type, origin, payload, created_by_user_id) VALUES (${entry.characterId}::uuid, 'NIGHT_AWAKENING', 'CHRONICLE_NIGHT', ${JSON.stringify({ nightId: result.id, commandKey: input.idempotencyKey, before: entry.before, after: entry.after, roll: entry.roll, outcome: entry.outcome })}::jsonb, ${actorId})`)
    }
    await transaction.execute(sql`UPDATE chronicle_nights SET status = 'ACTIVE', completed_at = NOW(), result = ${JSON.stringify(result)}::jsonb WHERE id = ${result.id}::uuid`)
    return result
  })
}

export async function getChronicleAwakePanel(actorId: string, campaignId: string) {
  if (!uuid.test(campaignId)) { throw new CharacterCommandError(400, 'Mesa inválida.') }
  const lastProcessed = new Map<string, number>()
    const campaign = await db.execute<{ master_user_id: string }>(sql`SELECT master_user_id FROM campaigns WHERE id = ${campaignId}::uuid`)
    if (campaign.rows[0]?.master_user_id !== actorId) { throw new CharacterCommandError(403, 'Somente o Narrador pode consultar os despertares.') }
    const rows = await db.execute<{ id: string; name: string; campaign_id: string; character_type: string; status: string; data: Record<string, unknown>; game_state: Record<string, unknown>; revision: number }>(sql`SELECT id, name, campaign_id, character_type, status, data, game_state, revision FROM characters WHERE campaign_id = ${campaignId}::uuid ORDER BY name`)
    const characters = rows.rows.map(row => ({ id: row.id, name: row.name, campaignId: row.campaign_id, characterType: row.character_type, status: row.status, data: row.data ?? {}, gameState: row.game_state ?? {}, revision: row.revision }))
    const history = await db.execute<{ result: NightResult }>(sql`SELECT result FROM chronicle_nights WHERE campaign_id = ${campaignId}::uuid AND status = 'ACTIVE' ORDER BY night_number DESC LIMIT 10`)
    const nights = history.rows.map(row => row.result)
    const latest = await db.execute<{ character_id: string; night_number: number }>(sql`SELECT a.character_id, MAX(n.night_number) AS night_number FROM night_awakenings a JOIN chronicle_nights n ON n.id = a.night_id WHERE n.campaign_id = ${campaignId}::uuid AND n.status = 'ACTIVE' GROUP BY a.character_id`)
    for (const row of latest.rows) lastProcessed.set(row.character_id, Number(row.night_number))
  return { characters: characters.map(character => { const state = readSessionState(character.data, character.gameState); return { id: character.id, name: character.name, hunger: state.hunger, condition: state.condition, status: character.status, lastProcessedNight: lastProcessed.get(character.id) ?? null, eligible: character.characterType === 'PLAYER_VAMPIRE' && character.status === 'APPROVED' && state.condition !== 'FINAL_DEATH' } }), nights }
}
