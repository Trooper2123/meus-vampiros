import { getCharacterById } from '@/lib/characters'
import { getCampaignsForMaster } from '@/lib/campaigns'
import { sql } from 'drizzle-orm'
import { db, getLiveKitRoom } from '@/lib/db'

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
  const result = await db.execute<{ allowed: boolean }>(sql`
    SELECT EXISTS (
      SELECT 1
      FROM character_possessions p
      JOIN characters ch ON ch.id = p.character_id AND ch.status <> 'DELETED'
      JOIN campaigns c ON c.id = ch.campaign_id AND c.id = p.campaign_id
      WHERE p.id = ${possessionId}::uuid AND c.master_user_id = ${userId}
    ) AS allowed
  `)
  return result.rows[0]?.allowed === true
}

export async function isLiveKitHost(userId: string, campaignId: string): Promise<boolean> {
  const room = await getLiveKitRoom(campaignId)
  return room?.hostUserId === userId
}
