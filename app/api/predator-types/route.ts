import { NextResponse } from 'next/server'
import { campaignPredatorOverrides } from '@/lib/campaign-invitations'
import { characterText } from '@/lib/vtm-v5/text'
import { getSessionOrDev } from '@/lib/auth0'
import { canManageCampaign } from '@/lib/auth/authorization'
import { getCharacterAccessRecord } from '@/lib/characters'
import { isUserInCampaign } from '@/lib/availability'
import { getPredatorTypeSettings, isPredatorTypeEnabled } from '@/lib/predator-types'
import { PREDATOR_TYPES, toPlayerPredatorTypeDto, validatePredatorType } from '@/lib/vtm-v5/predator-types'

export async function GET(request: Request) {
  const session = await getSessionOrDev()
  if (!session?.user?.sub) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  const params = new URL(request.url).searchParams
  const characterId = params.get('characterId')
  let campaignId = params.get('campaignId')
  let character: Awaited<ReturnType<typeof getCharacterAccessRecord>> = null
  if (characterId) {
    character = await getCharacterAccessRecord(characterId)
    if (!character) return NextResponse.json({ error: 'Ficha não encontrada.' }, { status: 404 })
    const authorized = character.userId === session.user.sub || Boolean(character.campaignId && await canManageCampaign(session.user.sub, character.campaignId))
    if (!authorized) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })
    campaignId = character.campaignId
  } else if (campaignId && !(await isUserInCampaign(campaignId, session.user.sub)) && !(await canManageCampaign(session.user.sub, campaignId))) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })
  }
  const settings = await getPredatorTypeSettings(campaignId)
  const data = character?.data ?? {}
  const clan = characterText(data.cla).trim() || null
  const bloodPotency = Number(data['potencia-de-sangue'] ?? 0)
  const isThinBlood = data.creationType === 'THIN_BLOOD' || data.isThinBlood === true
  const predatorTypes = PREDATOR_TYPES.filter((definition) => !campaignId || isPredatorTypeEnabled(definition.code, settings)).map((definition) => {
    const report = validatePredatorType(definition, { clan, bloodPotency, isThinBlood, creationType: data.creationType, enabled: isPredatorTypeEnabled(definition.code, settings), overrides: campaignPredatorOverrides(campaignId) })
    return toPlayerPredatorTypeDto(definition, report.issues, report.valid)
  })
  return NextResponse.json({ predatorTypes, selectedCode: data.predatorTypeCode ?? null })
}
