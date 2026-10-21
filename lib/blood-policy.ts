import { sql } from 'drizzle-orm'
import { db } from './db'
import { canManageCampaign } from './auth/authorization'
import { CharacterCommandError } from './character-commands'
import { BLOOD_RULESETS } from './vtm-v5/blood-potency-catalog'
import { DEFAULT_BLOOD_POLICY, type BloodPolicy } from './vtm-v5/blood-potency'

export function parseBloodPolicy(input: unknown): BloodPolicy {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new CharacterCommandError(400, 'Perfil inválido.')
  const value = input as Record<string, unknown>
  if (Object.keys(value).some(key => !['rulesetVersion', 'allowPlayerPotencyAboveFive', 'communityEnabled'].includes(key)) || !BLOOD_RULESETS.includes(value.rulesetVersion as BloodPolicy['rulesetVersion']) || typeof value.allowPlayerPotencyAboveFive !== 'boolean' || typeof value.communityEnabled !== 'boolean') throw new CharacterCommandError(400, 'Configuração de Potência inválida.')
  if (value.communityEnabled && value.rulesetVersion !== 'COMPANION_ERRATA_P63_V1') throw new CharacterCommandError(422, 'O pacote comunitário exige o perfil Companion.')
  return value as BloodPolicy
}

export async function getBloodPolicy(campaignId: string | null): Promise<BloodPolicy> {
  if (!campaignId) return { ...DEFAULT_BLOOD_POLICY }
  const rows = await db.execute<{ blood_policy: BloodPolicy | null }>(sql`SELECT blood_policy FROM campaigns WHERE id = ${campaignId}::uuid`)
  return rows.rows[0]?.blood_policy ? parseBloodPolicy(rows.rows[0].blood_policy) : { ...DEFAULT_BLOOD_POLICY }
}

export async function saveBloodPolicy(actorId: string, campaignId: string, input: unknown) {
  if (!(await canManageCampaign(actorId, campaignId))) throw new CharacterCommandError(403, 'Acesso negado.')
  const policy = parseBloodPolicy(input)
  await db.execute(sql`UPDATE campaigns SET blood_policy = ${JSON.stringify(policy)}::jsonb, updated_at = now() WHERE id = ${campaignId}::uuid AND master_user_id = ${actorId}`)
  return policy
}
