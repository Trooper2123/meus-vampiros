import { beforeEach, describe, expect, it, vi } from 'vitest'
import { randomUUID } from 'node:crypto'

const session = vi.hoisted(() => { vi.stubEnv('NODE_ENV', 'test'); return vi.fn() })
vi.mock('@/lib/auth0', () => ({ getSessionOrDev: session }))

import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { createTestCampaign, createTestCharacter, preparePostgresTest } from './postgres-test-helpers'
import { createNote, deleteNote, getNote, listNotes, notesContext, updateNote } from '@/lib/notes'
import { GET, POST } from '@/app/api/notes/route'
import { GET as read, PATCH, DELETE } from '@/app/api/notes/[id]/route'
import { GET as backlinks } from '@/app/api/notes/links/route'
import { createCampaignEvent } from '@/lib/db'
import { duplicateCharacter } from '@/lib/characters'

let campaignId: string
let otherCampaignId: string
let playerId: string
let narratorId: string
let recipientId: string
let characterId: string
let npcId: string
let eventId: string
let sessionId: string
const draft = (fields = {}) => ({ title: 'Segredo', body: '<script>texto</script>', idempotencyKey: randomUUID(), ...fields })
const request = (body?: unknown, method = 'POST', headers: Record<string, string> = {}) => new Request('http://localhost/api/notes', { method, headers: { 'Content-Type': 'application/json', ...headers }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })

describe('notas no PostgreSQL e APIs', () => {
  beforeEach(async () => {
    await preparePostgresTest()
    const suffix = randomUUID()
    playerId = `test|player-${suffix}`
    narratorId = `test|narrator-${suffix}`
    recipientId = `test|recipient-${suffix}`
    campaignId = (await createTestCampaign(narratorId, 'Mesa A')).id
    otherCampaignId = (await createTestCampaign(`test|other-${suffix}`, 'Mesa B')).id
    characterId = (await createTestCharacter(playerId, campaignId, 'Jogador')).id
    await createTestCharacter(recipientId, campaignId, 'Outro')
    npcId = randomUUID()
    await db.execute(sql`INSERT INTO characters (id, user_id, created_by_user_id, campaign_id, name, character_type, visibility) VALUES (${npcId}::uuid, ${narratorId}, ${narratorId}, ${campaignId}::uuid, 'NPC privado', 'HUMAN_NPC', 'ST_ONLY')`)
    eventId = (await createCampaignEvent(campaignId, 'Evento público', null, '2026-10-13', null, 'everyone')).id
    sessionId = randomUUID()
    await db.execute(sql`INSERT INTO chronicle_nights (id, campaign_id, night_number, in_game_date, status, started_by_user_id, idempotency_key, request_hash, ruleset_version, result) VALUES (${sessionId}::uuid, ${campaignId}::uuid, 1, '2026-10-13', 'ACTIVE', ${narratorId}, ${suffix}, ${suffix}, 'test', '{}'::jsonb)`)
    session.mockResolvedValue({ user: { sub: playerId } })
  })

  it('mantém notas privadas isoladas e aplica idempotência', async () => {
    const input = draft()
    const note = await createNote(playerId, input)
    expect((await createNote(playerId, input)).id).toBe(note.id)
    await expect(createNote(playerId, { ...input, title: 'outro conteúdo' })).rejects.toThrow('Chave')
    expect((await getNote(playerId, note.id)).body).toContain('<script>')
    await expect(getNote(recipientId, note.id)).rejects.toThrow('não encontrada')
    expect((await listNotes(recipientId)).total).toBe(0)
    const copy = await getNote(playerId, note.id)
    copy.title = 'mutado'
    expect((await getNote(playerId, note.id)).title).toBe('Segredo')
  })

  it('compartilha somente leitura e revoga o acesso ao tornar a nota privada', async () => {
    const note = await createNote(playerId, draft({ campaignId, visibility: 'SHARED', recipientUserIds: [recipientId] }))
    expect(await getNote(recipientId, note.id)).not.toHaveProperty('recipientUserIds')
    await expect(updateNote(recipientId, note.id, { title: 'forjado', expectedRevision: 0 })).rejects.toThrow('somente leitura')
    await expect(deleteNote(recipientId, note.id, 0)).rejects.toThrow('não encontrada')
    await updateNote(playerId, note.id, { recipientUserIds: [], expectedRevision: 0 })
    expect((await getNote(playerId, note.id)).visibility).toBe('PRIVATE')
    await expect(getNote(recipientId, note.id)).rejects.toThrow('não encontrada')
  })

  it('revalida participantes e Narrador atual para notas compartilhadas e exclusivas', async () => {
    const shared = await createNote(playerId, draft({ campaignId, visibility: 'SHARED', recipientUserIds: [recipientId] }))
    await db.execute(sql`UPDATE characters SET campaign_id = NULL WHERE id = ${characterId}::uuid`)
    await expect(getNote(recipientId, shared.id)).rejects.toThrow('não encontrada')
    const exclusive = await createNote(narratorId, draft({ campaignId, visibility: 'NARRATOR_ONLY' }))
    await expect(getNote(playerId, exclusive.id)).rejects.toThrow('não encontrada')
    await db.execute(sql`UPDATE campaigns SET master_user_id = 'test|new-narrator' WHERE id = ${campaignId}::uuid`)
    await expect(getNote(narratorId, exclusive.id)).rejects.toThrow('não encontrada')
    expect((await getNote('test|new-narrator', exclusive.id)).canEdit).toBe(true)
  })

  it('rejeita destinatários, mesas, campos e limites inválidos', async () => {
    await expect(createNote(playerId, draft({ campaignId, visibility: 'SHARED', recipientUserIds: ['outsider'] }))).rejects.toThrow('participantes')
    await expect(createNote(playerId, draft({ campaignId: otherCampaignId }))).rejects.toThrow('pertence')
    await expect(createNote(playerId, draft({ authorUserId: narratorId }))).rejects.toThrow('Campos')
    await expect(createNote(playerId, draft({ title: 'x'.repeat(121) }))).rejects.toThrow()
    await expect(createNote(playerId, draft({ body: 'x'.repeat(20001) }))).rejects.toThrow()
    await expect(createNote(playerId, draft({ recipientUserIds: Array(21).fill(recipientId) }))).rejects.toThrow()
  })

  it('usa revisão otimista e preserva a nota diante de conflito ou vínculo inválido', async () => {
    const input = draft()
    const note = await createNote(playerId, input)
    await updateNote(playerId, note.id, { body: 'novo', expectedRevision: 0 })
    await expect(updateNote(playerId, note.id, { body: 'perda', expectedRevision: 0 })).rejects.toThrow('alterada')
    await expect(updateNote(playerId, note.id, { body: 'perda', expectedRevision: 1, links: [{ targetType: 'NPC', targetId: npcId }] })).rejects.toThrow()
    expect((await getNote(playerId, note.id)).body).toBe('novo')
  })

  it.each(['CHARACTER', 'NPC', 'EVENT', 'SESSION'] as const)('consulta os dois sentidos de %s', async targetType => {
    const targetId = { CHARACTER: characterId, NPC: npcId, EVENT: eventId, SESSION: sessionId }[targetType]
    const authorId = targetType === 'NPC' ? narratorId : playerId
    const note = await createNote(authorId, draft({ campaignId, links: [{ targetType, targetId }] }))
    expect((await getNote(authorId, note.id)).links).toHaveLength(1)
    expect((await listNotes(authorId, { link: { targetType, targetId } })).notes[0].id).toBe(note.id)
    await deleteNote(authorId, note.id, 0)
    expect((await listNotes(authorId, { link: { targetType, targetId } })).total).toBe(0)
  })

  it('oculta vínculos a NPC privado no contexto de jogador', async () => {
    const note = await createNote(narratorId, draft({ campaignId, visibility: 'SHARED', recipientUserIds: [playerId], links: [{ targetType: 'NPC', targetId: npcId }] }))
    expect((await getNote(playerId, note.id)).links).toEqual([])
    expect((await notesContext(playerId)).targets.some(link => link.targetId === npcId)).toBe(false)
    await expect(listNotes(playerId, { link: { targetType: 'NPC', targetId: npcId } })).rejects.toThrow('Contexto')
  })

  it('não duplica notas com a ficha', async () => {
    const note = await createNote(playerId, draft({ campaignId, links: [{ targetType: 'CHARACTER', targetId: characterId }] }))
    const copy = await duplicateCharacter(characterId, playerId)
    expect((await listNotes(playerId, { link: { targetType: 'CHARACTER', targetId: copy!.id } })).total).toBe(0)
    expect((await getNote(playerId, note.id)).links).toHaveLength(1)
  })

  it('API aplica autenticação, CSRF, no-store e revisão', async () => {
    session.mockResolvedValue(null)
    expect((await GET(request(undefined, 'GET'))).status).toBe(401)
    expect((await POST(request(draft()))).status).toBe(401)
    session.mockResolvedValue({ user: { sub: playerId } })
    expect((await POST(request(draft(), 'POST', { origin: 'https://evil.example' }))).status).toBe(403)
    const created = await POST(request(draft()))
    expect(created.status).toBe(201)
    expect(created.headers.get('cache-control')).toContain('no-store')
    const note = await created.json()
    const context = { params: Promise.resolve({ id: note.id }) }
    session.mockResolvedValue({ user: { sub: recipientId } })
    expect((await read(request(undefined, 'GET'), context)).status).toBe(404)
    session.mockResolvedValue({ user: { sub: playerId } })
    expect((await PATCH(request({ body: 'novo', expectedRevision: 0 }, 'PATCH'), context)).status).toBe(200)
    expect((await DELETE(request({ expectedRevision: 0 }, 'DELETE'), context)).status).toBe(404)
    expect((await DELETE(request({ expectedRevision: 1 }, 'DELETE'), context)).status).toBe(200)
    expect((await backlinks(new Request(`http://localhost/api/notes/links?targetType=NPC&targetId=${npcId}`))).status).toBe(404)
  })

  it('rejeita corpo grande, JSON inválido, campos indevidos e paginação abusiva', async () => {
    expect((await POST(request(draft({ body: 'x'.repeat(100001) })))).status).toBe(413)
    expect((await POST(new Request('http://localhost/api/notes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{invalid' }))).status).toBe(400)
    expect((await GET(new Request('http://localhost/api/notes?pageSize=1000'))).status).toBe(400)
    expect((await POST(request(draft({ authorUserId: narratorId })))).status).toBe(400)
    expect((await listNotes(playerId)).total).toBe(0)
  })

  it('não expõe backlinks de contexto não autorizado', async () => {
    session.mockResolvedValue({ user: { sub: `test|outsider-${randomUUID()}` } })
    expect((await backlinks(new Request(`http://localhost/api/notes/links?targetType=EVENT&targetId=${eventId}`))).status).toBe(404)
  })
})
