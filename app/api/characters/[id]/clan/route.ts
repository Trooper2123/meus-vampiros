import { NextResponse } from 'next/server'
import { getSessionOrDev } from '@/lib/auth0'
import { CharacterCommandError } from '@/lib/character-commands'
import { getClanView, selectCharacterClan } from '@/lib/character-clans'
import type { ClanSelection } from '@/lib/vtm-v5/clans'

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
type Context = { params: Promise<{ id: string }> }

function failure(error: unknown) {
  return NextResponse.json({ error: error instanceof CharacterCommandError ? error.message : 'Não foi possível acessar as escolhas de clã.' }, { status: error instanceof CharacterCommandError ? error.status : 500 })
}

export async function GET(_request: Request, context: Context) {
  try {
    const session = await getSessionOrDev()
    if (!session?.user?.sub) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
    const { id } = await context.params
    if (!uuid.test(id)) throw new CharacterCommandError(400, 'Ficha inválida.')
    return NextResponse.json(await getClanView(id, session.user.sub))
  } catch (error) { return failure(error) }
}

export async function POST(request: Request, context: Context) {
  try {
    const session = await getSessionOrDev()
    if (!session?.user?.sub) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
    const { id } = await context.params
    if (!uuid.test(id)) throw new CharacterCommandError(400, 'Ficha inválida.')
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => !['selection', 'expectedRevision', 'key'].includes(key)) || !Number.isSafeInteger(body.expectedRevision) || body.expectedRevision < 0 || typeof body.key !== 'string' || !uuid.test(body.key) || JSON.stringify(body.selection ?? {}).length > 2000) throw new CharacterCommandError(400, 'Escolhas de clã inválidas.')
    return NextResponse.json(await selectCharacterClan(id, session.user.sub, body.selection as ClanSelection, body.expectedRevision, body.key))
  } catch (error) { return failure(error) }
}
