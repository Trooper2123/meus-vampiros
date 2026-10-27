import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { CharacterCommandError, runCharacterCommand } from '@/lib/character-commands'
type PossessionStatus = 'pendente' | 'aprovado' | 'reprovado'
export type Possession = {
  id: string
  characterId: string
  campaignId: string | null
  label: string
  description: string | null
  origin: 'player' | 'master'
  status: PossessionStatus
  masterComment: string | null
  createdAt: string
  updatedAt: string
}

export async function getPossessionsForCharacter(characterId: string): Promise<Possession[]> {
  const result = await db.execute<{
    id: string
    character_id: string
    campaign_id: string | null
    label: string
    description: string | null
    origin: 'player' | 'master'
    status: PossessionStatus
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
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  }))
}

export async function getPossessionsForCampaign(campaignId: string): Promise<Possession[]> {
  const result = await db.execute<{
    id: string
    character_id: string
    campaign_id: string | null
    label: string
    description: string | null
    origin: 'player' | 'master'
    status: PossessionStatus
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
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  }))
}

export async function createPossession(
  actorId: string,
  characterId: string,
  input: { label: string; description?: string | null; origin?: 'player' | 'master'; campaignId?: string | null; idempotencyKey: string }
) {
  return runCharacterCommand(actorId, characterId, { key: input.idempotencyKey, type: 'POSSESSION_CREATED', payload: input },
    character => character.ownerId === actorId || character.masterId === actorId, async (character, transaction) => {
  const master = Boolean(character.campaignId && character.masterId === actorId)
  if ((input.origin === 'master' && !master) || (input.campaignId != null && input.campaignId !== character.campaignId)) { throw new CharacterCommandError(403, 'Pertence não autorizado nesta mesa.') }
  const origin = master && (input.origin === 'master' || character.ownerId !== actorId) ? 'master' : 'player'
  const result = await transaction.execute<{
    id: string
    character_id: string
    campaign_id: string | null
    label: string
    description: string | null
    origin: 'player' | 'master'
    status: PossessionStatus
    master_comment: string | null
    created_at: Date
    updated_at: Date
  }>(sql`
    INSERT INTO character_possessions (character_id, campaign_id, label, description, origin, status)
    SELECT id, campaign_id, ${input.label}, ${input.description ?? null}, ${origin},
      CASE WHEN campaign_id IS NULL OR ${origin} = 'master' THEN 'aprovado' ELSE 'pendente' END
    FROM characters WHERE id = ${characterId}::uuid
    RETURNING id, character_id, campaign_id, label, description, origin, status, master_comment, created_at, updated_at
  `)

  const row = result.rows[0]
  return { possession: {
    id: row.id,
    characterId: row.character_id,
    campaignId: row.campaign_id,
    label: row.label,
    description: row.description,
    origin: row.origin,
    status: row.status,
    masterComment: row.master_comment,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  } }
  })
}

export async function updatePossessionStatus(
  actorId: string,
  id: string,
  input: { status: PossessionStatus; masterComment?: string | null }
): Promise<Possession | null> {
  const result = await db.execute<{
    id: string
    character_id: string
    campaign_id: string | null
    label: string
    description: string | null
    origin: 'player' | 'master'
    status: PossessionStatus
    master_comment: string | null
    created_at: Date
    updated_at: Date
  }>(sql`
    UPDATE character_possessions
    SET status = ${input.status}, master_comment = ${input.masterComment ?? null}, updated_at = NOW()
    WHERE id = ${id}::uuid
      AND EXISTS (SELECT 1 FROM characters ch JOIN campaigns c ON c.id = ch.campaign_id
        WHERE ch.id = character_possessions.character_id AND ch.status <> 'DELETED'
          AND ch.campaign_id = character_possessions.campaign_id AND c.master_user_id = ${actorId})
    RETURNING id, character_id, campaign_id, label, description, origin, status, master_comment, created_at, updated_at
  `)

  const row = result.rows[0]
  if (!row) { return null }
  return {
    id: row.id,
    characterId: row.character_id,
    campaignId: row.campaign_id,
    label: row.label,
    description: row.description,
    origin: row.origin,
    status: row.status,
    masterComment: row.master_comment,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  }
}
