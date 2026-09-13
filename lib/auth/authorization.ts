import { getCharacterById } from '@/lib/characters'
import { getCampaignsForMaster } from '@/lib/campaigns'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

/**
 * Checks if the given user is the creator of the character.
 */
export async function canEditCharacter(userId: string, characterId: string): Promise<boolean> {
  const character = await getCharacterById(characterId, userId)
  return character !== null
}

/**
 * Checks if the given user is the master of the campaign.
 */
export async function canManageCampaign(userId: string, campaignId: string): Promise<boolean> {
  const campaigns = await getCampaignsForMaster(userId)
  return campaigns.some((c) => c.id === campaignId)
}

/**
 * Checks if the user can manage (approve/reject) a possession.
 * The user must be the master of the campaign the possession belongs to.
 */
export async function canManagePossession(userId: string, possessionId: string): Promise<boolean> {
  const result = await db.execute<{ campaign_id: string | null }>(sql`
    SELECT c.campaign_id
    FROM possessions p
    JOIN characters c ON p.character_id = c.id
    WHERE p.id = ${possessionId}::uuid
  `)
  const row = result.rows[0]
  if (!row || !row.campaign_id) return false
  return canManageCampaign(userId, row.campaign_id)
}
