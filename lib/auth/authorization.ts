import { getCharacterById, getCharacterAccessRecord } from '@/lib/characters'
import { getCampaignsForMaster } from '@/lib/campaigns'
import { getLiveKitRoom } from '@/lib/db'
import { getPossessionsForCampaign } from '@/lib/possessions'

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
  const campaigns = await getCampaignsForMaster(userId)
  for (const campaign of campaigns) {
    const possession = (await getPossessionsForCampaign(campaign.id)).find((item) => item.id === possessionId)
    if (!possession) continue
    const character = await getCharacterAccessRecord(possession.characterId)
    return character?.campaignId === campaign.id
  }
  return false
}

export async function isLiveKitHost(userId: string, campaignId: string): Promise<boolean> {
  const room = await getLiveKitRoom(campaignId)
  return room?.hostUserId === userId
}
