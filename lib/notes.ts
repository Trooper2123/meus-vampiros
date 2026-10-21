import { createHash, randomUUID } from 'node:crypto'
import { sql } from 'drizzle-orm'
import { db } from './db'
import { CharacterCommandError } from './character-commands'

export type NoteLink = { targetType: 'CHARACTER' | 'NPC' | 'EVENT' | 'SESSION'; targetId: string }
export type Note = { id: string; authorUserId: string; campaignId: string | null; visibility: 'PRIVATE' | 'NARRATOR_ONLY' | 'SHARED'; title: string; body: string; recipientUserIds: string[]; links: NoteLink[]; revision: number; createdAt: string; updatedAt: string }
type NoteRow = { id: string; author_user_id: string; campaign_id: string | null; visibility: Note['visibility']; title: string; body: string; recipient_user_ids: string[]; links: NoteLink[]; revision: number; created_at: Date; updated_at: Date }
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function fail(status: number, message: string): never { throw new CharacterCommandError(status, message) }
export function noteUuid(value: unknown): value is string { return typeof value === 'string' && uuid.test(value) }
function note(row: NoteRow): Note { return { id: row.id, authorUserId: row.author_user_id, campaignId: row.campaign_id, visibility: row.visibility, title: row.title, body: row.body, recipientUserIds: row.recipient_user_ids ?? [], links: row.links ?? [], revision: row.revision, createdAt: new Date(row.created_at).toISOString(), updatedAt: new Date(row.updated_at).toISOString() } }
async function isMember(campaignId: string, userId: string) {
  const result = await db.execute<{ member: boolean }>(sql`SELECT EXISTS (SELECT 1 FROM campaigns WHERE id = ${campaignId}::uuid AND master_user_id = ${userId} UNION SELECT 1 FROM characters WHERE campaign_id = ${campaignId}::uuid AND user_id = ${userId}) AS member`)
  return result.rows[0]?.member === true
}
async function isNarrator(campaignId: string | null, actorId: string) {
  if (!campaignId) return false
  const result = await db.execute<{ allowed: boolean }>(sql`SELECT EXISTS (SELECT 1 FROM campaigns WHERE id = ${campaignId}::uuid AND master_user_id = ${actorId}) AS allowed`)
  return result.rows[0]?.allowed === true
}
async function canRead(value: Note, actorId: string) {
  if (value.visibility === 'NARRATOR_ONLY') return isNarrator(value.campaignId, actorId)
  if (value.authorUserId === actorId) return true
  return value.visibility === 'SHARED' && value.recipientUserIds.includes(actorId) && !!value.campaignId && await isMember(value.campaignId, actorId) && await isMember(value.campaignId, value.authorUserId)
}
async function canEdit(value: Note, actorId: string) { return value.visibility === 'NARRATOR_ONLY' ? isNarrator(value.campaignId, actorId) : value.authorUserId === actorId }
async function target(actorId: string, link: NoteLink): Promise<{ campaignId: string | null; label: string } | null> {
  if (link.targetType === 'CHARACTER' || link.targetType === 'NPC') {
    const result = await db.execute<{ id: string; user_id: string; campaign_id: string | null; master_user_id: string | null; character_type: string; visibility: string; name: string }>(sql`SELECT ch.id, ch.user_id, ch.campaign_id, c.master_user_id, ch.character_type, ch.visibility, ch.name FROM characters ch LEFT JOIN campaigns c ON c.id = ch.campaign_id WHERE ch.id = ${link.targetId}::uuid`)
    const row = result.rows[0]
    if (!row) return null
    const npc = ['HUMAN_NPC', 'VAMPIRE_NPC'].includes(row.character_type)
    const allowed = row.user_id === actorId || row.master_user_id === actorId || npc && row.visibility === 'PLAYER_VISIBLE' && !!row.campaign_id && await isMember(row.campaign_id, actorId)
    return npc === (link.targetType === 'NPC') && allowed ? { campaignId: row.campaign_id, label: row.name } : null
  }
  if (link.targetType === 'EVENT') {
    const result = await db.execute<{ campaign_id: string; title: string; visibility: string; master_user_id: string }>(sql`SELECT e.campaign_id, e.title, e.visibility, c.master_user_id FROM campaign_events e JOIN campaigns c ON c.id = e.campaign_id WHERE e.id = ${link.targetId}::uuid`)
    const row = result.rows[0]
    return row && (row.master_user_id === actorId || row.visibility === 'everyone' && await isMember(row.campaign_id, actorId)) ? { campaignId: row.campaign_id, label: row.title } : null
  }
  const result = await db.execute<{ id: string; campaign_id: string; night_number: number; in_game_date: string }>(sql`SELECT id, campaign_id, night_number, in_game_date::text FROM chronicle_nights WHERE id = ${link.targetId}::uuid`)
  const row = result.rows[0]
  return row && await isMember(row.campaign_id, actorId) ? { campaignId: row.campaign_id, label: `Noite ${row.night_number} — ${row.in_game_date}` } : null
}
async function project(value: Note, actorId: string, detail: boolean) {
  const editable = await canEdit(value, actorId)
  const canShare = value.visibility !== 'NARRATOR_ONLY' && value.authorUserId === actorId && !!value.campaignId && await isMember(value.campaignId, actorId)
  const links = detail ? (await Promise.all(value.links.map(async link => { const resolved = await target(actorId, link); return resolved?.campaignId === value.campaignId ? { ...link, label: resolved.label } : null }))).filter(link => link !== null) : undefined
  return { id: value.id, title: value.title, campaignId: value.campaignId, visibility: value.visibility, revision: value.revision, createdAt: value.createdAt, updatedAt: value.updatedAt, canEdit: editable, canDelete: editable, canShare, ...(detail ? { body: value.body, links, ...(editable ? { recipientUserIds: value.recipientUserIds } : {}) } : {}) }
}
function payload(input: unknown, update: boolean): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input) || Buffer.byteLength(JSON.stringify(input), 'utf8') > 100000) fail(400, 'Dados da anotação inválidos.')
  const value = input as Record<string, unknown>
  const fields = new Set(['title', 'body', 'campaignId', 'visibility', 'recipientUserIds', 'links', update ? 'expectedRevision' : 'idempotencyKey'])
  if (Object.keys(value).some(key => !fields.has(key))) fail(400, 'Campos de anotação não permitidos.')
  if (update ? !Number.isSafeInteger(value.expectedRevision) || Number(value.expectedRevision) < 0 : !noteUuid(value.idempotencyKey)) fail(400, 'Revisão ou chave inválida.')
  return value
}
async function validate(value: Note, actorId: string, previous?: Note) {
  if (typeof value.title !== 'string' || !value.title.trim() || value.title.trim().length > 120 || typeof value.body !== 'string' || value.body.length > 20000 || !['PRIVATE', 'SHARED', 'NARRATOR_ONLY'].includes(value.visibility) || value.campaignId !== null && !noteUuid(value.campaignId)) fail(422, 'Título, texto, mesa ou visibilidade inválidos.')
  value.title = value.title.trim()
  if (previous?.campaignId && previous.campaignId !== value.campaignId) fail(422, 'A mesa de uma anotação já contextualizada não pode ser alterada.')
  if (value.campaignId && !await isMember(value.campaignId, actorId)) fail(403, 'Você não pertence a esta mesa.')
  if (previous && (previous.visibility === 'NARRATOR_ONLY') !== (value.visibility === 'NARRATOR_ONLY')) fail(422, 'Anotações exclusivas não podem mudar de categoria.')
  if (!Array.isArray(value.recipientUserIds) || value.recipientUserIds.length > 20 || value.recipientUserIds.some(user => typeof user !== 'string' || !user.trim() || user.length > 200) || new Set(value.recipientUserIds).size !== value.recipientUserIds.length) fail(422, 'Destinatários inválidos.')
  if (value.visibility === 'PRIVATE') value.recipientUserIds = []
  if (value.visibility === 'NARRATOR_ONLY' && (!await isNarrator(value.campaignId, actorId) || value.recipientUserIds.length)) fail(403, 'Somente o Narrador atual pode manter anotações exclusivas sem destinatários.')
  if (value.visibility === 'SHARED') {
    const recipientsValid = value.campaignId && (await Promise.all(value.recipientUserIds.map(user => isMember(value.campaignId!, user)))).every(Boolean)
    if (!value.campaignId || !await isMember(value.campaignId, actorId) || !recipientsValid || value.recipientUserIds.includes(value.authorUserId)) fail(422, 'Compartilhamento exige participantes atuais da mesma mesa.')
    if (!value.recipientUserIds.length) { if (previous?.visibility !== 'SHARED') fail(422, 'Escolha ao menos um destinatário para compartilhar.'); value.visibility = 'PRIVATE' }
  }
  if (!Array.isArray(value.links) || value.links.length > 20) fail(422, 'Vínculos inválidos.')
  const seen = new Set<string>()
  for (const link of value.links) {
    if (!link || typeof link !== 'object' || Object.keys(link).some(key => !['targetType', 'targetId'].includes(key)) || !['CHARACTER', 'NPC', 'EVENT', 'SESSION'].includes(link.targetType) || !noteUuid(link.targetId)) fail(422, 'Vínculo inválido.')
    const key = `${link.targetType}:${link.targetId}`
    const resolved = await target(actorId, link)
    if (!resolved || resolved.campaignId !== value.campaignId || seen.has(key)) fail(422, 'Vínculo indisponível, duplicado ou de outra mesa.')
    seen.add(key)
  }
}
const columns = sql`id, author_user_id, campaign_id, visibility, title, body, recipient_user_ids, links, revision, created_at, updated_at`
async function getRow(id: string) { const result = await db.execute<NoteRow>(sql`SELECT ${columns} FROM notes WHERE id = ${id}::uuid`); return result.rows[0] ? note(result.rows[0]) : null }

export async function getNote(actorId: string, id: string) {
  const value = noteUuid(id) ? await getRow(id) : null
  if (!value || !await canRead(value, actorId)) fail(404, 'Anotação não encontrada.')
  return project(value, actorId, true)
}

export async function listNotes(actorId: string, options: { campaignId?: string; page?: number; pageSize?: number; link?: NoteLink } = {}) {
  const page = options.page ?? 1, pageSize = options.pageSize ?? 20
  if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 50 || options.campaignId !== undefined && !noteUuid(options.campaignId)) fail(400, 'Filtros inválidos.')
  if (options.link && (!noteUuid(options.link.targetId) || !['CHARACTER', 'NPC', 'EVENT', 'SESSION'].includes(options.link.targetType) || !await target(actorId, options.link))) fail(404, 'Contexto não encontrado.')
  const result = await db.execute<NoteRow>(sql`SELECT ${columns} FROM notes WHERE campaign_id IS NOT DISTINCT FROM ${options.campaignId ?? null}::uuid OR ${options.campaignId ?? null}::uuid IS NULL ORDER BY updated_at DESC, id DESC`)
  const visible: Note[] = []
  for (const row of result.rows) {
    const value = note(row)
    if (!await canRead(value, actorId)) continue
    if (options.link && (!value.links.some(link => link.targetType === options.link!.targetType && link.targetId === options.link!.targetId) || (await target(actorId, options.link))?.campaignId !== value.campaignId)) continue
    visible.push(value)
  }
  return { notes: await Promise.all(visible.slice((page - 1) * pageSize, page * pageSize).map(value => project(value, actorId, false))), total: visible.length, page, pageSize }
}

export async function createNote(actorId: string, input: unknown) {
  const value = payload(input, false), { idempotencyKey, ...fields } = value
  const hash = createHash('sha256').update(JSON.stringify(Object.fromEntries(Object.entries(fields).sort(([a], [b]) => a.localeCompare(b))))).digest('hex')
  const requestId = String(idempotencyKey)
  const saved = await db.execute<{ request_hash: string; note_id: string }>(sql`SELECT request_hash, note_id FROM note_requests WHERE author_user_id = ${actorId} AND idempotency_key = ${requestId}::uuid`)
  if (saved.rows[0]) { if (saved.rows[0].request_hash !== hash) fail(409, 'Chave já utilizada com outro conteúdo.'); return getNote(actorId, saved.rows[0].note_id) }
  const created = { title: '', campaignId: null, visibility: 'PRIVATE', body: '', recipientUserIds: [], links: [], ...structuredClone(fields), id: randomUUID(), authorUserId: actorId, revision: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as Note
  await validate(created, actorId)
  const result = await db.transaction(async tx => {
    const inserted = await tx.execute<{ request_hash: string; note_id: string }>(sql`INSERT INTO note_requests (author_user_id, idempotency_key, request_hash, note_id) VALUES (${actorId}, ${requestId}::uuid, ${hash}, ${created.id}::uuid) ON CONFLICT DO NOTHING RETURNING request_hash, note_id`)
    if (!inserted.rows[0]) {
      const duplicate = await tx.execute<{ request_hash: string; note_id: string }>(sql`SELECT request_hash, note_id FROM note_requests WHERE author_user_id = ${actorId} AND idempotency_key = ${requestId}::uuid`)
      return duplicate.rows[0]
    }
    await tx.execute(sql`INSERT INTO notes (id, author_user_id, campaign_id, visibility, title, body, recipient_user_ids, links) VALUES (${created.id}::uuid, ${actorId}, ${created.campaignId}::uuid, ${created.visibility}, ${created.title}, ${created.body}, ${JSON.stringify(created.recipientUserIds)}::jsonb, ${JSON.stringify(created.links)}::jsonb)`)
    return { request_hash: hash, note_id: created.id }
  })
  if (result.request_hash !== hash) fail(409, 'Chave já utilizada com outro conteúdo.')
  return getNote(actorId, result.note_id)
}

export async function updateNote(actorId: string, id: string, input: unknown) {
  const previous = noteUuid(id) ? await getRow(id) : null
  if (!previous || !await canRead(previous, actorId)) fail(404, 'Anotação não encontrada.')
  if (!await canEdit(previous, actorId)) fail(403, 'Esta anotação permite somente leitura.')
  const { expectedRevision, ...fields } = payload(input, true)
  if (expectedRevision !== previous.revision) fail(409, 'A anotação foi alterada. Recarregue antes de salvar.')
  const value = { ...structuredClone(previous), ...structuredClone(fields), revision: previous.revision + 1, updatedAt: new Date().toISOString() } as Note
  if (!Object.hasOwn(fields, 'links')) value.links = (await Promise.all(value.links.map(async link => await target(actorId, link) ? link : null))).filter((link): link is NoteLink => link !== null)
  await validate(value, actorId, previous)
  const result = await db.execute(sql`UPDATE notes SET visibility = ${value.visibility}, title = ${value.title}, body = ${value.body}, recipient_user_ids = ${JSON.stringify(value.recipientUserIds)}::jsonb, links = ${JSON.stringify(value.links)}::jsonb, revision = revision + 1, updated_at = now() WHERE id = ${id}::uuid AND revision = ${expectedRevision} AND (author_user_id = ${actorId} OR visibility = 'NARRATOR_ONLY' AND EXISTS (SELECT 1 FROM campaigns WHERE id = notes.campaign_id AND master_user_id = ${actorId})) RETURNING id`)
  if (!result.rows.length) fail(409, 'A anotação foi alterada. Recarregue antes de salvar.')
  return getNote(actorId, id)
}

export async function deleteNote(actorId: string, id: string, expectedRevision: unknown) {
  if (!noteUuid(id)) fail(404, 'Anotação não encontrada.')
  if (!Number.isSafeInteger(expectedRevision) || Number(expectedRevision) < 0) fail(400, 'Revisão inválida.')
  const result = await db.execute(sql`DELETE FROM notes WHERE id = ${id}::uuid AND revision = ${Number(expectedRevision)} AND (author_user_id = ${actorId} OR visibility = 'NARRATOR_ONLY' AND EXISTS (SELECT 1 FROM campaigns WHERE id = notes.campaign_id AND master_user_id = ${actorId})) RETURNING id`)
  if (!result.rows.length) fail(404, 'Anotação não encontrada ou revisão inválida.')
  return { ok: true }
}

export async function notesContext(actorId: string) {
  const campaignsResult = await db.execute<{ id: string; name: string; master_user_id: string }>(sql`SELECT DISTINCT c.id, c.name, c.master_user_id FROM campaigns c LEFT JOIN characters ch ON ch.campaign_id = c.id WHERE c.master_user_id = ${actorId} OR ch.user_id = ${actorId} ORDER BY c.name`)
  const campaigns = await Promise.all(campaignsResult.rows.map(async campaign => {
    const recipients = await db.execute<{ user_id: string }>(sql`SELECT user_id FROM characters WHERE campaign_id = ${campaign.id}::uuid UNION SELECT master_user_id FROM campaigns WHERE id = ${campaign.id}::uuid`)
    return { id: campaign.id, name: campaign.name, isNarrator: campaign.master_user_id === actorId, recipients: [...new Set(recipients.rows.map(row => row.user_id))].filter(user => user !== actorId) }
  }))
  const result = await db.execute<{ id: string; campaign_id: string | null; character_type: string }>(sql`SELECT id, campaign_id, character_type FROM characters WHERE user_id = ${actorId} OR campaign_id IN (SELECT id FROM campaigns WHERE master_user_id = ${actorId}) OR campaign_id IN (SELECT campaign_id FROM characters WHERE user_id = ${actorId})`)
  const targets = await Promise.all(result.rows.map(async row => { const link = { targetType: ['HUMAN_NPC', 'VAMPIRE_NPC'].includes(row.character_type) ? 'NPC' as const : 'CHARACTER' as const, targetId: row.id }; const resolved = await target(actorId, link); return resolved ? { ...link, ...resolved } : null }))
  return { campaigns, targets: targets.filter(target => target !== null) }
}
