import { sql } from 'drizzle-orm'
import { db } from './db'
import { getCampaignCall } from './campaign-calls'

export async function getCallRollCharacters(actorId: string, campaignId: string) {
  const call = await getCampaignCall(actorId, campaignId)
  const result = await db.execute<{ id: string; name: string }>(sql`
    SELECT id, name FROM characters
    WHERE campaign_id = ${campaignId}::uuid
      AND character_type = 'PLAYER_VAMPIRE' AND status = 'APPROVED'
      AND (${call.canSummon} OR user_id = ${actorId})
    ORDER BY name
  `)
  return { characters: result.rows }
}
