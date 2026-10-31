import { beforeEach, expect, it, vi } from 'vitest'
import { randomUUID } from 'node:crypto'
import sharp from 'sharp'
const auth = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth0', () => ({ getSessionOrDev: auth }))
import { sql, DrizzleQueryError } from 'drizzle-orm'
import { npcFailure } from '@/lib/npc-http'
import { db } from '@/lib/db'
import { preparePostgresTest, createTestCampaign, createTestCharacter } from './postgres-test-helpers'
import { startGameSession, getCampaignGameSession } from '@/lib/game-sessions'
import { revealSheetItem, listSheetReveals } from '@/lib/sheet-records'
import { createNote, getNote, listNotes, updateNote, deleteNote } from '@/lib/notes'
import { prepareSheetUpload, confirmSheetUpload, readSheetMedia, editSheetMedia, listGlobalSheetMedia, type MediaStore } from '@/lib/sheet-media'
import { POST, GET } from '@/app/api/sessions/[id]/reveals/route'

let master: string, player: string, other: string, campaignId: string, sessionId: string
beforeEach(async () => {
  preparePostgresTest()
  master = `gm-${randomUUID()}`; player = `player-${randomUUID()}`; other = `other-${randomUUID()}`
  campaignId = (await createTestCampaign(master)).id
  await createTestCharacter(player, campaignId)
  sessionId = (await startGameSession(master, campaignId, { idempotencyKey: randomUUID() })).id
  auth.mockResolvedValue({ user: { sub: master } })
})
async function revelation() {
  const id = randomUUID()
  await revealSheetItem(master, sessionId, { action: 'CREATE', id, title: 'Pista', body: 'Conteúdo reservado' })
  return id
}
async function image(actorId: string, noteId: string) {
  const pending = await prepareSheetUpload(actorId, { subjectType: 'NOTE', subjectId: noteId, data: { title: 'Foto da pista', isPortrait: false, visibility: 'OWNER_ONLY' } }, false)
  const objects = new Map<string, Uint8Array>()
  objects.set(pending.pathname, await sharp({ create: { width: 64, height: 64, channels: 3, background: 'red' } }).png().toBuffer())
  const store: MediaStore = { read: async key => objects.get(key) ?? null, write: async (key, bytes) => { objects.set(key, bytes) }, remove: async key => { objects.delete(key) } }
  return { media: await confirmSheetUpload(actorId, pending.uploadId, store), store }
}
it('salva revelação como nota da sessão, oculta por padrão, e controla leitura e imagem no servidor', async () => {
  const id = await revelation(), { media, store } = await image(master, id)
  expect((await getNote(master, id)).reveal).toMatchObject({ revealed: false, sessionId })
  await expect(getNote(player, id)).rejects.toMatchObject({ status: 404 })
  await expect(readSheetMedia(player, media.id, store)).rejects.toMatchObject({ status: 404 })
  expect((await listSheetReveals(player, sessionId)).reveals).toHaveLength(0)
  await revealSheetItem(master, sessionId, { action: 'SHOW', id })
  expect((await getNote(player, id)).body).toBe('Conteúdo reservado')
  expect((await listNotes(player, { link: { targetType: 'SESSION', targetId: sessionId } })).notes.map(n => n.id)).toContain(id)
  expect((await readSheetMedia(player, media.id, store)).bytes.length).toBeGreaterThan(0)
  await expect(prepareSheetUpload(player, { subjectType: 'NOTE', subjectId: id, data: { title: 'Invasão', isPortrait: false, visibility: 'OWNER_ONLY' } }, false)).rejects.toMatchObject({ status: 403 })
  await revealSheetItem(master, sessionId, { action: 'HIDE', id })
  await expect(getNote(player, id)).rejects.toMatchObject({ status: 404 })
  await expect(readSheetMedia(player, media.id, store)).rejects.toMatchObject({ status: 404 })
  expect((await listNotes(player)).notes.map(n => n.id)).not.toContain(id)
})
it('preserva revelações e imagens após encerramento e impede compartilhamento ou exclusão genéricos', async () => {
  const id = await revelation()
  const { media, store } = await image(master, id)
  await revealSheetItem(master, sessionId, { action: 'SHOW', id })
  await db.execute(sql`UPDATE game_sessions SET status='CLOSED',ended_at=now() WHERE id=${sessionId}::uuid`)
  expect((await listSheetReveals(player, sessionId)).reveals.map(r => r.id)).toContain(id)
  expect((await readSheetMedia(player, media.id, store)).bytes.length).toBeGreaterThan(0)
  expect((await getCampaignGameSession(player, campaignId)).sessions.map(s => s.id)).toContain(sessionId)
  await expect(updateNote(master, id, { expectedRevision: 0, visibility: 'SHARED', recipientUserIds: [player] })).rejects.toMatchObject({ status: 422 })
  await expect(deleteNote(master, id, 0)).rejects.toMatchObject({ status: 409 })
  await revealSheetItem(master, sessionId, { action: 'HIDE', id })
  await expect(getNote(player, id)).rejects.toMatchObject({ status: 404 })
  await revealSheetItem(master, sessionId, { action: 'SHOW', id })
  expect((await getNote(player, id)).canEdit).toBe(false)
  await expect(revealSheetItem(master, sessionId, { action: 'CREATE', id: randomUUID(), title: 'Tarde', body: '' })).rejects.toMatchObject({ status: 403 })
})
it('imagens de nota privada ou compartilhada herdam ACL e revogação da nota', async () => {
  const note = await createNote(player, { title: 'Diário', body: '', campaignId, idempotencyKey: randomUUID() })
  const { media, store } = await image(player, note.id)
  await expect(readSheetMedia(master, media.id, store)).rejects.toMatchObject({ status: 404 })
  await updateNote(player, note.id, { expectedRevision: 0, visibility: 'SHARED', recipientUserIds: [master] })
  expect((await listGlobalSheetMedia(master, 'NOTE', note.id)).canEdit).toBe(false)
  expect((await readSheetMedia(master, media.id, store)).bytes.length).toBeGreaterThan(0)
  await expect(editSheetMedia(master, media.id, { action: 'DELETE', expectedRevision: 0 }, store)).rejects.toMatchObject({ status: 403 })
  await updateNote(player, note.id, { expectedRevision: 1, visibility: 'PRIVATE' })
  await expect(readSheetMedia(master, media.id, store)).rejects.toMatchObject({ status: 404 })
  await expect(readSheetMedia(other, media.id, store)).rejects.toMatchObject({ status: 404 })
})
it('rejeita IDOR entre sessões, jogador tentando revelar, UUID inválido e chave reutilizada', async () => {
  const id = await revelation(), second = (await createTestCampaign(master)).id
  const foreignSession = (await startGameSession(master, second, { idempotencyKey: randomUUID() })).id
  await expect(revealSheetItem(master, foreignSession, { action: 'SHOW', id })).rejects.toMatchObject({ status: 404 })
  await expect(revealSheetItem(player, sessionId, { action: 'SHOW', id })).rejects.toMatchObject({ status: 403 })
  await expect(listSheetReveals(other, sessionId)).rejects.toMatchObject({ status: 403 })
  await expect(revealSheetItem(master, sessionId, { action: 'HIDE', id: 'malicioso' })).rejects.toMatchObject({ status: 400 })
  await expect(revealSheetItem(master, sessionId, { action: 'CREATE', id, title: 'Outro', body: '' })).rejects.toMatchObject({ status: 409 })
  expect((await getNote(master, id)).title).toBe('Pista')
})

it('permite editar texto preservando o vínculo da revelação e rejeita dados maliciosos', async () => {
  const id = await revelation()
  await updateNote(master, id, { expectedRevision: 0, title: 'Pista revisada', links: [{ targetType: 'SESSION', targetId: sessionId }] })
  expect((await listSheetReveals(master, sessionId)).reveals[0].snapshot.title).toBe('Pista revisada')
  await expect(updateNote(master, id, { expectedRevision: 1, links: [] })).rejects.toMatchObject({ status: 422 })
  await expect(updateNote(master, id, { expectedRevision: 1, recipientUserIds: null })).rejects.toMatchObject({ status: 422 })
  await expect(prepareSheetUpload(master, { subjectType: 'NOTE', subjectId: id, data: { title: 'Não ampliar ACL', isPortrait: false, visibility: 'CAMPAIGN_VISIBLE' } }, false)).rejects.toMatchObject({ status: 422 })
})

it.each(['desvinculado', 'excluído'])('participante %s perde acesso às revelações e imagens', async state => {
  const id = await revelation(), { media, store } = await image(master, id)
  await revealSheetItem(master, sessionId, { action: 'SHOW', id })
  if (state === 'desvinculado') { await db.execute(sql`UPDATE characters SET campaign_id=NULL WHERE campaign_id=${campaignId}::uuid AND user_id=${player}`) }
  else { await db.execute(sql`UPDATE characters SET status='DELETED' WHERE campaign_id=${campaignId}::uuid AND user_id=${player}`) }
  await expect(getNote(player, id)).rejects.toMatchObject({ status: 404 })
  await expect(readSheetMedia(player, media.id, store)).rejects.toMatchObject({ status: 404 })
  await expect(listSheetReveals(player, sessionId)).rejects.toMatchObject({ status: 403 })
})
it('APIs exigem autenticação e origem, não retornam conteúdo oculto e recusam escalada de privilégio', async () => {
  const context = { params: Promise.resolve({ id: sessionId }) }, id = await revelation()
  const request = (body: object, origin = 'http://localhost') => new Request('http://localhost/api/sessions/x/reveals', { method: 'POST', headers: { 'content-type': 'application/json', origin }, body: JSON.stringify(body) })
  auth.mockResolvedValue(null)
  expect((await GET(new Request('http://localhost'), context)).status).toBe(401)
  auth.mockResolvedValue({ user: { sub: player } })
  expect((await POST(request({ action: 'SHOW', id }), context)).status).toBe(403)
  const response = await GET(new Request('http://localhost'), context)
  expect(JSON.stringify(await response.json())).not.toContain('Conteúdo reservado')
  auth.mockResolvedValue({ user: { sub: master } })
  expect((await POST(request({ action: 'SHOW', id }, 'https://evil.invalid'), context)).status).toBe(403)
})

it.each([['42P01', 503], ['42703', 503], ['23505', 409], ['23503', 409]])('classifica erro PostgreSQL %s encapsulado sem expor SQL ou parâmetros', async (code, status) => {
  const failure = npcFailure(new DrizzleQueryError('SQL PRIVADO', ['SEGREDO'], Object.assign(new Error('DETALHE INTERNO'), { code })))
  expect(failure.status).toBe(status)
  expect(await failure.text()).not.toMatch(/SQL PRIVADO|SEGREDO|DETALHE INTERNO/)
})
