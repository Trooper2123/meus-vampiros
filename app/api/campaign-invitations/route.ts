import { invitedCampaign, CAMPAIGN_EXCEPTIONS } from '@/lib/campaign-invitations'
import { notesActor, notesBody, notesFailure, notesResponse } from '@/lib/notes-http'
import { CharacterCommandError } from '@/lib/character-commands'
import { getPredatorTypeSettings, isPredatorTypeEnabled } from '@/lib/predator-types'
import { CLANS } from '@/lib/vtm-v5/clans'
import { PREDATOR_TYPES } from '@/lib/vtm-v5/predator-types'

export async function POST(request: Request) {
  try {
    await notesActor(request, true)
    const body = await notesBody(request)
    if (Object.keys(body).some(key => !['campaignId', 'token'].includes(key))) throw new CharacterCommandError(400, 'Convite inválido.')
    const campaign = await invitedCampaign(body.campaignId, body.token)
    const settings = await getPredatorTypeSettings(campaign.id)
    return notesResponse({ id: campaign.id, name: campaign.name, clans: CLANS.map(({ code, name }) => ({ code, name, allowed: !campaign.enabledClanCodes || campaign.enabledClanCodes.includes(code) })), predatorTypes: PREDATOR_TYPES.map(({ code, name }) => ({ code, name, allowed: isPredatorTypeEnabled(code, settings) })), exceptions: CAMPAIGN_EXCEPTIONS.filter(rule => campaign.creationPolicy!.exceptionCodes.includes(rule.code)), restrictions: CAMPAIGN_EXCEPTIONS.filter(rule => !campaign.creationPolicy!.exceptionCodes.includes(rule.code)).map(rule => rule.restriction) })
  } catch (error) { return notesFailure(error) }
}
