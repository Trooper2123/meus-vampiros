import { beforeEach, expect, it, vi } from 'vitest'
import { randomUUID } from 'node:crypto'
import sharp from 'sharp'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { preparePostgresTest, createTestCampaign, createTestCharacter } from './postgres-test-helpers'
import { deleteCharacter, duplicateCharacter, getCharacterById, getCharacterForViewer, getCharactersForCampaign, getCharactersForUser, updateCharacter } from '@/lib/characters'
import { getCommandCharacter } from '@/lib/character-commands'
import { closeGameSession, getCampaignGameSession, startGameSession } from '@/lib/game-sessions'
import { isUserInCampaign } from '@/lib/availability'
import { getSheetData, sheetRecordCommand } from '@/lib/sheet-records'
import { createNote, getNote } from '@/lib/notes'
import { confirmSheetUpload, prepareSheetUpload, readSheetMedia, type MediaStore } from '@/lib/sheet-media'

const auth = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth0', () => ({ getSessionOrDev: auth }))
import { DELETE, GET, PUT } from '@/app/api/characters/route'
import { PATCH } from '@/app/api/characters/[id]/status/route'

let owner: string, master: string, outsider: string, campaignId: string, id: string
const name = 'Ficha para excluir'
const input = () => ({ confirmed: true, confirmationName: name, expectedRevision: 0, idempotencyKey: randomUUID() })
const request = (body: object = { id, ...input() }, headers: Record<string, string> = {}) => new Request('http://localhost/api/characters', { method: 'DELETE', headers: { 'content-type': 'application/json', origin: 'http://localhost', ...headers }, body: JSON.stringify(body) })
beforeEach(async () => {
  preparePostgresTest()
  owner = `owner-${randomUUID()}`; master = `master-${randomUUID()}`; outsider = `other-${randomUUID()}`
  campaignId = (await createTestCampaign(master)).id
  id = (await createTestCharacter(owner, campaignId, name, { 'habilidade-briga': 2 })).id
  auth.mockResolvedValue({ user: { sub: owner } })
})

it('exige autenticação e rejeita origem cruzada', async () => {
  auth.mockResolvedValue(null)
  expect((await DELETE(request())).status).toBe(401)
  auth.mockResolvedValue({ user: { sub: owner } })
  expect((await DELETE(request(undefined, { origin: 'https://outro.site' }))).status).toBe(403)
  expect((await DELETE(request(undefined, { 'sec-fetch-site': 'cross-site' }))).status).toBe(403)
  expect((await DELETE(request(undefined, { 'content-type': 'text/plain' }))).status).toBe(400)
})
it.each(['master', 'outsider'])('%s não pode excluir ficha de outro proprietário', async role => {
  auth.mockResolvedValue({ user: { sub: role === 'master' ? master : outsider } })
  expect((await DELETE(request())).status).toBe(403)
  expect(await getCommandCharacter(id)).not.toBeNull()
})
it.each([
  { confirmed: false }, { confirmed: 'true' }, { confirmationName: '' }, { confirmationName: 'Outro nome' },
  { expectedRevision: -1 }, { expectedRevision: 0.5 }, { idempotencyKey: 'invalid' }, { id: "' OR 1=1" }, { force: true },
])('rejeita confirmação ou parâmetros inválidos %j', async override => {
  const response = await DELETE(request({ id, ...input(), ...override }))
  expect([400, 422]).toContain(response.status)
  expect((await getCommandCharacter(id))?.revision).toBe(0)
})
it('exige revisão atual, confirmação presente e ficha existente', async () => {
  expect((await DELETE(request({ id, ...input(), expectedRevision: 1 }))).status).toBe(409)
  expect((await DELETE(request({ id }))).status).toBe(400)
  expect((await DELETE(request({ id: randomUUID(), ...input() }))).status).toBe(404)
})
it('bloqueia sessão ativa e permite excluir depois do encerramento', async () => {
  const session = await startGameSession(master, campaignId, { idempotencyKey: randomUUID() })
  const response = await DELETE(request())
  expect(response.status).toBe(409)
  expect((await response.json()).error).toContain('sessão ativa')
  expect((await getCommandCharacter(id))?.campaignId).toBe(campaignId)
  await closeGameSession(master, session.id, { expectedRevision: session.revision, idempotencyKey: randomUUID() })
  expect((await DELETE(request())).status).toBe(200)
})
it('exclui logicamente, audita uma vez e permite retry com a mesma chave', async () => {
  await db.execute(sql`INSERT INTO character_ledger_events(character_id,event_type,origin,payload,created_by_user_id) VALUES(${id}::uuid,'HISTORY','USER_ACTION','{"preserved":true}'::jsonb,${owner})`)
  const body = { id, ...input() }
  const first = await DELETE(request(body)), retry = await DELETE(request(body))
  expect(first.status).toBe(200); expect(retry.status).toBe(200)
  expect(await first.json()).toEqual(await retry.json())
  const stored = await db.execute<{ status: string; campaign_id: string | null; data: object; game_state: { deletion: object } }>(sql`SELECT status,campaign_id,data,game_state FROM characters WHERE id=${id}::uuid`)
  expect(stored.rows[0]).toMatchObject({ status: 'DELETED', campaign_id: null, data: { 'habilidade-briga': 2 }, game_state: { deletion: { deletedBy: owner, previousCampaignId: campaignId, previousStatus: 'DRAFT' } } })
  const events = await db.execute(sql`SELECT id FROM character_ledger_events WHERE character_id=${id}::uuid AND event_type='CHARACTER_DELETED'`)
  expect(events.rows).toHaveLength(1)
  const history = await db.execute(sql`SELECT id FROM character_ledger_events WHERE character_id=${id}::uuid AND event_type='HISTORY'`)
  expect(history.rows).toHaveLength(1)
  expect((await DELETE(request())).status).toBe(404)
})
it('bloqueia exclusão durante convocação mesmo sem sessão iniciada', async () => {
  await db.execute(sql`UPDATE campaigns SET call_active=true WHERE id=${campaignId}::uuid`)
  expect((await DELETE(request())).status).toBe(409)
  expect(await isUserInCampaign(campaignId, owner)).toBe(true)
})
it('ficha independente pode ser excluída e NPC exige seu gerenciamento próprio', async () => {
  const independent = await createTestCharacter(owner, null, name)
  expect(await deleteCharacter(independent.id, owner, input())).toMatchObject({ deleted: true })
  await db.execute(sql`UPDATE characters SET character_type='VAMPIRE_NPC' WHERE id=${id}::uuid`)
  expect((await DELETE(request())).status).toBe(409)
})
it('revoga listagens, participação, leitura, edição, duplicação e restauração', async () => {
  await deleteCharacter(id, owner, input())
  expect(await getCharactersForUser(owner)).toEqual([])
  expect(await getCharactersForCampaign(campaignId)).toEqual([])
  expect(await isUserInCampaign(campaignId, owner)).toBe(false)
  expect(await getCharacterById(id, owner)).toBeNull()
  expect(await getCharacterForViewer(id, master)).toBeNull()
  expect(await duplicateCharacter(id, owner)).toBeNull()
  expect(await updateCharacter(id, owner, { name: 'Restaurar' })).toBeNull()
  expect((await GET(new Request(`http://localhost/api/characters?id=${id}`))).status).toBe(404)
  expect((await PUT(new Request('http://localhost', { method: 'PUT', body: JSON.stringify({ id, expectedRevision: 1, data: { status: 'DRAFT' } }) }))).status).toBe(403)
  expect((await PATCH(new Request('http://localhost', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'DRAFT', expectedRevision: 1 }) }), { params: Promise.resolve({ id }) })).status).toBe(404)
  await expect(getCampaignGameSession(owner, campaignId)).rejects.toMatchObject({ status: 403 })
})
it('outra ficha própria mantém a participação autorizada na mesa', async () => {
  const other = await createTestCharacter(owner, campaignId, 'Outra ficha')
  await deleteCharacter(id, owner, input())
  expect(await isUserInCampaign(campaignId, owner)).toBe(true)
  expect((await getCharactersForUser(owner)).map(row => row.id)).toEqual([other.id])
})
it('preserva notas, contexto narrativo, relações e mídias sem expor a ficha excluída', async () => {
  const record = await sheetRecordCommand(master, campaignId, 'CHARACTER', id, { action: 'CREATE_RECORD', data: { section: 'PROFILE', title: 'Privado', body: 'Histórico', visibility: 'GM_ONLY', fields: {} } })
  const related = await createTestCharacter(outsider, campaignId, 'Contato')
  const relation = await sheetRecordCommand(master, campaignId, 'CHARACTER', id, { action: 'CREATE_RELATION', target: { subjectType: 'CHARACTER', subjectId: related.id }, relationType: 'CONTACT', reciprocal: true, description: 'Vínculo preservado', visibility: 'GM_ONLY' })
  const note = await createNote(owner, { title: 'Nota do autor', body: 'Preservada', campaignId, visibility: 'PRIVATE', recipientUserIds: [], links: [{ targetType: 'CHARACTER', targetId: id }], idempotencyKey: randomUUID() })
  const files = new Map<string, Uint8Array>()
  const store: MediaStore = { read: async key => files.get(key) ?? null, write: async (key, bytes) => { files.set(key, bytes) }, remove: async key => { files.delete(key) } }
  const upload = await prepareSheetUpload(owner, { subjectType: 'CHARACTER', subjectId: id, campaignId: null, data: { title: 'Retrato', isPortrait: true, visibility: 'OWNER_ONLY' } }, false)
  files.set(upload.pathname, await sharp({ create: { width: 32, height: 32, channels: 3, background: 'red' } }).png().toBuffer())
  const media = await confirmSheetUpload(owner, upload.uploadId, store)
  await deleteCharacter(id, owner, input())
  const rows = await db.execute(sql`SELECT id FROM sheet_records WHERE id=${String(record.id)}::uuid`)
  expect(rows.rows).toHaveLength(1)
  const relations = await db.execute(sql`SELECT id FROM sheet_relations WHERE id=${String(relation.id)}::uuid`)
  expect(relations.rows).toHaveLength(1)
  expect((await getSheetData(master, campaignId, 'CHARACTER', related.id)).relations).toEqual([])
  const preserved = await getNote(owner, String(note.id))
  expect(preserved).toMatchObject({ body: 'Preservada', links: [] })
  expect(files.size).toBe(1)
  await expect(readSheetMedia(owner, media.id, store)).rejects.toMatchObject({ status: 404 })
  await expect(getSheetData(master, campaignId, 'CHARACTER', id)).rejects.toMatchObject({ status: 404 })
})
it('serializa exclusão com o lock usado no início da sessão', async () => {
  let release!: () => void, locked!: () => void
  const acquired = new Promise<void>(resolve => { locked = resolve })
  const wait = new Promise<void>(resolve => { release = resolve })
  const starting = db.transaction(async tx => {
    await tx.execute(sql`SELECT id FROM campaigns WHERE id=${campaignId}::uuid FOR SHARE`)
    locked(); await wait
    await tx.execute(sql`INSERT INTO game_sessions(campaign_id,started_by_user_id,start_idempotency_key,status) VALUES(${campaignId}::uuid,${master},${randomUUID()}::uuid,'ACTIVE')`)
  })
  await acquired
  const deleting = deleteCharacter(id, owner, input()).catch(error => error)
  let blocked = false
  try {
    for (let attempt = 0; attempt < 100; attempt++) {
      const locks = await db.execute<{ waiting: boolean }>(sql`SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE wait_event_type='Lock' AND query LIKE ${'%master_user_id FROM campaigns%FOR UPDATE%'}) AS waiting`)
      if (locks.rows[0].waiting) { blocked = true; break }
      await new Promise(resolve => setTimeout(resolve, 10))
    }
  } finally { release() }
  await starting
  expect(blocked).toBe(true)
  expect(await deleting).toMatchObject({ status: 409 })
  expect((await getCommandCharacter(id))?.campaignId).toBe(campaignId)
})
