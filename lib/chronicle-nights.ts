import { createHash, randomUUID } from 'node:crypto'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { devGetCampaignsForMaster, type DevCharacter } from '@/lib/dev-db'
import { CharacterCommandError } from '@/lib/character-commands'
import { serverDiceProvider, type DiceProvider } from '@/lib/vtm-v5/dice-provider'
import { applyAwakening, readSessionState, type SessionState } from '@/lib/vtm-v5/session-state'

export type NightRequest = { inGameDate: string; characterIds: string[]; idempotencyKey: string; confirmed: true }
export type AwakeningResult = { characterId: string; name: string; roll: number | null; outcome: 'SKIPPED' | 'AWAKENED' | 'AWAKENED_HUNGRIER' | 'TORPOR'; before: SessionState; after: SessionState }
export type NightResult = { id: string; campaignId: string; nightNumber: number; inGameDate: string; status: 'ACTIVE'; results: AwakeningResult[] }
type NightCharacter = { id: string; name: string; campaignId: string | null; characterType: string; status: string; data: Record<string, unknown>; gameState: Record<string, unknown>; revision: number }
type SavedNight = { actorId: string; hash: string; key: string; result: NightResult }
type NightMemory = { store: typeof global.__devDb; nights: SavedNight[]; locks: Map<string, Promise<void>> }
declare global { var __chronicleNightMemory: NightMemory | undefined }

const isMemory = () => process.env.NODE_ENV !== 'production' && !process.env.DATABASE_URL
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function validateNightRequest(value: unknown): value is NightRequest {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const body = value as Record<string, unknown>
  if (typeof body.inGameDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.inGameDate)) return false
  const parsed = new Date(`${body.inGameDate}T00:00:00.000Z`)
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== body.inGameDate || Number(body.inGameDate.slice(0, 4)) < 1) return false
  return body.confirmed === true && typeof body.idempotencyKey === 'string' && uuid.test(body.idempotencyKey) && Array.isArray(body.characterIds) && body.characterIds.length > 0 && body.characterIds.length <= 100 && body.characterIds.every(id => typeof id === 'string' && uuid.test(id)) && new Set(body.characterIds.map(id => id.toLowerCase())).size === body.characterIds.length && Object.keys(body).every(key => ['inGameDate', 'characterIds', 'idempotencyKey', 'confirmed'].includes(key))
}

function memory(actorId: string) {
  devGetCampaignsForMaster(actorId)
  if (global.__chronicleNightMemory?.store !== global.__devDb) global.__chronicleNightMemory = { store: global.__devDb, nights: [], locks: new Map() }
  return global.__chronicleNightMemory!
}

async function campaignLock<Result>(store: NightMemory, campaignId: string, action: () => Result): Promise<Result> {
  const previous = store.locks.get(campaignId) ?? Promise.resolve()
  let release!: () => void
  const current = new Promise<void>(resolve => { release = resolve })
  store.locks.set(campaignId, current)
  await previous
  try { return action() } finally { release(); if (store.locks.get(campaignId) === current) store.locks.delete(campaignId) }
}

function hashRequest(input: NightRequest) {
  return createHash('sha256').update(JSON.stringify({ inGameDate: input.inGameDate, characterIds: [...input.characterIds].sort(), confirmed: true })).digest('hex')
}

function validateSelection(characters: NightCharacter[], ids: string[], campaignId: string) {
  if (characters.length !== ids.length || characters.some(character => character.campaignId !== campaignId)) throw new CharacterCommandError(403, 'A seleção contém fichas sem autorização nesta mesa.')
  if (characters.some(character => character.characterType !== 'PLAYER_VAMPIRE' || character.status !== 'APPROVED')) throw new CharacterCommandError(400, 'Selecione somente vampiros com fichas aprovadas.')
  if (characters.some(character => readSessionState(character.data, character.gameState).condition === 'FINAL_DEATH')) throw new CharacterCommandError(400, 'Personagens mortos definitivamente não podem despertar.')
  for (const character of characters) {
    const state = readSessionState(character.data, character.gameState)
    if (!Number.isInteger(state.hunger) || state.hunger < 0 || state.hunger > 5 || !Number.isInteger(state.humanity) || state.humanity < 0 || state.humanity > 10 || !['ACTIVE', 'DAY_SLEEP', 'STAKED', 'TORPOR'].includes(state.condition)) throw new CharacterCommandError(400, 'A seleção contém uma ficha com recursos ou condição inválidos.')
  }
}

function resolveNight(characters: NightCharacter[], campaignId: string, nightNumber: number, input: NightRequest, dice: DiceProvider): NightResult {
  const id = randomUUID()
  const results = characters.map(character => {
    const before = readSessionState(character.data, character.gameState)
    if (before.condition === 'TORPOR') return { characterId: character.id, name: character.name, roll: null, outcome: 'SKIPPED' as const, before, after: structuredClone(before) }
    const rolls = dice.rollD10(1)
    if (rolls.length !== 1 || !Number.isInteger(rolls[0]) || rolls[0] < 1 || rolls[0] > 10) throw new CharacterCommandError(500, 'O provedor de dados retornou um resultado inválido.')
    const resolved = applyAwakening(before, rolls[0], id)
    return { characterId: character.id, name: character.name, roll: rolls[0], outcome: resolved.outcome, before, after: resolved.state }
  })
  return { id, campaignId, nightNumber, inGameDate: input.inGameDate, status: 'ACTIVE', results }
}

function updateData(character: NightCharacter, result: AwakeningResult) {
  return { ...character.data, fome: result.after.hunger, humanidade: result.after.humanity, vitalidade: result.after.healthCurrent, vontade: result.after.willpowerCurrent }
}

function fromMemory(character: DevCharacter): NightCharacter {
  return { id: character.id, name: character.name, campaignId: character.campaignId, characterType: character.characterType ?? 'PLAYER_VAMPIRE', status: character.status, data: structuredClone(character.data), gameState: structuredClone(character.gameState ?? {}), revision: character.revision ?? 0 }
}

export async function startChronicleNight(actorId: string, campaignId: string, input: NightRequest, dice: DiceProvider = serverDiceProvider): Promise<NightResult> {
  if (!uuid.test(campaignId) || !validateNightRequest(input)) throw new CharacterCommandError(400, 'Dados de início de noite inválidos.')
  input = { ...input, characterIds: input.characterIds.map(id => id.toLowerCase()).sort(), idempotencyKey: input.idempotencyKey.toLowerCase() }
  campaignId = campaignId.toLowerCase()
  const hash = hashRequest(input)
  if (isMemory()) {
    const store = memory(actorId)
    return campaignLock(store, campaignId, () => {
      const campaign = global.__devDb!.campaigns.find(entry => entry.id === campaignId)
      if (campaign?.masterUserId !== actorId) throw new CharacterCommandError(403, 'Somente o Narrador desta mesa pode iniciar a noite.')
      const previous = store.nights.find(night => night.result.campaignId === campaignId && night.key === input.idempotencyKey)
      if (previous) {
        if (previous.actorId !== actorId || previous.hash !== hash) throw new CharacterCommandError(409, 'A chave já foi usada para outro início de noite.')
        return structuredClone(previous.result)
      }
      const campaignNights = store.nights.filter(night => night.result.campaignId === campaignId)
      const originals = input.characterIds.map(id => global.__devDb!.characters.find(character => character.id === id)).filter((character): character is DevCharacter => !!character)
      const characters = originals.map(fromMemory)
      validateSelection(characters, input.characterIds, campaignId)
      const result = resolveNight(characters, campaignId, campaignNights.length + 1, input, dice)
      const ledger = result.results.map(entry => ({ id: randomUUID(), characterId: entry.characterId, eventType: 'NIGHT_AWAKENING', origin: 'CHRONICLE_NIGHT', payload: { nightId: result.id, commandKey: input.idempotencyKey, before: structuredClone(entry.before), after: structuredClone(entry.after), roll: entry.roll, outcome: entry.outcome }, createdByUserId: actorId, createdAt: new Date() }))
      const saved = { actorId, hash, key: input.idempotencyKey, result: structuredClone(result) }
      const updates = originals.map((original, index) => ({ original, data: updateData(characters[index], result.results[index]), gameState: { ...characters[index].gameState, ...structuredClone(result.results[index].after) }, revision: characters[index].revision + 1, updatedAt: new Date() }))
      store.nights.push(saved)
      for (const update of updates) {
        update.original.data = update.data
        update.original.gameState = update.gameState
        update.original.revision = update.revision
        update.original.updatedAt = update.updatedAt
      }
      global.__devDb!.characterLedgerEvents.push(...ledger)
      return structuredClone(result)
    })
  }
  return db.transaction(async transaction => {
    const campaignRows = await transaction.execute<{ master_user_id: string }>(sql`SELECT master_user_id FROM campaigns WHERE id = ${campaignId}::uuid FOR UPDATE`)
    if (campaignRows.rows[0]?.master_user_id !== actorId) throw new CharacterCommandError(403, 'Somente o Narrador desta mesa pode iniciar a noite.')
    const previous = await transaction.execute<{ started_by_user_id: string; request_hash: string; result: NightResult }>(sql`SELECT started_by_user_id, request_hash, result FROM chronicle_nights WHERE campaign_id = ${campaignId}::uuid AND idempotency_key = ${input.idempotencyKey}`)
    if (previous.rows[0]) {
      if (previous.rows[0].started_by_user_id !== actorId || previous.rows[0].request_hash !== hash) throw new CharacterCommandError(409, 'A chave já foi usada para outro início de noite.')
      if (!previous.rows[0].result) throw new CharacterCommandError(409, 'O início de noite está em processamento.')
      return previous.rows[0].result
    }
    const processing = await transaction.execute<{ id: string }>(sql`SELECT id FROM chronicle_nights WHERE campaign_id = ${campaignId}::uuid AND status = 'PROCESSING'`)
    if (processing.rows.length) throw new CharacterCommandError(409, 'Já existe um início de noite em processamento.')
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
  if (!uuid.test(campaignId)) throw new CharacterCommandError(400, 'Mesa inválida.')
  let characters: NightCharacter[]
  let nights: NightResult[]
  const lastProcessed = new Map<string, number>()
  if (isMemory()) {
    const store = memory(actorId)
    if (!global.__devDb!.campaigns.some(campaign => campaign.id === campaignId && campaign.masterUserId === actorId)) throw new CharacterCommandError(403, 'Somente o Narrador pode consultar os despertares.')
    characters = global.__devDb!.characters.filter(character => character.campaignId === campaignId).map(fromMemory)
    for (const night of store.nights.filter(night => night.result.campaignId === campaignId)) {
      for (const result of night.result.results) lastProcessed.set(result.characterId, night.result.nightNumber)
    }
    nights = store.nights.filter(night => night.result.campaignId === campaignId).slice(-10).reverse().map(night => structuredClone(night.result))
  } else {
    const campaign = await db.execute<{ master_user_id: string }>(sql`SELECT master_user_id FROM campaigns WHERE id = ${campaignId}::uuid`)
    if (campaign.rows[0]?.master_user_id !== actorId) throw new CharacterCommandError(403, 'Somente o Narrador pode consultar os despertares.')
    const rows = await db.execute<{ id: string; name: string; campaign_id: string; character_type: string; status: string; data: Record<string, unknown>; game_state: Record<string, unknown>; revision: number }>(sql`SELECT id, name, campaign_id, character_type, status, data, game_state, revision FROM characters WHERE campaign_id = ${campaignId}::uuid ORDER BY name`)
    characters = rows.rows.map(row => ({ id: row.id, name: row.name, campaignId: row.campaign_id, characterType: row.character_type, status: row.status, data: row.data ?? {}, gameState: row.game_state ?? {}, revision: row.revision }))
    const history = await db.execute<{ result: NightResult }>(sql`SELECT result FROM chronicle_nights WHERE campaign_id = ${campaignId}::uuid AND status = 'ACTIVE' ORDER BY night_number DESC LIMIT 10`)
    nights = history.rows.map(row => row.result)
    const latest = await db.execute<{ character_id: string; night_number: number }>(sql`SELECT a.character_id, MAX(n.night_number) AS night_number FROM night_awakenings a JOIN chronicle_nights n ON n.id = a.night_id WHERE n.campaign_id = ${campaignId}::uuid AND n.status = 'ACTIVE' GROUP BY a.character_id`)
    for (const row of latest.rows) lastProcessed.set(row.character_id, Number(row.night_number))
  }
  return { characters: characters.map(character => { const state = readSessionState(character.data, character.gameState); return { id: character.id, name: character.name, hunger: state.hunger, condition: state.condition, status: character.status, lastProcessedNight: lastProcessed.get(character.id) ?? null, eligible: character.characterType === 'PLAYER_VAMPIRE' && character.status === 'APPROVED' && state.condition !== 'FINAL_DEATH' } }), nights }
}
