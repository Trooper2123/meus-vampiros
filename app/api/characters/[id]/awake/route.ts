import { NextResponse } from 'next/server'
import { getSessionOrDev } from '@/lib/auth0'
import { ensureAllTables } from '@/lib/db'
import { CharacterCommandError } from '@/lib/character-commands'
import { getCharacterAwake, executeCharacterAwake, type AwakeIntent } from '@/lib/character-awake'

type Context = { params: Promise<{ id: string }> }
const errorResponse = (error: unknown) => NextResponse.json({ error: error instanceof CharacterCommandError ? error.message : 'Não foi possível processar o despertar.' }, { status: error instanceof CharacterCommandError ? error.status : 500, headers: { 'Cache-Control': 'no-store' } })
export async function GET(_request: Request, context: Context) {
  try {
    const session = await getSessionOrDev()
    if (!session?.user?.sub) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
    await ensureAllTables()
    return NextResponse.json(await getCharacterAwake(session.user.sub, (await context.params).id), { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return errorResponse(error) }
}
export async function POST(request: Request, context: Context) {
  try {
    const session = await getSessionOrDev()
    if (!session?.user?.sub) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
    const origin = request.headers.get('origin')
    if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: 'Origem inválida.' }, { status: 403 })
    if (Number(request.headers.get('content-length') ?? 0) > 8192) return NextResponse.json({ error: 'Requisição grande demais.' }, { status: 413 })
    const input: unknown = await request.json().catch(() => null)
    if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key => !['action','expectedRevision','idempotencyKey','nightId','inGameDate','sessionId'].includes(key))) return NextResponse.json({ error: 'Comando inválido.' }, { status: 400 })
    await ensureAllTables()
    return NextResponse.json(await executeCharacterAwake(session.user.sub, (await context.params).id, input as AwakeIntent), { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return errorResponse(error) }
}
