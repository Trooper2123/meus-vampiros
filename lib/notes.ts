import { createHash, randomUUID } from 'node:crypto'
import { CharacterCommandError } from './character-commands'
import { devGetCampaignsForMaster, devIsUserInCampaign } from './dev-db'

export type NoteLink = { targetType: 'CHARACTER' | 'NPC' | 'EVENT' | 'SESSION'; targetId: string }
export type Note = { id: string; authorUserId: string; campaignId: string | null; visibility: 'PRIVATE' | 'NARRATOR_ONLY' | 'SHARED'; title: string; body: string; recipientUserIds: string[]; links: NoteLink[]; revision: number; createdAt: string; updatedAt: string }
type NoteMemory = { store: typeof global.__devDb; notes: Map<string, Note>; requests: Map<string, { hash: string; id: string }> }
declare global { var __notesMemory: NoteMemory | undefined }
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function fail(status: number, message: string): never { throw new CharacterCommandError(status, message) }
export function noteUuid(value: unknown): value is string { return typeof value === 'string' && uuid.test(value) }

function memory(actorId: string) {
  if (process.env.NODE_ENV === 'production' || process.env.DATABASE_URL) fail(503, 'O armazenamento de anotações neste ambiente ainda não está disponível.')
  devGetCampaignsForMaster(actorId)
  if (global.__notesMemory?.store !== global.__devDb) global.__notesMemory = { store: global.__devDb, notes: new Map(), requests: new Map() }
  return global.__notesMemory!
}

function narrator(actorId: string, campaignId: string | null) {
  return Boolean(campaignId && global.__devDb?.campaigns.some(campaign => campaign.id === campaignId && campaign.masterUserId === actorId))
}

function canRead(note: Note, actorId: string) {
  if (note.visibility === 'NARRATOR_ONLY') return narrator(actorId, note.campaignId)
  if (note.authorUserId === actorId) return true
  return note.visibility === 'SHARED' && note.recipientUserIds.includes(actorId) && Boolean(note.campaignId && devIsUserInCampaign(note.campaignId, actorId) && devIsUserInCampaign(note.campaignId, note.authorUserId))
}

function canEdit(note: Note, actorId: string) { return note.visibility === 'NARRATOR_ONLY' ? narrator(actorId, note.campaignId) : note.authorUserId === actorId }

function target(actorId: string, link: NoteLink): { campaignId: string | null; label: string } | null {
  if (link.targetType === 'CHARACTER' || link.targetType === 'NPC') {
    const character = global.__devDb?.characters.find(entry => entry.id === link.targetId)
    if (!character) return null
    const npc = ['HUMAN_NPC', 'VAMPIRE_NPC'].includes(character.characterType ?? '')
    if (npc !== (link.targetType === 'NPC')) return null
    const authorized = character.userId === actorId || narrator(actorId, character.campaignId) || (npc && character.visibility === 'PLAYER_VISIBLE' && character.campaignId && devIsUserInCampaign(character.campaignId, actorId))
    return authorized ? { campaignId: character.campaignId, label: character.name } : null
  }
  if (link.targetType === 'EVENT') {
    const event = global.__devDbCampaignCalendar?.events.find(entry => entry.id === link.targetId)
    return event && (narrator(actorId, event.campaignId) || (event.visibility === 'everyone' && devIsUserInCampaign(event.campaignId, actorId))) ? { campaignId: event.campaignId, label: event.title } : null
  }
  const nights = global.__chronicleNightMemory
  const night = nights && nights.store === global.__devDb ? nights.nights.find(entry => entry.result.id === link.targetId)?.result : undefined
  return night && devIsUserInCampaign(night.campaignId, actorId) ? { campaignId: night.campaignId, label: `Noite ${night.nightNumber} — ${night.inGameDate}` } : null
}

function project(note: Note, actorId: string, detail: boolean) {
  const links = note.links.flatMap(link => {
    const resolved = target(actorId, link)
    return resolved && resolved.campaignId === note.campaignId ? [{ ...link, label: resolved.label }] : []
  })
  return structuredClone({ id: note.id, title: note.title, campaignId: note.campaignId, visibility: note.visibility, revision: note.revision, createdAt: note.createdAt, updatedAt: note.updatedAt, canEdit: canEdit(note, actorId), canDelete: canEdit(note, actorId), canShare: note.visibility !== 'NARRATOR_ONLY' && note.authorUserId === actorId && Boolean(note.campaignId && devIsUserInCampaign(note.campaignId, actorId)), ...(detail ? { body: note.body, links, ...(canEdit(note, actorId) ? { recipientUserIds: note.recipientUserIds } : {}) } : {}) })
}

function payload(input: unknown, update: boolean): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input) || Buffer.byteLength(JSON.stringify(input), 'utf8') > 100000) fail(400, 'Dados da anotação inválidos.')
  const value = input as Record<string, unknown>
  const fields = ['title', 'body', 'campaignId', 'visibility', 'recipientUserIds', 'links', update ? 'expectedRevision' : 'idempotencyKey']
  if (Object.keys(value).some(key => !fields.includes(key))) fail(400, 'Campos de anotação não permitidos.')
  if (update ? !Number.isSafeInteger(value.expectedRevision) || Number(value.expectedRevision) < 0 : !noteUuid(value.idempotencyKey)) fail(400, 'Revisão ou chave inválida.')
  return value
}

function validate(note: Note, actorId: string, previous?: Note) {
  if (typeof note.title !== 'string' || !note.title.trim() || note.title.trim().length > 120 || typeof note.body !== 'string' || note.body.length > 20000 || !['PRIVATE', 'SHARED', 'NARRATOR_ONLY'].includes(note.visibility) || (note.campaignId !== null && !noteUuid(note.campaignId))) fail(422, 'Título, texto, mesa ou visibilidade inválidos.')
  note.title = note.title.trim()
  if (note.campaignId && !global.__devDb?.campaigns.some(entry => entry.id === note.campaignId)) fail(422, 'Mesa indisponível.')
  if (previous?.campaignId && previous.campaignId !== note.campaignId) fail(422, 'A mesa de uma anotação já contextualizada não pode ser alterada.')
  if (note.campaignId && (!previous || previous.campaignId !== note.campaignId) && !devIsUserInCampaign(note.campaignId, actorId)) fail(403, 'Você não pertence a esta mesa.')
  if ((previous?.visibility === 'NARRATOR_ONLY') !== (note.visibility === 'NARRATOR_ONLY') && previous) fail(422, 'Anotações exclusivas não podem mudar de categoria.')
  if (!Array.isArray(note.recipientUserIds) || note.recipientUserIds.length > 20 || note.recipientUserIds.some(user => typeof user !== 'string' || !user.trim() || user.length > 200) || new Set(note.recipientUserIds).size !== note.recipientUserIds.length) fail(422, 'Destinatários inválidos.')
  if (note.visibility === 'PRIVATE') note.recipientUserIds = []
  if (note.visibility === 'NARRATOR_ONLY' && (!narrator(actorId, note.campaignId) || note.recipientUserIds.length)) fail(403, 'Somente o Narrador atual pode manter anotações exclusivas sem destinatários.')
  if (note.visibility === 'SHARED') {
    if (!note.campaignId || !devIsUserInCampaign(note.campaignId, actorId) || note.recipientUserIds.some(user => user === note.authorUserId || !devIsUserInCampaign(note.campaignId!, user))) fail(422, 'Compartilhamento exige participantes atuais da mesma mesa.')
    if (!note.recipientUserIds.length) {
      if (previous?.visibility !== 'SHARED') fail(422, 'Escolha ao menos um destinatário para compartilhar.')
      note.visibility = 'PRIVATE'
    }
  }
  if (!Array.isArray(note.links) || note.links.length > 20) fail(422, 'Vínculos inválidos.')
  const seen = new Set<string>()
  for (const link of note.links) {
    if (!link || typeof link !== 'object' || Array.isArray(link) || Object.keys(link).some(key => !['targetType', 'targetId'].includes(key)) || !['CHARACTER', 'NPC', 'EVENT', 'SESSION'].includes(link.targetType) || !noteUuid(link.targetId)) fail(422, 'Vínculo inválido.')
    const resolved = target(actorId, link)
    const key = `${link.targetType}:${link.targetId}`
    if (!resolved || resolved.campaignId !== note.campaignId || seen.has(key)) fail(422, 'Vínculo indisponível, duplicado ou de outra mesa.')
    seen.add(key)
  }
}

export function getNote(actorId: string, id: string) {
  const note = memory(actorId).notes.get(id)
  if (!note || !canRead(note, actorId)) fail(404, 'Anotação não encontrada.')
  return project(note, actorId, true)
}

export function listNotes(actorId: string, options: { campaignId?: string; page?: number; pageSize?: number; link?: NoteLink } = {}) {
  const store = memory(actorId)
  const page = options.page ?? 1
  const pageSize = options.pageSize ?? 20
  if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 50 || (options.campaignId !== undefined && !noteUuid(options.campaignId))) fail(400, 'Filtros inválidos.')
  if (options.link && (!noteUuid(options.link.targetId) || !['CHARACTER', 'NPC', 'EVENT', 'SESSION'].includes(options.link.targetType) || !target(actorId, options.link))) fail(404, 'Contexto não encontrado.')
  const visible = [...store.notes.values()].filter(note => canRead(note, actorId) && (!options.campaignId || note.campaignId === options.campaignId) && (!options.link || note.links.some(link => link.targetId === options.link!.targetId && link.targetType === options.link!.targetType) && target(actorId, options.link)?.campaignId === note.campaignId)).sort((first, second) => second.updatedAt.localeCompare(first.updatedAt) || second.id.localeCompare(first.id))
  return { notes: visible.slice((page - 1) * pageSize, page * pageSize).map(note => project(note, actorId, false)), total: visible.length, page, pageSize }
}

export function createNote(actorId: string, input: unknown) {
  const store = memory(actorId)
  const value = payload(input, false)
  const { idempotencyKey, ...fields } = value
  const hash = createHash('sha256').update(JSON.stringify(Object.fromEntries(Object.entries(fields).sort(([first], [second]) => first.localeCompare(second))))).digest('hex')
  const requestId = `${actorId}:${idempotencyKey}`
  const saved = store.requests.get(requestId)
  if (saved) { if (saved.hash !== hash) fail(409, 'Chave já utilizada com outro conteúdo.'); return getNote(actorId, saved.id) }
  const now = new Date().toISOString()
  const note = { title: '', campaignId: null, visibility: 'PRIVATE', body: '', recipientUserIds: [], links: [], ...structuredClone(fields), id: randomUUID(), authorUserId: actorId, revision: 0, createdAt: now, updatedAt: now } as Note
  validate(note, actorId)
  store.notes.set(note.id, note)
  store.requests.set(requestId, { hash, id: note.id })
  return project(note, actorId, true)
}

export function updateNote(actorId: string, id: string, input: unknown) {
  const store = memory(actorId)
  const previous = store.notes.get(id)
  if (!previous || !canRead(previous, actorId)) fail(404, 'Anotação não encontrada.')
  if (!canEdit(previous, actorId)) fail(403, 'Esta anotação permite somente leitura.')
  const { expectedRevision, ...fields } = payload(input, true)
  if (expectedRevision !== previous.revision) fail(409, 'A anotação foi alterada. Recarregue antes de salvar.')
  const note = { ...structuredClone(previous), ...structuredClone(fields), revision: previous.revision + 1, updatedAt: new Date().toISOString() } as Note
  if (!Object.hasOwn(fields, 'links')) note.links = note.links.filter(link => target(actorId, link))
  if (previous.visibility === 'SHARED' && previous.campaignId && !devIsUserInCampaign(previous.campaignId, actorId) && !Object.hasOwn(fields, 'visibility') && !Object.hasOwn(fields, 'recipientUserIds')) { note.visibility = 'PRIVATE'; note.recipientUserIds = [] }
  validate(note, actorId, previous)
  store.notes.set(id, note)
  return project(note, actorId, true)
}

export function deleteNote(actorId: string, id: string, expectedRevision: unknown) {
  const store = memory(actorId)
  const note = store.notes.get(id)
  if (!note || !canRead(note, actorId)) fail(404, 'Anotação não encontrada.')
  if (!canEdit(note, actorId)) fail(403, 'Esta anotação permite somente leitura.')
  if (!Number.isSafeInteger(expectedRevision) || Number(expectedRevision) < 0) fail(400, 'Revisão inválida.')
  if (expectedRevision !== note.revision) fail(409, 'A anotação foi alterada. Recarregue antes de excluir.')
  store.notes.delete(id)
  return { ok: true }
}

export function notesContext(actorId: string) {
  memory(actorId)
  const campaigns = global.__devDb!.campaigns.filter(campaign => devIsUserInCampaign(campaign.id, actorId)).map(campaign => ({ id: campaign.id, name: campaign.name, isNarrator: campaign.masterUserId === actorId, recipients: [...new Set([campaign.masterUserId, ...global.__devDb!.characters.filter(character => character.campaignId === campaign.id).map(character => character.userId)])].filter(user => user !== actorId) }))
  const links: NoteLink[] = global.__devDb!.characters.map(character => ({ targetType: ['HUMAN_NPC', 'VAMPIRE_NPC'].includes(character.characterType ?? '') ? 'NPC' : 'CHARACTER', targetId: character.id }))
  links.push(...(global.__devDbCampaignCalendar?.events ?? []).map(event => ({ targetType: 'EVENT' as const, targetId: event.id })))
  const nights = global.__chronicleNightMemory
  if (nights && nights.store === global.__devDb) links.push(...nights.nights.map(night => ({ targetType: 'SESSION' as const, targetId: night.result.id })))
  return { campaigns, targets: links.flatMap(link => { const resolved = target(actorId, link); return resolved ? [{ ...link, ...resolved }] : [] }) }
}
