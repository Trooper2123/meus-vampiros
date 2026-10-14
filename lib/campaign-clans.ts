import { CharacterCommandError } from './character-commands'
import { devGetCampaignById } from './dev-db'
import { CLANS } from './vtm-v5/clans'

export function campaignClanCodes(campaignId: string | null): string[] {
  if (!campaignId) return CLANS.map(clan => clan.code)
  if (process.env.NODE_ENV === 'production' || process.env.DATABASE_URL) throw new CharacterCommandError(503, 'Configuração de clãs no banco externo ainda não disponível.')
  if (!devGetCampaignById(campaignId)) throw new CharacterCommandError(404, 'Mesa não encontrada.')
  return [...(global.__devDb!.campaigns.find(campaign => campaign.id === campaignId)!.enabledClanCodes ?? CLANS.map(clan => clan.code))]
}
