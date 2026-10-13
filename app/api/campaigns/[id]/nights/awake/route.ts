import { NextResponse } from 'next/server'
import { getSessionOrDev } from '@/lib/auth0'
import { ensureAllTables } from '@/lib/db'
import { CharacterCommandError } from '@/lib/character-commands'
import { getChronicleAwakePanel, startChronicleNight, validateNightRequest } from '@/lib/chronicle-nights'

type Context = { params: Promise<{ id: string }> }
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function failure(error: unknown) {
  return NextResponse.json({ error: error instanceof CharacterCommandError ? error.message : 'Não foi possível processar o início de noite.' }, { status: error instanceof CharacterCommandError ? error.status : 500 })
}

export async function GET(_request: Request, context: Context) {
  try {
    const session = await getSessionOrDev()
    if (!session?.user?.sub) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
    const { id } = await context.params
    if (!uuid.test(id)) return NextResponse.json({ error: 'Mesa inválida.' }, { status: 400 })
    await ensureAllTables()
    return NextResponse.json(await getChronicleAwakePanel(session.user.sub, id.toLowerCase()))
  } catch (error) { return failure(error) }
}

export async function POST(request: Request, context: Context) {
  try {
    const session = await getSessionOrDev()
    if (!session?.user?.sub) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
    const { id } = await context.params
    const body = await request.json().catch(() => null)
    if (!uuid.test(id) || !validateNightRequest(body)) return NextResponse.json({ error: 'Seleção, data ou confirmação inválida.' }, { status: 400 })
    await ensureAllTables()
    return NextResponse.json(await startChronicleNight(session.user.sub, id, body))
  } catch (error) { return failure(error) }
}
