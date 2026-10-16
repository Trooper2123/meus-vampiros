import { NextResponse } from 'next/server'
import { getSessionOrDev } from '@/lib/auth0'
import { canManageCampaign } from '@/lib/auth/authorization'
import { getCharacterAccessRecord } from '@/lib/characters'
import { CharacterCommandError } from '@/lib/character-commands'

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionOrDev()
    if (!session?.user?.sub) throw new CharacterCommandError(401, 'Não autorizado.')
    const { id } = await context.params
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new CharacterCommandError(400, 'Ficha inválida.')
    const character = await getCharacterAccessRecord(id)
    if (!character) throw new CharacterCommandError(404, 'Ficha não encontrada.')
    if (!character.campaignId || !(await canManageCampaign(session.user.sub, character.campaignId))) throw new CharacterCommandError(403, 'Acesso negado.')
    return NextResponse.json({ error: 'Exceções individuais removidas. Defina as exceções na criação da mesa.' }, { status: 410 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof CharacterCommandError ? error.message : 'Não foi possível consultar a ficha.' }, { status: error instanceof CharacterCommandError ? error.status : 500 })
  }
}
