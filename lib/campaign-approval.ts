import type { CommandCharacter } from './character-commands'

export function hasCampaignApproval(character: CommandCharacter) {
  const approvals = character.gameState.campaignApprovals as Record<string, unknown> | undefined
  return !!character.campaignId && (character.status === 'APPROVED' || !!approvals?.[character.campaignId])
}

export function rememberCampaignApproval(character: CommandCharacter, actorId: string) {
  if (!character.campaignId || character.status !== 'APPROVED') return
  const approvals = character.gameState.campaignApprovals as Record<string, unknown> | undefined
  if (!approvals?.[character.campaignId]) {
    character.gameState.campaignApprovals = { ...approvals, [character.campaignId]: { recordedAt: new Date().toISOString(), recordedBy: actorId } }
  }
}
