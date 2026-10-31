import { sql } from 'drizzle-orm'
import { CharacterCommandError } from '@/lib/character-commands'
import { db } from '@/lib/db'

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type SessionRecord = {
  id: string
  campaignId: string
  startedBy: string
  status: 'ACTIVE' | 'CLOSED'
  startedAt: string | Date
  endedAt: string | Date | null
  revision: number
  chronicleNightIds: string[]
}

function requireStorage() {
  if (!process.env.DATABASE_URL || !db) {
    throw new CharacterCommandError(503, 'O modo sessão requer PostgreSQL configurado.')
  }
}

async function getAccess(campaignId: string, actorId: string) {
  const result = await db.execute<{ is_master: boolean; is_member: boolean; archived: boolean }>(sql`
    SELECT c.status='Arquivada' AS archived,c.master_user_id = ${actorId} AS is_master,
      (c.master_user_id = ${actorId} OR EXISTS (SELECT 1 FROM characters ch WHERE ch.campaign_id = c.id AND ch.user_id = ${actorId} AND ch.status<>'DELETED')) AS is_member
    FROM campaigns c WHERE c.id = ${campaignId}::uuid
  `)
  const row = result.rows[0]
  return row ? { isMaster: row.is_master, isMember: row.is_member, archived: row.archived } : null
}

async function getCharacters(campaignId: string, actorId: string, isMaster: boolean) {
  const result = await db.execute<{ id: string; name: string }>(sql`
    SELECT id, name FROM characters
    WHERE campaign_id = ${campaignId}::uuid AND character_type = 'PLAYER_VAMPIRE' AND status = 'APPROVED'
      AND (${isMaster} OR user_id = ${actorId})
    ORDER BY name
  `)
  return result.rows
}

function sessionProjection(session: SessionRecord) {
  return {
    id: session.id,
    campaignId: session.campaignId,
    status: session.status,
    startedAt: session.startedAt instanceof Date ? session.startedAt.toISOString() : session.startedAt,
    endedAt: session.endedAt instanceof Date ? session.endedAt.toISOString() : session.endedAt,
    revision: session.revision,
    chronicleNightIds: session.chronicleNightIds,
  }
}

const sessionColumns = sql`id, campaign_id AS "campaignId", started_by_user_id AS "startedBy", status, started_at AS "startedAt", ended_at AS "endedAt", revision`

async function readSession(id: string) {
  const result = await db.execute<SessionRecord>(sql`
    SELECT ${sessionColumns}, COALESCE(array_agg(n.chronicle_night_id ORDER BY n.chronicle_night_id) FILTER (WHERE n.chronicle_night_id IS NOT NULL), ARRAY[]::uuid[]) AS "chronicleNightIds"
    FROM game_sessions s LEFT JOIN game_session_nights n ON n.session_id = s.id
    WHERE s.id = ${id}::uuid GROUP BY s.id
  `)
  return result.rows[0] ?? null
}

async function readActiveSession(campaignId: string) {
  const result = await db.execute<SessionRecord>(sql`
    SELECT ${sessionColumns}, COALESCE(array_agg(n.chronicle_night_id ORDER BY n.chronicle_night_id) FILTER (WHERE n.chronicle_night_id IS NOT NULL), ARRAY[]::uuid[]) AS "chronicleNightIds"
    FROM game_sessions s LEFT JOIN game_session_nights n ON n.session_id = s.id
    WHERE s.campaign_id = ${campaignId}::uuid AND s.status = 'ACTIVE' GROUP BY s.id
  `)
  return result.rows[0] ?? null
}

function requireUuid(value: string) {
  if (!uuid.test(value)) { throw new CharacterCommandError(400, 'Identificador inválido.') }
  return value
}

function requireKey(value: unknown) {
  if (typeof value !== 'string' || !uuid.test(value)) { throw new CharacterCommandError(400, 'Chave de operação inválida.') }
  return value
}

function validateChronicleNights(value: unknown) {
  if (value === undefined) { return [] }
  if (!Array.isArray(value) || value.length > 50 || value.some(id => typeof id !== 'string' || !uuid.test(id)) || new Set(value.map(id => id.toLowerCase())).size !== value.length) {
    throw new CharacterCommandError(400, 'Vínculos de noite inválidos.')
  }
  return value.map(id => id.toLowerCase()).sort((first, second) => first.localeCompare(second))
}

async function startPersistentSession(campaignId: string, actorId: string, key: string, chronicleNightIds: string[]) {
  return await db.transaction(async transaction => {
    const campaign = await transaction.execute<{ master_user_id: string; status: string }>(sql`SELECT master_user_id,status FROM campaigns WHERE id = ${campaignId}::uuid FOR SHARE`)
    if (campaign.rows[0]?.master_user_id !== actorId) { throw new CharacterCommandError(403, 'Somente o Narrador atual pode iniciar a sessão.') }
    if (campaign.rows[0]?.status === 'Arquivada') { throw new CharacterCommandError(409, 'Restaure a mesa antes de iniciar uma sessão.') }
    const prior = await transaction.execute<SessionRecord>(sql`
      SELECT ${sessionColumns}, COALESCE(array_agg(n.chronicle_night_id ORDER BY n.chronicle_night_id) FILTER (WHERE n.chronicle_night_id IS NOT NULL), ARRAY[]::uuid[]) AS "chronicleNightIds"
      FROM game_sessions s LEFT JOIN game_session_nights n ON n.session_id = s.id
      WHERE s.campaign_id = ${campaignId}::uuid AND s.started_by_user_id = ${actorId} AND s.start_idempotency_key = ${key}::uuid
      GROUP BY s.id
    `)
    if (prior.rows[0]) {
      if (JSON.stringify([...prior.rows[0].chronicleNightIds].sort((first, second) => first.localeCompare(second))) !== JSON.stringify(chronicleNightIds)) { return null }
      return prior.rows[0]
    }

    if (chronicleNightIds.length) {
      const selection = sql.join(chronicleNightIds.map(id => sql`${id}::uuid`), sql`, `)
      const nights = await transaction.execute<{ id: string }>(sql`SELECT id FROM chronicle_nights WHERE campaign_id = ${campaignId}::uuid AND id IN (${selection}) FOR SHARE`)
      if (nights.rows.length !== chronicleNightIds.length) { throw new CharacterCommandError(403, 'Uma das noites não pertence a esta mesa.') }
    }

    const inserted = await transaction.execute<{ id: string }>(sql`
      INSERT INTO game_sessions (campaign_id, started_by_user_id, start_idempotency_key, status)
      VALUES (${campaignId}::uuid, ${actorId}, ${key}::uuid, 'ACTIVE')
      ON CONFLICT DO NOTHING RETURNING id
    `)
    if (!inserted.rows[0]) {
      const active = await transaction.execute<{ id: string; started_by_user_id: string; start_idempotency_key: string }>(sql`SELECT id, started_by_user_id, start_idempotency_key FROM game_sessions WHERE campaign_id = ${campaignId}::uuid AND status = 'ACTIVE' FOR SHARE`)
      const row = active.rows[0]
      if (row?.started_by_user_id !== actorId || row.start_idempotency_key !== key) { return null }
      const linked = await transaction.execute<{ chronicle_night_id: string }>(sql`SELECT chronicle_night_id FROM game_session_nights WHERE session_id = ${row.id}::uuid`)
      if (JSON.stringify(linked.rows.map(entry => entry.chronicle_night_id).sort((first, second) => first.localeCompare(second))) !== JSON.stringify(chronicleNightIds)) { return null }
      return readSessionInTransaction(transaction, row.id)
    }

    if (chronicleNightIds.length) {
      const values = sql.join(chronicleNightIds.map(id => sql`(${inserted.rows[0].id}::uuid, ${id}::uuid)`), sql`, `)
      await transaction.execute(sql`INSERT INTO game_session_nights (session_id, chronicle_night_id) VALUES ${values}`)
    }
    return readSessionInTransaction(transaction, inserted.rows[0].id)
  })
}

async function readSessionInTransaction(transaction: Parameters<Parameters<typeof db.transaction>[0]>[0], id: string): Promise<SessionRecord | null> {
  const result = await transaction.execute<SessionRecord>(sql`
    SELECT ${sessionColumns}, COALESCE(array_agg(n.chronicle_night_id ORDER BY n.chronicle_night_id) FILTER (WHERE n.chronicle_night_id IS NOT NULL), ARRAY[]::uuid[]) AS "chronicleNightIds"
    FROM game_sessions s LEFT JOIN game_session_nights n ON n.session_id = s.id
    WHERE s.id = ${id}::uuid GROUP BY s.id
  `)
  return result.rows[0] ?? null
}

export async function getCampaignGameSession(actorId: string, campaignId: string) {
  requireStorage()
  requireUuid(campaignId)
  const access = await getAccess(campaignId, actorId)
  if (!access) { throw new CharacterCommandError(404, 'Mesa não encontrada.') }
  if (!access.isMember) { throw new CharacterCommandError(403, 'Acesso negado.') }
  const active = await readActiveSession(campaignId)
  // shortcut: histórico limitado às cem sessões recentes; paginar quando houver mesas com mais encontros.
  const history=await db.execute<{id:string;status:'ACTIVE'|'CLOSED';startedAt:Date}>(sql`SELECT id,status,started_at AS "startedAt" FROM game_sessions WHERE campaign_id=${campaignId}::uuid ORDER BY started_at DESC,id DESC LIMIT 100`)
  return { sessions:history.rows, archived:access.archived, session: active ? sessionProjection(active) : null, canManage: access.isMaster, characters: active ? await getCharacters(campaignId, actorId, access.isMaster) : [] }
}

export async function startGameSession(actorId: string, campaignId: string, input: unknown) {
  requireStorage()
  requireUuid(campaignId)
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key => !['idempotencyKey', 'chronicleNightIds'].includes(key)) || !Object.hasOwn(input, 'idempotencyKey')) { throw new CharacterCommandError(400, 'Dados de início inválidos.') }
  const value = input as { idempotencyKey?: unknown; chronicleNightIds?: unknown }
  const key = requireKey(value.idempotencyKey)
  const access = await getAccess(campaignId, actorId)
  if (!access) { throw new CharacterCommandError(404, 'Mesa não encontrada.') }
  if (!access.isMaster) { throw new CharacterCommandError(403, 'Somente o Narrador atual pode iniciar a sessão.') }
  const chronicleNightIds = validateChronicleNights(value.chronicleNightIds)
  const session = await startPersistentSession(campaignId, actorId, key, chronicleNightIds)
  if (!session) { throw new CharacterCommandError(409, 'Já existe uma sessão ativa nesta mesa ou a chave já foi usada com outros dados.') }
  return sessionProjection(session)
}

export async function getGameSession(actorId: string, sessionId: string) {
  requireStorage()
  requireUuid(sessionId)
  const session = await readSession(sessionId)
  if (!session) { throw new CharacterCommandError(404, 'Sessão não encontrada.') }
  const access = await getAccess(session.campaignId, actorId)
  if (!access?.isMember) { throw new CharacterCommandError(403, 'Acesso negado.') }
  return { session: sessionProjection(session), canManage: access.isMaster, characters: await getCharacters(session.campaignId, actorId, access.isMaster) }
}

export async function assertGameSessionCharacter(actorId: string, sessionId: string, characterId: string) {
  const result = await getGameSession(actorId, sessionId)
  if (result.session.status !== 'ACTIVE' || !result.characters.some(character => character.id === characterId)) { throw new CharacterCommandError(403, 'A ficha não está autorizada nesta sessão.') }
}

export async function assertGameSessionManager(actorId: string, sessionId: string, campaignId: string) {
  const result = await getGameSession(actorId, sessionId)
  if (result.session.status !== 'ACTIVE' || result.session.campaignId !== campaignId || !result.canManage) { throw new CharacterCommandError(403, 'A sessão não está autorizada para esta mesa.') }
}

async function closePersistentSession(sessionId: string, actorId: string, key: string, expectedRevision: number) {
  return await db.transaction(async transaction => {
    const campaign = await transaction.execute<{ master_user_id: string }>(sql`SELECT c.master_user_id FROM campaigns c JOIN game_sessions s ON s.campaign_id = c.id WHERE s.id = ${sessionId}::uuid FOR SHARE OF c`)
    if (campaign.rows[0]?.master_user_id !== actorId) { throw new CharacterCommandError(403, 'Somente o Narrador atual pode encerrar a sessão.') }
    const operation = await transaction.execute<{ session_id: string; actor_user_id: string; expected_revision: number }>(sql`SELECT session_id, actor_user_id, expected_revision FROM game_session_close_operations WHERE idempotency_key = ${key}::uuid`)
    if (operation.rows[0]) {
      const prior = operation.rows[0]
      if (prior.session_id !== sessionId || prior.actor_user_id !== actorId || Number(prior.expected_revision) !== expectedRevision) { return null }
      return readSessionInTransaction(transaction, sessionId)
    }

    const locked = await transaction.execute<{ status: 'ACTIVE' | 'CLOSED'; revision: number }>(sql`SELECT status, revision FROM game_sessions WHERE id = ${sessionId}::uuid FOR UPDATE`)
    const current = locked.rows[0]
    if (!current) { return null }
    if (current.status === 'CLOSED') { return readSessionInTransaction(transaction, sessionId) }
    if (Number(current.revision) !== expectedRevision) { return null }
    const updated = await transaction.execute(sql`UPDATE game_sessions SET status = 'CLOSED', ended_at = now(), revision = revision + 1 WHERE id = ${sessionId}::uuid AND status = 'ACTIVE' AND revision = ${expectedRevision}`)
    if (!updated.rowCount) { return null }
    const saved = await transaction.execute(sql`INSERT INTO game_session_close_operations (idempotency_key, session_id, actor_user_id, expected_revision, resulting_revision) VALUES (${key}::uuid, ${sessionId}::uuid, ${actorId}, ${expectedRevision}, ${expectedRevision + 1}) ON CONFLICT DO NOTHING`)
    if (!saved.rowCount) { throw new CharacterCommandError(409, 'A chave já foi usada para outra operação.') }
    return readSessionInTransaction(transaction, sessionId)
  })
}

export async function closeGameSession(actorId: string, sessionId: string, input: unknown) {
  requireStorage()
  requireUuid(sessionId)
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).length !== 2) { throw new CharacterCommandError(400, 'Dados de encerramento inválidos.') }
  const value = input as { idempotencyKey?: unknown; expectedRevision?: unknown }
  const key = requireKey(value.idempotencyKey)
  if (!Number.isSafeInteger(value.expectedRevision) || Number(value.expectedRevision) < 1) { throw new CharacterCommandError(400, 'Revisão inválida.') }
  const session = await readSession(sessionId)
  if (!session) { throw new CharacterCommandError(404, 'Sessão não encontrada.') }
  const access = await getAccess(session.campaignId, actorId)
  if (!access?.isMember) { throw new CharacterCommandError(403, 'Acesso negado.') }
  if (!access.isMaster) { throw new CharacterCommandError(403, 'Somente o Narrador atual pode encerrar a sessão.') }
  const closed = await closePersistentSession(sessionId, actorId, key, Number(value.expectedRevision))
  if (!closed) { throw new CharacterCommandError(session.status === 'ACTIVE' ? 409 : 403, 'A sessão mudou ou a chave já foi usada. Atualize o estado antes de tentar novamente.') }
  return sessionProjection(closed)
}
