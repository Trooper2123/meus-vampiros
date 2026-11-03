import { NextResponse } from 'next/server'
import { getSessionOrDev } from '@/lib/auth0'
import { getCharacterSummaryData } from '@/lib/character-summary'

export async function GET(_request: Request, context: {params: Promise<{id: string}>}) {
  const auth = await getSessionOrDev()
  if (!auth?.user?.sub) return NextResponse.json({error:'Não autorizado.'},{status:401})
  const {id} = await context.params
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return NextResponse.json({error:'Ficha inválida.'},{status:400})
  try {
    const character = await getCharacterSummaryData(id, auth.user.sub)
    if (!character) return NextResponse.json({error:'Ficha indisponível.'},{status:404})
    return NextResponse.json(character,{headers:{'Cache-Control':'private, no-store'}})
  } catch {
    return NextResponse.json({error:'Não foi possível carregar a ficha.'},{status:500})
  }
}
