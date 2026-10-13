import { NextResponse } from 'next/server'
import { getSessionOrDev } from '@/lib/auth0'

export async function PATCH(request: Request) {
  const session = await getSessionOrDev()
  if (!session?.user?.sub) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  const body = await request.json().catch(() => null)
  if (!body || typeof body.characterId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.characterId)) return NextResponse.json({ error: 'Ficha inválida.' }, { status: 400 })
  return NextResponse.json({ error: 'Utilize o fluxo de recursos com motivo, revisão e trilhas de dano.' }, { status: 409 })
}
