import { NextResponse } from 'next/server'
import { getSessionOrDev } from '@/lib/auth0'
import { canManageCampaign } from '@/lib/auth/authorization'
import { appendCharacterLedgerEvent, getCharacterAccessRecord, getCharactersForCampaign } from '@/lib/characters'
import { sanitizePredatorTypeSettings, savePredatorTypeSettings } from '@/lib/predator-types'

export async function PATCH(request: Request, context: RouteContext<'/api/campaigns/[id]/predator-types/settings'>) {
  const session = await getSessionOrDev()
  if (!session?.user?.sub) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  const { id } = await context.params
  if (!(await canManageCampaign(session.user.sub, id))) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })
  const settings = sanitizePredatorTypeSettings(await request.json().catch(() => null))
  if (!settings) return NextResponse.json({ error: 'Configuração inválida.' }, { status: 400 })
  await savePredatorTypeSettings(id, settings, session.user.sub)
  const characters = await getCharactersForCampaign(id)
  for (const character of characters) await appendCharacterLedgerEvent(character.id, 'PREDATOR_TYPE_SETTINGS_CHANGED', 'MASTER_ACTION', { campaignId: id, settings }, session.user.sub)
  const accessRecords = await Promise.all(characters.map((character) => getCharacterAccessRecord(character.id)))
  return NextResponse.json({ settings, flaggedCharacters: accessRecords.filter((character) => Boolean(character?.data.predatorTypeCode)).length })
}
