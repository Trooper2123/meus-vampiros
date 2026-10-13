import { NextResponse } from 'next/server'
import { getSessionOrDev } from '@/lib/auth0'
import { canManageCampaign } from '@/lib/auth/authorization'
import { getCharacterAccessRecord, getCharactersForCampaign } from '@/lib/characters'
import { sanitizePredatorTypeSettings, savePredatorTypeSettings } from '@/lib/predator-types'
import { CharacterCommandError } from '@/lib/character-commands'

export async function PATCH(request: Request, context: RouteContext<'/api/campaigns/[id]/predator-types/settings'>) {
  try {
  const session = await getSessionOrDev()
  if (!session?.user?.sub) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  const { id } = await context.params
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return NextResponse.json({ error: 'Mesa inválida.' }, { status: 400 })
  if (!(await canManageCampaign(session.user.sub, id))) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })
  const settings = sanitizePredatorTypeSettings(await request.json().catch(() => null))
  if (!settings) return NextResponse.json({ error: 'Configuração inválida.' }, { status: 400 })
  await savePredatorTypeSettings(id, settings, session.user.sub)
  const characters = await getCharactersForCampaign(id)
  const accessRecords = await Promise.all(characters.map((character) => getCharacterAccessRecord(character.id)))
  return NextResponse.json({ settings, flaggedCharacters: accessRecords.filter((character) => Boolean(character?.data.predatorTypeCode)).length })
  } catch (error) { return NextResponse.json({ error: error instanceof CharacterCommandError ? error.message : 'Não foi possível alterar a configuração.' }, { status: error instanceof CharacterCommandError ? error.status : 500 }) }
}
