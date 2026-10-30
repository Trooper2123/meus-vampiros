import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { randomUUID } from 'node:crypto'
import sharp from 'sharp'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { createTestCampaign, createTestCharacter, preparePostgresTest } from './postgres-test-helpers'
import { createNpc } from '@/lib/npc-store'
import { NPC_TEMPLATES } from '@/lib/npc-domain'
import { authorizeSheetUpload, confirmSheetUpload, editSheetMedia, prepareSheetUpload, readSheetMedia, sanitizeSheetImage, type MediaStore } from '@/lib/sheet-media'
import type { SubjectType } from '@/lib/sheet-access'

let owner: string, outsider: string, characterId: string, npcId: string
let bytes: Buffer
beforeEach(async () => {
  preparePostgresTest()
  owner = `image-owner-${randomUUID()}`; outsider = `image-other-${randomUUID()}`
  characterId = (await createTestCharacter(owner, null)).id
  npcId = String((await createNpc(owner, { data: structuredClone(NPC_TEMPLATES[0].data), idempotencyKey: randomUUID() })).id)
  bytes = await sharp({ create: { width: 64, height: 64, channels: 3, background: 'red' } }).png().toBuffer()
})
afterEach(() => vi.restoreAllMocks())

function memoryStore() {
  const objects = new Map<string, Uint8Array>()
  const store: MediaStore = {
    read: vi.fn(async key => objects.get(key) ?? null),
    write: vi.fn(async (key, data) => { objects.set(key, data) }),
    remove: vi.fn(async key => { objects.delete(key) }),
  }
  return { objects, store }
}
const metadata = { title: 'Retrato', isPortrait: true, visibility: 'OWNER_ONLY', positionX: 25, positionY: 75 }
function prepare(type: SubjectType, id: string) {
  return prepareSheetUpload(owner, { subjectType: type, subjectId: id, data: metadata }, false)
}
async function uploaded(type: SubjectType, id: string) {
  const pending = await prepare(type, id), storage = memoryStore()
  storage.objects.set(pending.pathname, bytes)
  const image = await confirmSheetUpload(owner, pending.uploadId, storage.store)
  return { ...storage, image, pending }
}

it.each(['CHARACTER', 'NPC'] as const)('envia, confirma sem duplicar e revoga retrato de %s', async type => {
  const id = type === 'CHARACTER' ? characterId : npcId
  const { store, objects, image, pending } = await uploaded(type, id)
  expect(await confirmSheetUpload(owner, image.id, store)).toEqual(image)
  expect(store.write).toHaveBeenCalledOnce()
  expect(objects.has(pending.pathname)).toBe(false)
  expect(await sharp((await readSheetMedia(owner, image.id, store)).bytes).metadata()).toMatchObject({ format: 'webp', width: 64, height: 64 })
  expect(image).toMatchObject({ positionX: 25, positionY: 75 })
  expect(image).not.toHaveProperty('storage_key')
  const removed = await editSheetMedia(owner, image.id, { action: 'DELETE', expectedRevision: 0 }, { ...store, remove: async () => { throw new Error('offline') } })
  expect(removed).toMatchObject({ ok: true, storageDeletionPending: true })
  await expect(readSheetMedia(owner, image.id, store)).rejects.toMatchObject({ status: 404 })
})

it.each(['CHARACTER', 'NPC'] as const)('rollback preserva o retrato de %s e permite repetir a substituição', async type => {
  const id = type === 'CHARACTER' ? characterId : npcId
  const { store, objects, image } = await uploaded(type, id)
  const replacement = await prepare(type, id)
  objects.set(replacement.pathname, bytes)
  vi.mocked(store.remove).mockClear()
  const transaction = db.transaction.bind(db)
  vi.spyOn(db, 'transaction').mockImplementationOnce(callback => transaction(async tx => {
    await callback(tx)
    throw new Error('Falha ao confirmar transação')
  }))
  await expect(confirmSheetUpload(owner, replacement.uploadId, store)).rejects.toThrow('Falha ao confirmar transação')
  expect(store.remove).not.toHaveBeenCalled()
  expect(objects.has(`sheet-images/${image.id}.webp`)).toBe(true)
  expect(objects.has(replacement.pathname)).toBe(true)
  expect((await readSheetMedia(owner, image.id, store)).bytes.length).toBeGreaterThan(0)
  const confirmed = await confirmSheetUpload(owner, replacement.uploadId, store)
  expect(confirmed.id).toBe(replacement.uploadId)
  expect(objects.has(`sheet-images/${image.id}.webp`)).toBe(false)
  await expect(readSheetMedia(owner, image.id, store)).rejects.toMatchObject({ status: 404 })
})

it.each(['CHARACTER', 'NPC'] as const)('nega preparação, confirmação e leitura por terceiro para %s', async type => {
  const id = type === 'CHARACTER' ? characterId : npcId
  const { store, image, pending } = await uploaded(type, id)
  await expect(prepareSheetUpload(outsider, { subjectType: type, subjectId: id, data: metadata }, false)).rejects.toMatchObject({ status: 403 })
  await expect(authorizeSheetUpload(outsider, pending.uploadId)).rejects.toMatchObject({ status: 403 })
  await expect(confirmSheetUpload(outsider, pending.uploadId, store)).rejects.toMatchObject({ status: 403 })
  vi.mocked(store.read).mockClear()
  await expect(readSheetMedia(outsider, image.id, store)).rejects.toMatchObject({ status: 403 })
  expect(store.read).not.toHaveBeenCalled()
})

it('não permite transformar retrato global em imagem inacessível pela galeria', async () => {
  const { store, image } = await uploaded('CHARACTER', characterId)
  await expect(editSheetMedia(owner, image.id, { action: 'EDIT', expectedRevision: 0, data: { ...metadata, isPortrait: false } }, store)).rejects.toMatchObject({ status: 422 })
  expect((await readSheetMedia(owner, image.id, store)).bytes.length).toBeGreaterThan(0)
})

it('substituição na mesa preserva a imagem anterior na galeria', async () => {
  const campaign = await createTestCampaign(owner)
  const linked = await createTestCharacter(owner, campaign.id)
  const input = { subjectType: 'CHARACTER', subjectId: linked.id, campaignId: campaign.id, data: metadata }
  const { store, objects } = memoryStore()
  const first = await prepareSheetUpload(owner, input, false)
  objects.set(first.pathname, bytes)
  const old = await confirmSheetUpload(owner, first.uploadId, store)
  const next = await prepareSheetUpload(owner, input, false)
  objects.set(next.pathname, bytes)
  await confirmSheetUpload(owner, next.uploadId, store)
  expect(objects.has(`sheet-images/${old.id}.webp`)).toBe(true)
  expect((await readSheetMedia(owner, old.id, store)).bytes.length).toBeGreaterThan(0)
  const stored = await db.execute<{ is_portrait: boolean; deleted_at: Date | null }>(sql`SELECT is_portrait,deleted_at FROM sheet_media WHERE id=${old.id}::uuid`)
  expect(stored.rows[0]).toEqual({ is_portrait: false, deleted_at: null })
})

it('revalida a quota na confirmação mesmo quando a reserva foi criada antes do limite', async () => {
  const campaign = await createTestCampaign(owner)
  const linked = await createTestCharacter(owner, campaign.id)
  const pending = await prepareSheetUpload(owner, { subjectType: 'CHARACTER', subjectId: linked.id, campaignId: campaign.id, data: { ...metadata, isPortrait: false } }, false)
  const contexts = await db.execute<{ context_id: string }>(sql`SELECT context_id FROM sheet_upload_requests WHERE id=${pending.uploadId}::uuid`)
  await db.execute(sql`INSERT INTO sheet_media (id,context_id,subject_type,subject_id,storage_key,mime_type,size_bytes,width,height,title,author_id,visibility) SELECT gen_random_uuid(),${contexts.rows[0].context_id}::uuid,'CHARACTER',${linked.id}::uuid,${randomUUID()}||'-'||n,'image/webp',1,64,64,'Fixture de limite',${owner},'OWNER_ONLY' FROM generate_series(1,100) AS n`)
  const { store, objects } = memoryStore()
  objects.set(pending.pathname, bytes)
  await expect(confirmSheetUpload(owner, pending.uploadId, store)).rejects.toMatchObject({ status: 422 })
  expect(store.write).not.toHaveBeenCalled()
  expect(store.remove).not.toHaveBeenCalled()
})

it.each(['jpeg', 'png', 'webp'] as const)('valida %s real e remove metadados ao reencodar', async format => {
  const input = await sharp(bytes).toFormat(format).withMetadata().toBuffer()
  const image = await sanitizeSheetImage(input)
  const result = await sharp(image.bytes).metadata()
  expect(result.format).toBe('webp')
  expect(result.exif).toBeUndefined()
})

it('rejeita SVG, arquivo falso, dimensões pequenas e tamanho excessivo', async () => {
  for (const input of [Buffer.from('<svg onload="alert(1)"></svg>'), Buffer.from('fake'), await sharp(bytes).resize(16, 16).toBuffer()]) {
    await expect(sanitizeSheetImage(input)).rejects.toMatchObject({ status: 422 })
  }
  await expect(sanitizeSheetImage(Buffer.alloc(5 * 1024 * 1024 + 1))).rejects.toMatchObject({ status: 413 })
})
