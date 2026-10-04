import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  devGetPossessionsForCharacter,
  devGetPossessionsForCampaign,
  devCreatePossession,
  devUpdatePossessionStatus,
} from '@/lib/dev-db'

const isDev = process.env.NODE_ENV !== 'production' && !process.env.DATABASE_URL

export type Possession = {
  id: string
  characterId: string
  campaignId: string | null
  label: string
  description: string | null
  origin: 'player' | 'master'
  status: 'pendente' | 'aprovado' | 'reprovado'
  masterComment: string | null
  createdAt: string
  updatedAt: string
}

export async function getPossessionsForCharacter(characterId: string): Promise<Possession[]> {
  if (isDev) {
    const list = devGetPossessionsForCharacter(characterId)
    return list.map((p) => ({
      ...p,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }))
  }

  const result = await db.execute<{
    id: string
    character_id: string
    campaign_id: string | null
    label: string
    description: string | null
    origin: 'player' | 'master'
    status: 'pendente' | 'aprovado' | 'reprovado'
    master_comment: string | null
    created_at: Date
    updated_at: Date
  }>(sql`
    SELECT id, character_id, campaign_id, label, description, origin, status, master_comment, created_at, updated_at
    FROM character_possessions
    WHERE character_id = ${characterId}::uuid
    ORDER BY created_at ASC
  `)

  return result.rows.map((row) => ({
    id: row.id,
    characterId: row.character_id,
    campaignId: row.campaign_id,
    label: row.label,
    description: row.description,
    origin: row.origin,
    status: row.status,
    masterComment: row.master_comment,
    createdAt: row.created_at && row.created_at !== '' ? (row.created_at instanceof Date ? row.created_at.toISOString() : new Date(row.created_at).toISOString()) : null,
    updatedAt: row.updated_at && row.updated_at !== '' ? (row.updated_at instanceof Date ? row.updated_at.toISOString() : new Date(row.updated_at).toISOString()) : null,
  }))
}

export async function getPossessionsForCampaign(campaignId: string): Promise<Possession[]> {
  if (isDev) {
    const list = devGetPossessionsForCampaign(campaignId)
    return list.map((p) => ({
      ...p,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }))
  }

  const result = await db.execute<{
    id: string
    character_id: string
    campaign_id: string | null
    label: string
    description: string | null
    origin: 'player' | 'master'
    status: 'pendente' | 'aprovado' | 'reprovado'
    master_comment: string | null
    created_at: Date
    updated_at: Date
  }>(sql`
    SELECT id, character_id, campaign_id, label, description, origin, status, master_comment, created_at, updated_at
    FROM character_possessions
    WHERE campaign_id = ${campaignId}::uuid
    ORDER BY created_at ASC
  `)

  return result.rows.map((row) => ({
    id: row.id,
    characterId: row.character_id,
    campaignId: row.campaign_id,
    label: row.label,
    description: row.description,
    origin: row.origin,
    status: row.status,
    masterComment: row.master_comment,
    createdAt: row.created_at && row.created_at !== '' ? (row.created_at instanceof Date ? row.created_at.toISOString() : new Date(row.created_at).toISOString()) : null,
    updatedAt: row.updated_at && row.updated_at !== '' ? (row.updated_at instanceof Date ? row.updated_at.toISOString() : new Date(row.updated_at).toISOString()) : null,
  }))
}

export async function createPossession(
  characterId: string,
  input: { label: string; description?: string | null; origin?: 'player' | 'master'; campaignId?: string | null }
): Promise<Possession> {
  if (isDev) {
    const p = devCreatePossession(characterId, input)
    return {
      ...p,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }
  }

  const status = input.origin === 'master' ? 'aprovado' : 'pendente'
  const origin = input.origin ?? 'player'
  const result = await db.execute<{
    id: string
    character_id: string
    campaign_id: string | null
    label: string
    description: string | null
    origin: 'player' | 'master'
    status: 'pendente' | 'aprovado' | 'reprovado'
    master_comment: string | null
    created_at: Date
    updated_at: Date
  }>(sql`
    INSERT INTO character_possessions (character_id, campaign_id, label, description, origin, status)
    VALUES (${characterId}::uuid, ${input.campaignId ?? null}::uuid, ${input.label}, ${input.description ?? null}, ${origin}, ${status})
    RETURNING id, character_id, campaign_id, label, description, origin, status, master_comment, created_at, updated_at
  `)

  const row = result.rows[0]
  return {
    id: row.id,
    characterId: row.character_id,
    campaignId: row.campaign_id,
    label: row.label,
    description: row.description,
    origin: row.origin,
    status: row.status,
    masterComment: row.master_comment,
    createdAt: row.created_at && row.created_at !== '' ? (row.created_at instanceof Date ? row.created_at.toISOString() : new Date(row.created_at).toISOString()) : null,
    updatedAt: row.updated_at && row.updated_at !== '' ? (row.updated_at instanceof Date ? row.updated_at.toISOString() : new Date(row.updated_at).toISOString()) : null,
  }
}

export async function updatePossessionStatus(
  id: string,
  input: { status: 'pendente' | 'aprovado' | 'reprovado'; masterComment?: string | null }
): Promise<Possession | null> {
  if (isDev) {
    const p = devUpdatePossessionStatus(id, input)
    if (!p) return null
    return {
      ...p,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }
  }

  const result = await db.execute<{
    id: string
    character_id: string
    campaign_id: string | null
    label: string
    description: string | null
    origin: 'player' | 'master'
    status: 'pendente' | 'aprovado' | 'reprovado'
    master_comment: string | null
    created_at: Date
    updated_at: Date
  }>(sql`
    UPDATE character_possessions
    SET status = ${input.status}, master_comment = ${input.masterComment ?? null}, updated_at = NOW()
    WHERE id = ${id}::uuid
    RETURNING id, character_id, campaign_id, label, description, origin, status, master_comment, created_at, updated_at
  `)

  const row = result.rows[0]
  if (!row) return null
  return {
    id: row.id,
    characterId: row.character_id,
    campaignId: row.campaign_id,
    label: row.label,
    description: row.description,
    origin: row.origin,
    status: row.status,
    masterComment: row.master_comment,
    createdAt: row.created_at && row.created_at !== '' ? (row.created_at instanceof Date ? row.created_at.toISOString() : new Date(row.created_at).toISOString()) : null,
    updatedAt: row.updated_at && row.updated_at !== '' ? (row.updated_at instanceof Date ? row.updated_at.toISOString() : new Date(row.updated_at).toISOString()) : null,
  }
}
