import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  devGetCharactersForUser,
  devGetCharactersForCampaign,
  devGetCharacterById,
  devCreateCharacter,
  devUpdateCharacter,
  devUpdateCharacterXp,
} from '@/lib/dev-db'

const isDev = process.env.NODE_ENV !== 'production' && !process.env.DATABASE_URL

/**
 * Converte o formato legado de disciplinas (objeto nomeado) para o formato atual (array).
 * Fichas criadas antes da refatoração do item 7 do plano armazenam disciplinas como:
 *   { 'Animalismo': { level: 2, powers: [...] }, ... }
 * O novo formato esperado pelo frontend é:
 *   [{ id: 'disciplina-1', name: 'Animalismo', level: 2, powers: [...] }]
 * Esta função é idempotente — se já for um array, retorna sem modificar.
 */
export function normalizeDisciplines(data: Record<string, unknown>): Record<string, unknown> {
  const raw = data['disciplinas']
  if (!raw || Array.isArray(raw)) return data
  if (typeof raw !== 'object') return data

  const legacyObj = raw as Record<string, unknown>
  const converted = Object.entries(legacyObj).map(([name, val], index) => {
    const entry = (typeof val === 'object' && val !== null ? val : {}) as Record<string, unknown>
    return {
      id: `compat-${index + 1}-${name.toLowerCase().replace(/\s+/g, '-')}`,
      name,
      level: typeof entry['level'] === 'number' ? entry['level'] : 0,
      powers: Array.isArray(entry['powers']) ? entry['powers'] : [],
    }
  })

  return { ...data, disciplinas: converted }
}

export type CharacterSummary = {
  id: string
  name: string
  concept: string | null
  clan: string | null
  generation: string | null
  status: string
  updatedAt: string
  campaignId: string | null
  campaignName: string | null
  campaignTheme: string | null
  campaignPrincipios: string | null
  spentXp: string | null
  totalXp: string | null
}

export async function getCharactersForUser(userId: string): Promise<CharacterSummary[]> {
  if (isDev) return devGetCharactersForUser(userId)

  const result = await db.execute<{
    id: string
    name: string
    concept: string | null
    clan: string | null
    generation: string | null
    status: string
    updated_at: Date
    campaign_id: string | null
    campaign_name: string | null
    campaign_theme: string | null
    campaign_principios: string | null
    spent_xp: string | null
    total_xp: string | null
  }>(sql`
    SELECT ch.id, ch.name, ch.concept, ch.clan, ch.generation, ch.status, ch.updated_at,
           ch.campaign_id, c.name AS campaign_name, c.theme AS campaign_theme, c.principios AS campaign_principios,
           ch.spent_xp, ch.total_xp
    FROM characters ch
    LEFT JOIN campaigns c ON c.id = ch.campaign_id
    WHERE ch.user_id = ${userId}
    ORDER BY ch.updated_at DESC
  `)

  return result.rows.map((character) => ({
    id: character.id,
    name: character.name,
    concept: character.concept,
    clan: character.clan,
    generation: character.generation,
    status: character.status,
    updatedAt: character.updated_at && character.updated_at !== '' ? (character.updated_at instanceof Date ? character.updated_at.toISOString() : new Date(character.updated_at).toISOString()) : null,
    campaignId: character.campaign_id,
    campaignName: character.campaign_name,
    campaignTheme: character.campaign_theme,
    campaignPrincipios: character.campaign_principios,
    spentXp: character.spent_xp,
    totalXp: character.total_xp,
  }))
}

export async function getCharactersForCampaign(campaignId: string) {
  if (isDev) return devGetCharactersForCampaign(campaignId)

  const result = await db.execute<{
    id: string
    name: string
    concept: string | null
    clan: string | null
    generation: string | null
    spent_xp: string | null
    total_xp: string | null
  }>(sql`
    SELECT id, name, concept, clan, generation, spent_xp, total_xp
    FROM characters
    WHERE campaign_id = ${campaignId}::uuid
    ORDER BY name ASC
  `)

  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    concept: row.concept,
    clan: row.clan,
    generation: row.generation,
    status: 'Ativo',
    campaignId,
    spentXp: row.spent_xp ? Number.parseInt(row.spent_xp, 10) : 0,
    totalXp: row.total_xp ? Number.parseInt(row.total_xp, 10) : 0,
  }))
}

export async function updateCharacterXp(characterId: string, totalXp: number) {
  if (isDev) return devUpdateCharacterXp(characterId, totalXp)

  await db.execute(sql`
    UPDATE characters
    SET total_xp = ${totalXp}, updated_at = NOW()
    WHERE id = ${characterId}::uuid
  `)
  return { ok: true }
}

export async function getCharacterById(id: string, userId: string) {
  if (isDev) return devGetCharacterById(id, userId)

  const result = await db.execute<{ id: string; name: string; data: unknown; campaign_id: string | null }>(sql`
    SELECT id, name, data, campaign_id FROM characters WHERE id = ${id}::uuid AND user_id = ${userId}
  `)
  const row = result.rows[0]
  if (!row) return null
  const normalizedData = normalizeDisciplines(
    (row.data && typeof row.data === 'object' ? row.data : {}) as Record<string, unknown>
  )
  return { id: row.id, name: row.name ?? '', data: normalizedData, campaignId: row.campaign_id, campaign: null }
}

export async function createCharacter(
  userId: string,
  payload: { name?: string; data?: Record<string, unknown>; campaignId?: string | null }
) {
  if (isDev) return devCreateCharacter(userId, payload)

  const { name, data, campaignId } = payload
  const result = await db.execute<{ id: string }>(sql`
    INSERT INTO characters (user_id, name, concept, clan, generation, data, campaign_id)
    VALUES (${userId}, ${name}, ${data?.conceito ?? null}, ${data?.cla ?? null}, ${data?.geracao ?? null}, ${JSON.stringify(data ?? {})}::jsonb, ${campaignId ?? null}::uuid)
    RETURNING id
  `)
  return { id: result.rows[0]?.id }
}

export async function updateCharacter(
  id: string,
  userId: string,
  payload: { name?: string; data?: Record<string, unknown>; campaignId?: string | null | undefined }
) {
  if (isDev) return devUpdateCharacter(id, userId, payload)

  const { name, data, campaignId } = payload

  if (name === undefined && data === undefined) {
    await db.execute(sql`
      UPDATE characters SET campaign_id = ${campaignId ?? null}::uuid, updated_at = NOW()
      WHERE id = ${id}::uuid AND user_id = ${userId}
    `)
    return { ok: true, campaignId }
  }

  if (campaignId !== undefined) {
    await db.execute(sql`
      UPDATE characters
      SET name = ${name}, concept = ${data?.conceito ?? null}, clan = ${data?.cla ?? null}, generation = ${data?.geracao ?? null},
          data = ${JSON.stringify(data ?? {})}::jsonb, campaign_id = ${campaignId ?? null}::uuid, updated_at = NOW()
      WHERE id = ${id}::uuid AND user_id = ${userId}
    `)
    return { ok: true, campaignId }
  }

  await db.execute(sql`
    UPDATE characters
    SET name = ${name}, concept = ${data?.conceito ?? null}, clan = ${data?.cla ?? null}, generation = ${data?.geracao ?? null},
        data = ${JSON.stringify(data ?? {})}::jsonb, updated_at = NOW()
    WHERE id = ${id}::uuid AND user_id = ${userId}
  `)
  return { ok: true }
}
