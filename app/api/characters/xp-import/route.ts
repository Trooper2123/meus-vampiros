import { NextResponse } from 'next/server'
import { getSessionOrDev } from '@/lib/auth0'
import { ensureAllTables } from '@/lib/db'
import { importStandaloneCharacterXp } from '@/lib/character-xp-import'
import { CharacterCommandError } from '@/lib/character-commands'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(request: Request) {
  try {
    const session = await getSessionOrDev()
    if (!session?.user?.sub) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
    const body: unknown = await request.json().catch(() => null)
    if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })
    const input = body as Record<string, unknown>
    if (typeof input.characterId !== 'string' || !UUID.test(input.characterId) ||
        typeof input.idempotencyKey !== 'string' || !UUID.test(input.idempotencyKey) ||
        !Number.isSafeInteger(input.expectedRevision) || (input.expectedRevision as number) < 0 ||
        !Number.isSafeInteger(input.totalXp) || !Number.isSafeInteger(input.spentXp)) {
      return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })
    }
    await ensureAllTables()
    const result = await importStandaloneCharacterXp(
      session.user.sub, input.characterId,
      input.totalXp as number, input.spentXp as number,
      input.idempotencyKey, input.expectedRevision as number,
    )
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof CharacterCommandError) return NextResponse.json({ error: error.message }, { status: error.status })
    return NextResponse.json({ error: 'Não foi possível importar o XP histórico.' }, { status: 500 })
  }
}
