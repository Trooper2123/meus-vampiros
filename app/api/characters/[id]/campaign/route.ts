import { CharacterCommandError, runCharacterCommand } from '@/lib/character-commands'
import { campaignPredatorOverrides, invitedCampaign, validateInvitedClan } from '@/lib/campaign-invitations'
import { notesActor, notesBody, notesId, notesResponse } from '@/lib/notes-http'
import { getPredatorTypeSettings, isPredatorTypeEnabled } from '@/lib/predator-types'
import { normalizePredatorType, PREDATOR_TYPE_BY_CODE, validatePredatorType } from '@/lib/vtm-v5/predator-types'
import { characterText } from '@/lib/vtm-v5/text'

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actorId = await notesActor(request, true)
    const id = notesId((await context.params).id)
    const body = await notesBody(request)
    if (Object.keys(body).some(key => !['invitation', 'expectedRevision', 'idempotencyKey'].includes(key)) || !Number.isSafeInteger(body.expectedRevision) || Number(body.expectedRevision) < 0) throw new CharacterCommandError(400, 'Dados de vínculo inválidos.')
    const key = notesId(String(body.idempotencyKey))
    const invitation = body.invitation as Record<string, unknown> | null
    if (!invitation || typeof invitation !== 'object' || Array.isArray(invitation) || invitation.accepted !== true || Object.keys(invitation).some(key => !['campaignId', 'token', 'accepted'].includes(key))) throw new CharacterCommandError(400, 'Aceite um convite válido.')
    const campaign = await invitedCampaign(invitation.campaignId, invitation.token)
    const settings = await getPredatorTypeSettings(campaign.id)
    const result = await runCharacterCommand(actorId, id, { key, type: 'CAMPAIGN_LINKED', expectedRevision: Number(body.expectedRevision), payload: { campaignId: campaign.id } }, character => character.ownerId === actorId, async character => {
      if (character.campaignId || character.characterType !== 'PLAYER_VAMPIRE' || ['ARCHIVED', 'DISABLED'].includes(character.status)) throw new CharacterCommandError(409, 'Somente fichas independentes de jogador podem ser vinculadas.')
      await validateInvitedClan(campaign.id, character.data)
      const rawPredator = character.data.predatorTypeCode ?? character.data.predador
      const predatorCode = normalizePredatorType(rawPredator)
      if (rawPredator && !predatorCode) throw new CharacterCommandError(422, 'Revise o tipo de predação antes de vincular a mesa.')
      if (predatorCode) {
        const report = validatePredatorType(PREDATOR_TYPE_BY_CODE.get(predatorCode)!, { clan: characterText(character.data.cla), bloodPotency: Number(character.data['potencia-de-sangue'] ?? 0), isThinBlood: character.data.creationType === 'THIN_BLOOD' || character.data.isThinBlood === true, enabled: isPredatorTypeEnabled(predatorCode, settings), creationType: character.data.creationType, overrides: await campaignPredatorOverrides(campaign.id) })
        if (!report.valid) throw new CharacterCommandError(422, 'A predação não atende às regras da mesa. Revise a escolha antes de vincular.')
      }
      character.campaignId = campaign.id
      character.status = 'DRAFT'
      character.gameState.policyConsent = { campaignId: campaign.id, acceptedAt: new Date().toISOString(), acceptedBy: actorId }
      return { ok: true, campaignId: campaign.id }
    })
    return notesResponse(result)
  } catch (error) {
    return notesResponse({ error: error instanceof CharacterCommandError ? error.message : 'Não foi possível vincular a mesa.' }, error instanceof CharacterCommandError ? error.status : 500)
  }
}
