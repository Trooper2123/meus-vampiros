import { sql } from 'drizzle-orm'
import { db } from './db'
import { CharacterCommandError } from './character-commands'

export async function getCampaignCall(actorId: string, campaignId: string) {
  if (!actorId) throw new CharacterCommandError(401, 'Não autorizado.')
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(campaignId)) throw new CharacterCommandError(400, 'Mesa inválida.')
  const result = await db.execute<{ master_user_id: string; call_active: boolean; is_member: boolean }>(sql`
    SELECT c.master_user_id, c.call_active,
      (c.master_user_id = ${actorId} OR EXISTS (SELECT 1 FROM characters ch WHERE ch.campaign_id = c.id AND ch.user_id = ${actorId})) AS is_member
    FROM campaigns c WHERE c.id = ${campaignId}::uuid
  `)
  const campaign = result.rows[0]
  if (!campaign) throw new CharacterCommandError(404, 'Mesa não encontrada.')
  if (!campaign.is_member) throw new CharacterCommandError(403, 'Acesso negado.')
  return { active: campaign.call_active, canSummon: campaign.master_user_id === actorId }
}

export async function setCampaignCall(actorId: string, campaignId: string, input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).length !== 1 || typeof (input as { active?: unknown }).active !== 'boolean') throw new CharacterCommandError(400, 'Envie somente o estado da convocação.')
  const status = await getCampaignCall(actorId, campaignId)
  if (!status.canSummon) throw new CharacterCommandError(403, 'Somente o Narrador atual pode convocar a mesa.')
  await db.execute(sql`UPDATE campaigns SET call_active = ${(input as { active: boolean }).active}, updated_at = now() WHERE id = ${campaignId}::uuid`)
  return getCampaignCall(actorId, campaignId)
}
