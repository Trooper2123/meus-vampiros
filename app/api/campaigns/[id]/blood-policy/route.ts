import { NextResponse } from 'next/server'
import { getSessionOrDev } from '@/lib/auth0'
import { CharacterCommandError } from '@/lib/character-commands'
import { getBloodPolicy, saveBloodPolicy } from '@/lib/blood-policy'
import { canManageCampaign } from '@/lib/auth/authorization'

async function handle(request: Request, context: { params: Promise<{ id: string }> }, write: boolean) {
  try {
    const session = await getSessionOrDev()
    if (!session?.user?.sub) throw new CharacterCommandError(401, 'Não autorizado.')
    const { id } = await context.params
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new CharacterCommandError(400, 'Mesa inválida.')
    if (!(await canManageCampaign(session.user.sub, id))) throw new CharacterCommandError(403, 'Acesso negado.')
    const policy = write ? await saveBloodPolicy(session.user.sub, id, await request.json().catch(() => null)) : await getBloodPolicy(id)
    return NextResponse.json(policy, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    return NextResponse.json({ error: error instanceof CharacterCommandError ? error.message : 'Não foi possível consultar o perfil.' }, { status: error instanceof CharacterCommandError ? error.status : 500 })
  }
}
export const GET = (request: Request, context: { params: Promise<{ id: string }> }) => handle(request, context, false)
export const PATCH = (request: Request, context: { params: Promise<{ id: string }> }) => handle(request, context, true)
