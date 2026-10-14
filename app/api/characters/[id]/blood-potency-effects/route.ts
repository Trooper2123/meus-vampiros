import { NextResponse } from 'next/server'
import { getSessionOrDev } from '@/lib/auth0'
import { getCharacterBloodPotencyEffects } from '@/lib/character-blood-potency'
import { CharacterCommandError } from '@/lib/character-commands'

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' }
  try {
    const session = await getSessionOrDev()
    if (!session?.user?.sub) throw new CharacterCommandError(401, 'Não autorizado.')
    const { id } = await context.params
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new CharacterCommandError(400, 'Ficha inválida.')
    return NextResponse.json(await getCharacterBloodPotencyEffects(id, session.user.sub), { headers })
  } catch (error) {
    return NextResponse.json({ error: error instanceof CharacterCommandError ? error.message : 'Não foi possível calcular os efeitos do sangue.' }, { status: error instanceof CharacterCommandError ? error.status : 500, headers })
  }
}
