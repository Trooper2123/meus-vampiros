import { CharacterCommandError } from './character-commands'
import { devGetCampaignById, devIsUserInCampaign } from './dev-db'

declare global {
  var __campaignCalls: { store: typeof global.__devDb; invitations: Map<string, string> } | undefined
}

export function getCampaignCall(actorId: string, campaignId: string) {
  if (!actorId) throw new CharacterCommandError(401, 'Não autorizado.')
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(campaignId)) throw new CharacterCommandError(400, 'Mesa inválida.')
  if (!devGetCampaignById(campaignId)) throw new CharacterCommandError(404, 'Mesa não encontrada.')
  if (!devIsUserInCampaign(campaignId, actorId)) throw new CharacterCommandError(403, 'Acesso negado.')
  if (!global.__campaignCalls || global.__campaignCalls.store !== global.__devDb) global.__campaignCalls = { store: global.__devDb, invitations: new Map() }
  const masterId = global.__devDb!.campaigns.find(campaign => campaign.id === campaignId)!.masterUserId
  return { active: global.__campaignCalls.invitations.get(campaignId) === masterId, canSummon: masterId === actorId }
}

export function setCampaignCall(actorId: string, campaignId: string, input: unknown) {
  const status = getCampaignCall(actorId, campaignId)
  if (!status.canSummon) throw new CharacterCommandError(403, 'Somente o Narrador atual pode convocar a mesa.')
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).length !== 1 || typeof (input as { active?: unknown }).active !== 'boolean') throw new CharacterCommandError(400, 'Envie somente o estado da convocação.')
  if ((input as { active: boolean }).active) global.__campaignCalls!.invitations.set(campaignId, actorId)
  else global.__campaignCalls!.invitations.delete(campaignId)
  return getCampaignCall(actorId, campaignId)
}
