import { sql } from 'drizzle-orm'
import { db } from './db'
import { CharacterCommandError } from './character-commands'
import { CLANS } from './vtm-v5/clans'
import type { PredatorTypeOverride } from './vtm-v5/predator-types'
import { CAMPAIGN_EXCEPTIONS } from './campaign-exception-options'
export { CAMPAIGN_EXCEPTIONS } from './campaign-exception-options'

type CreationPolicy = { exceptionCodes: string[]; inviteHash?: string }
type CampaignRow = { id: string; master_user_id: string; name: string; theme: string | null; creation_policy: CreationPolicy | null; enabled_clan_codes: string[] | null; created_at: Date }
export function validateCampaignExceptions(value: unknown): string[] {
  if (!Array.isArray(value) || value.length > CAMPAIGN_EXCEPTIONS.length || new Set(value).size !== value.length || value.some(code => !CAMPAIGN_EXCEPTIONS.some(rule => rule.code === code))) throw new CharacterCommandError(400, 'Exceções de predação inválidas.')
  return [...value]
}
async function campaign(id: unknown): Promise<CampaignRow> {
  if (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new CharacterCommandError(400, 'Mesa inválida.')
  const result = await db.execute<CampaignRow>(sql`SELECT id, master_user_id, name, theme, creation_policy, enabled_clan_codes, created_at FROM campaigns WHERE id = ${id}::uuid`)
  if (!result.rows[0]) throw new CharacterCommandError(404, 'Mesa não encontrada.')
  return result.rows[0]
}
export async function createCampaignPolicy(actorId: string, campaignId: string, codes: unknown) {
  const exceptionCodes = validateCampaignExceptions(codes)
  const result = await db.execute(sql`UPDATE campaigns SET creation_policy = ${JSON.stringify({ exceptionCodes })}::jsonb, updated_at = now() WHERE id = ${campaignId}::uuid AND master_user_id = ${actorId} AND creation_policy IS NULL RETURNING id`)
  if (!result.rows.length) {
    const current = await campaign(campaignId)
    if (current.master_user_id !== actorId) throw new CharacterCommandError(403, 'Acesso negado.')
    throw new CharacterCommandError(409, 'A política é definida apenas na criação da mesa.')
  }
}

export async function getCampaignForJoining(campaignId: unknown) {
  const row = await campaign(campaignId)
  return { id: row.id, masterUserId: row.master_user_id, name: row.name, theme: row.theme, creationPolicy: row.creation_policy, enabledClanCodes: row.enabled_clan_codes, createdAt: row.created_at }
}
export async function campaignPredatorOverrides(campaignId: string | null): Promise<PredatorTypeOverride[]> {
  if (!campaignId) return []
  const row = await campaign(campaignId)
  return (row.creation_policy?.exceptionCodes ?? []).map(ruleCode => ({ ruleCode, justification: 'Exceção predefinida na criação da mesa.', createdByUserId: row.master_user_id, createdAt: new Date(row.created_at).toISOString() }))
}
export async function campaignRequiresInvitation(campaignId: string) {
  return !!(await campaign(campaignId)).creation_policy
}
export async function validateInvitedClan(campaignId: string, data: Record<string, unknown>) {
  if (!data.cla) return
  const row = await campaign(campaignId)
  const allowed = row.enabled_clan_codes ?? CLANS.map(clan => clan.code)
  if (!CLANS.some(clan => allowed.includes(clan.code) && (data.cla === clan.name || data.cla === clan.code))) throw new CharacterCommandError(422, 'O clã não é permitido nesta mesa. Use o seletor de clã.')
}
