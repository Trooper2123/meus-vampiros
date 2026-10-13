import { NextResponse } from 'next/server'
import { getSessionOrDev } from '@/lib/auth0'
import { ensureAllTables } from '@/lib/db'
import { CharacterCommandError, getCommandCharacter } from '@/lib/character-commands'
import { changeSpecialty, specialtyView } from '@/lib/character-specialties'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionOrDev()
    if (!session?.user?.sub) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
    const { id } = await context.params
    if (!UUID_PATTERN.test(id)) return NextResponse.json({ error: 'Ficha inválida.' }, { status: 400 })
    await ensureAllTables()
    const character = await getCommandCharacter(id)
    if (!character) return NextResponse.json({ error: 'Ficha não encontrada.' }, { status: 404 })
    if (character.ownerId !== session.user.sub && character.masterId !== session.user.sub) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })
    return NextResponse.json(specialtyView(character, session.user.sub))
  } catch { return NextResponse.json({ error: 'Não foi possível carregar especialidades.' }, { status: 500 }) }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionOrDev()
    if (!session?.user?.sub) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
    const { id } = await context.params
    const body = await request.json().catch(() => null)
    if (!UUID_PATTERN.test(id) || !body || !['GRANT', 'PURCHASE', 'APPROVE', 'REJECT'].includes(body.kind) || !Number.isSafeInteger(body.expectedRevision) || body.expectedRevision < 0 || typeof body.reason !== 'string' || !body.reason.trim() || body.reason.length > 500 || typeof body.idempotencyKey !== 'string' || !UUID_PATTERN.test(body.idempotencyKey)) return NextResponse.json({ error: 'Especialidade inválida.' }, { status: 400 })
    if (['GRANT', 'PURCHASE'].includes(body.kind) && (typeof body.skillId !== 'string' || typeof body.name !== 'string' || body.name.length > 100 || body.skillId.length > 100)) return NextResponse.json({ error: 'Escolha inválida.' }, { status: 400 })
    if (body.kind === 'GRANT' && (typeof body.grantId !== 'string' || body.grantId.length > 200)) return NextResponse.json({ error: 'Concessão inválida.' }, { status: 400 })
    if (['APPROVE', 'REJECT'].includes(body.kind) && (typeof body.specialtyId !== 'string' || body.specialtyId.length > 250)) return NextResponse.json({ error: 'Especialidade inválida.' }, { status: 400 })
    await ensureAllTables()
    return NextResponse.json(await changeSpecialty(session.user.sub, id, { kind: body.kind, grantId: body.grantId, skillId: body.skillId, name: body.name, specialtyId: body.specialtyId, reason: body.reason.trim(), expectedRevision: body.expectedRevision, idempotencyKey: body.idempotencyKey }))
  } catch (error) { return NextResponse.json({ error: error instanceof CharacterCommandError ? error.message : 'Não foi possível alterar a especialidade.' }, { status: error instanceof CharacterCommandError ? error.status : 500 }) }
}
