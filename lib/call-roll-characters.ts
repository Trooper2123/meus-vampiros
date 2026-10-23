import { sql } from 'drizzle-orm'
import { db } from './db'
import { getCampaignCall } from './campaign-calls'
import { CharacterCommandError } from './character-commands'

export async function getCallRollCharacters(actorId: string, campaignId: string) {
  const call = await getCampaignCall(actorId, campaignId)
  if (!call.active && !call.canSummon) throw new CharacterCommandError(403, 'Aguarde a convocação do Narrador.')
  const result = await db.execute<{ id: string; name: string }>(sql`
    SELECT id, name FROM characters
    WHERE campaign_id = ${campaignId}::uuid
      AND character_type = 'PLAYER_VAMPIRE' AND status = 'APPROVED'
      AND (${call.canSummon} OR user_id = ${actorId})
    ORDER BY name
  `)
  return { characters: result.rows }
}
