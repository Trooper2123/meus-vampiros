import { randomUUID } from 'node:crypto'
import { get, put, del } from '@vercel/blob'
import sharp from 'sharp'
import { sql } from 'drizzle-orm'
import { db, ensureAllTables } from '@/lib/db'
import { CharacterCommandError } from '@/lib/character-commands'
import { configurePrivateBlobToken } from '@/lib/private-blob-token'

export const MAX_CAMPAIGN_COVER_BYTES = 5 * 1024 * 1024
function requireCampaignCoverStorage() {
  if (!configurePrivateBlobToken()) {
    throw new CharacterCommandError(503, 'Armazenamento da capa não configurado. Verifique o token do Vercel Blob.')
  }
}

const keyPattern = /^campaign-covers\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.webp$/i

export async function campaignCoverAccess(actorId: string, campaignId: string, manage = false) {
  await ensureAllTables()
  const result = await db.execute<{ cover_storage_key: string | null; owner: boolean }>(sql`
    SELECT cover_storage_key, master_user_id = ${actorId} AS owner
    FROM campaigns WHERE id = ${campaignId}::uuid
      AND (master_user_id = ${actorId}
        OR EXISTS(SELECT 1 FROM characters WHERE campaign_id = ${campaignId}::uuid AND user_id = ${actorId} AND status <> 'DELETED'))
  `)
  const row = result.rows[0]
  if (!row || (manage && !row.owner)) throw new CharacterCommandError(403, 'Acesso negado à capa da mesa.')
  return row
}

export async function readCampaignCover(key: string): Promise<Uint8Array | null> {
  if (!keyPattern.test(key)) throw new CharacterCommandError(500, 'Capa inválida.')
  requireCampaignCoverStorage()
  const result = await get(key, { access: 'private', useCache: false })
  if (!result || result.statusCode !== 200) return null
  if (result.blob.size > MAX_CAMPAIGN_COVER_BYTES) {
    await result.stream.cancel()
    throw new CharacterCommandError(413, 'Imagem acima do limite.')
  }
  const chunks: Uint8Array[] = []
  let total = 0
  const reader = result.stream.getReader()
  try {
    while (true) {
      const next = await reader.read()
      if (next.done) break
      total += next.value.byteLength
      if (total > MAX_CAMPAIGN_COVER_BYTES) throw new CharacterCommandError(413, 'Imagem acima do limite.')
      chunks.push(next.value)
    }
  } finally { await reader.cancel().catch(() => {}) }
  return Buffer.concat(chunks)
}

export async function sanitizeCampaignCover(request: Request) {
  const type = request.headers.get('content-type')?.split(';')[0]?.toLowerCase()
  if (!['image/jpeg','image/png','image/webp'].includes(type ?? '')) throw new CharacterCommandError(415, 'Envie JPEG, PNG ou WebP.')
  const length = Number(request.headers.get('content-length'))
  if (length > MAX_CAMPAIGN_COVER_BYTES) throw new CharacterCommandError(413, 'Imagem acima de 5 MB.')
  const reader = request.body?.getReader()
  if (!reader) throw new CharacterCommandError(400, 'Arquivo ausente.')
  const chunks: Uint8Array[] = []
  let total = 0
  try {
    while (true) {
      const next = await reader.read()
      if (next.done) break
      total += next.value.byteLength
      if (total > MAX_CAMPAIGN_COVER_BYTES) throw new CharacterCommandError(413, 'Imagem acima de 5 MB.')
      chunks.push(next.value)
    }
  } finally { await reader.cancel().catch(() => {}) }
  if (!total) throw new CharacterCommandError(400, 'Arquivo vazio.')
  try {
    const image = sharp(Buffer.concat(chunks), { limitInputPixels: 32000000, animated: false })
    const meta = await image.metadata()
    if (!['jpeg','png','webp'].includes(meta.format ?? '') || !meta.width || !meta.height || meta.width < 32 || meta.height < 32 || meta.width > 8192 || meta.height > 8192) throw new Error('Invalid image')
    return await image.rotate().resize({ width: 1600, height: 1000, fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toBuffer()
  } catch { throw new CharacterCommandError(422, 'Imagem inválida ou não suportada.') }
}

export async function replaceCampaignCover(actorId: string, campaignId: string, data: Uint8Array) {
  requireCampaignCoverStorage()
  const key = `campaign-covers/${campaignId}/${randomUUID()}.webp`
  await put(key, Buffer.from(data), { access: 'private', contentType: 'image/webp', addRandomSuffix: false, allowOverwrite: false })
  try {
    const updated = await db.execute<{ cover_storage_key: string | null }>(sql`
      UPDATE campaigns SET cover_storage_key = ${key}, cover_updated_at = now(), updated_at = now()
      WHERE id = ${campaignId}::uuid AND master_user_id = ${actorId}
      RETURNING cover_storage_key
    `)
    if (!updated.rows.length) throw new CharacterCommandError(403, 'Acesso negado.')
  } catch (error) {
    await del(key).catch(() => {})
    throw error
  }
  // Older objects can be garbage-collected separately; never risk the current cover.
  return key
}

export async function removeCampaignCover(actorId: string, campaignId: string) {
  await db.execute(sql`
    UPDATE campaigns SET cover_storage_key = NULL, cover_updated_at = now(), updated_at = now()
    WHERE id = ${campaignId}::uuid AND master_user_id = ${actorId}
  `)
}
