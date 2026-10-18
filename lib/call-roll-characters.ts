import { getCampaignCall } from './campaign-calls'

export function getCallRollCharacters(actorId: string, campaignId: string) {
  const call = getCampaignCall(actorId, campaignId)
  return { characters: global.__devDb!.characters.filter(character => character.campaignId === campaignId && character.characterType === 'PLAYER_VAMPIRE' && character.status === 'APPROVED' && (call.canSummon || character.userId === actorId)).map(character => ({ id: character.id, name: character.name })) }
}
