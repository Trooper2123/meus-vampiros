import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  devGetCharactersForUser,
  devGetCharacterById,
  devCreateCharacter,
  devUpdateCharacter,
} from '@/lib/dev-db'

const isDev = process.env.NODE_ENV !== 'production' && !process.env.DATABASE_URL

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
    updatedAt: character.updated_at.toISOString(),
    campaignId: character.campaign_id,
    campaignName: character.campaign_name,
    campaignTheme: character.campaign_theme,
    campaignPrincipios: character.campaign_principios,
    spentXp: character.spent_xp,
    totalXp: character.total_xp,
  }))
}

export async function getCharacterById(id: string, userId: string) {
  if (isDev) return devGetCharacterById(id, userId)

  const result = await db.execute<{ id: string; name: string; data: unknown; campaign_id: string | null }>(sql`
    SELECT id, name, data, campaign_id FROM characters WHERE id = ${id}::uuid AND user_id = ${userId}
  `)
  const row = result.rows[0]
  if (!row) return null
  return { id: row.id, name: row.name, data: row.data, campaignId: row.campaign_id, campaign: null }
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
