import { NextResponse } from 'next/server'
import { getSessionOrDev } from '@/lib/auth0'
import { canManageCampaign } from '@/lib/auth/authorization'
import { getPredatorTypeSettings, isPredatorTypeEnabled } from '@/lib/predator-types'
import { PREDATOR_TYPES, normalizePredatorType, toMasterPredatorTypeDto } from '@/lib/vtm-v5/predator-types'
import { getCharactersForCampaign, getCharacterAccessRecord } from '@/lib/characters'

export async function GET(_request: Request, context: RouteContext<'/api/campaigns/[id]/predator-types'>) {
  const session = await getSessionOrDev()
  if (!session?.user?.sub) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  const { id } = await context.params
  if (!(await canManageCampaign(session.user.sub, id))) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })
  const settings = await getPredatorTypeSettings(id)
  const characters = await getCharactersForCampaign(id)
  const records = await Promise.all(characters.map(character => getCharacterAccessRecord(character.id)))
  const usedCodes = new Set(records.filter(character => character?.campaignId === id).map(character => normalizePredatorType(character?.data.predatorTypeCode ?? character?.data.predador)).filter(Boolean))
  return NextResponse.json({ settings, predatorTypes: PREDATOR_TYPES.filter(definition => usedCodes.has(definition.code)).map(definition => toMasterPredatorTypeDto(definition, isPredatorTypeEnabled(definition.code, settings))) })
}
