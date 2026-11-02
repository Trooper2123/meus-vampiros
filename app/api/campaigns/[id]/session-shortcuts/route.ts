import { NextResponse } from 'next/server'
import { getSessionOrDev } from '@/lib/auth0'
import { CharacterCommandError } from '@/lib/character-commands'
import { campaignSessionShortcuts, updateCampaignSessionShortcuts } from '@/lib/campaign-session-shortcuts'

type Context = { params: Promise<{ id: string }> }

export async function GET(_request: Request, context: Context) {
  try {
    const auth = await getSessionOrDev()
    if (!auth?.user?.sub) return NextResponse.json({error:'Não autorizado.'},{status:401})
    const { id } = await context.params
    return NextResponse.json({ shortcuts: await campaignSessionShortcuts(auth.user.sub, id) })
  } catch (error) {
    return NextResponse.json({ error: error instanceof CharacterCommandError ? error.message : 'Não foi possível consultar atalhos.' }, { status: error instanceof CharacterCommandError ? error.status : 500 })
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    const auth = await getSessionOrDev()
    if (!auth?.user?.sub) return NextResponse.json({error:'Não autorizado.'},{status:401})
    const { id } = await context.params
    const body: unknown = await request.json()
    if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).length !== 1 || !Object.hasOwn(body, 'shortcuts')) return NextResponse.json({error:'Configuração inválida.'},{status:400})
    const shortcuts = await updateCampaignSessionShortcuts(auth.user.sub,id,(body as {shortcuts: unknown}).shortcuts)
    return NextResponse.json({shortcuts})
  } catch (error) {
    return NextResponse.json({ error: error instanceof CharacterCommandError ? error.message : 'Não foi possível salvar atalhos.' }, { status: error instanceof CharacterCommandError ? error.status : 500 })
  }
}
