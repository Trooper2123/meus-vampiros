import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { CharacterCommandError } from './character-commands'
import { devGetCampaignById } from './dev-db'
import { CLANS } from './vtm-v5/clans'
import type { PredatorTypeOverride } from './vtm-v5/predator-types'

import { CAMPAIGN_EXCEPTIONS } from './campaign-exception-options'
export { CAMPAIGN_EXCEPTIONS } from './campaign-exception-options'

export function validateCampaignExceptions(value: unknown): string[] {
  if (!Array.isArray(value) || value.length > CAMPAIGN_EXCEPTIONS.length || new Set(value).size !== value.length || value.some(code => !CAMPAIGN_EXCEPTIONS.some(rule => rule.code === code))) throw new CharacterCommandError(400, 'Exceções de predação inválidas.')
  return [...value]
}

function memoryCampaign(id: string) {
  if (process.env.NODE_ENV === 'production' || process.env.DATABASE_URL) throw new CharacterCommandError(503, 'Convites de criação com banco externo ainda não disponíveis.')
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new CharacterCommandError(400, 'Mesa inválida.')
  devGetCampaignById(id)
  return global.__devDb!.campaigns.find(campaign => campaign.id === id)
}

const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex')

export function createCampaignInvitation(actorId: string, campaignId: string, codes: unknown) {
  const exceptionCodes = validateCampaignExceptions(codes)
  const campaign = memoryCampaign(campaignId)
  if (campaign?.masterUserId !== actorId) throw new CharacterCommandError(403, 'Acesso negado.')
  if (campaign.creationPolicy) throw new CharacterCommandError(409, 'A política é definida apenas na criação da mesa.')
  const token = randomBytes(32).toString('base64url')
  campaign.creationPolicy = { exceptionCodes, inviteHash: tokenHash(token) }
  return token
}

export function invitedCampaign(campaignId: unknown, token: unknown) {
  if (typeof campaignId !== 'string' || typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token)) throw new CharacterCommandError(403, 'Convite inválido.')
  const campaign = memoryCampaign(campaignId)
  if (!campaign?.creationPolicy || !timingSafeEqual(Buffer.from(campaign.creationPolicy.inviteHash, 'hex'), Buffer.from(tokenHash(token), 'hex'))) throw new CharacterCommandError(403, 'Convite inválido.')
  return campaign
}

export function campaignPredatorOverrides(campaignId: string | null): PredatorTypeOverride[] {
  if (process.env.NODE_ENV === 'production' || process.env.DATABASE_URL) return []
  const campaign = global.__devDb?.campaigns.find(entry => entry.id === campaignId)
  return (campaign?.creationPolicy?.exceptionCodes ?? []).map(ruleCode => ({ ruleCode, justification: 'Exceção predefinida na criação da mesa.', createdByUserId: campaign!.masterUserId, createdAt: campaign!.createdAt.toISOString() }))
}

export function validateInvitedClan(campaignId: string, data: Record<string, unknown>) {
  if (!data.cla) return
  const campaign = memoryCampaign(campaignId)
  const allowed = campaign?.enabledClanCodes ?? CLANS.map(clan => clan.code)
  if (!CLANS.some(clan => allowed.includes(clan.code) && (data.cla === clan.name || data.cla === clan.code))) throw new CharacterCommandError(422, 'O clã não é permitido nesta mesa. Use o seletor de clã.')
}
