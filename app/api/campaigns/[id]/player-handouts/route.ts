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
  } catch {
    return NextResponse.json({error:'Não foi possível carregar os arquivos compartilhados.'},{status:503})
  }
}
