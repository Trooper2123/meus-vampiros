import { NextResponse } from 'next/server'
import { getSessionOrDev } from '@/lib/auth0'
import { playerHandouts } from '@/lib/player-handouts'

export async function GET(_request: Request, context: {params: Promise<{id:string}>}) {
  const session = await getSessionOrDev()
  if (!session?.user?.sub) return NextResponse.json({error:'Não autorizado.'},{status:401})
  const {id} = await context.params
  try {
    const files = await playerHandouts(session.user.sub,id)
    if (!files) return NextResponse.json({error:'Mesa não disponível.'},{status:404})
    return NextResponse.json({files},{headers:{'Cache-Control':'private, no-store'}})
  } catch (cause) {
    const code = cause && typeof cause === 'object' && 'code' in cause ? String(cause.code) : 'unknown'
    // Never log SQL, connection strings, actor IDs or private object paths.
    console.error('player_handouts_list_failed', { code, category: ['42P01', '42703'].includes(code) ? 'schema' : 'database' })
    if (code === '42P01' || code === '42703') {
      return NextResponse.json(
        { error: 'O catálogo de arquivos da mesa ainda não está disponível. Solicite ao administrador a aplicação da migração de handouts.', code: 'HANDOUT_SCHEMA_PENDING' },
        { status: 503, headers: { 'Cache-Control': 'private, no-store' } }
      )
    }
    return NextResponse.json(
      { error: 'Falha ao consultar o catálogo de arquivos da mesa.', code: 'HANDOUT_LIST_UNAVAILABLE' },
      { status: 503, headers: { 'Cache-Control': 'private, no-store' } }
    )
  }
}
