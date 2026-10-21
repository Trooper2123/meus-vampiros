import { NextResponse } from 'next/server'
import { getSessionOrDev } from '@/lib/auth0'
import { traitOptions } from '@/lib/vtm-v5/trait-options'

const response = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' } })

export async function GET(request: Request) {
  try {
    const session = await getSessionOrDev()
    if (!session?.user?.sub) return response({ error: 'Não autorizado.' }, 401)
    const params = new URL(request.url).searchParams
    const kind = params.get('kind')
    if ((kind !== 'MERIT' && kind !== 'FLAW') || params.getAll('kind').length !== 1 || [...params.keys()].some(key => key !== 'kind')) return response({ error: 'Informe vantagens ou defeitos válidos.' }, 400)
    return response({ options: traitOptions(kind) })
  } catch { return response({ error: 'Não foi possível carregar as vantagens e defeitos.' }, 500) }
}
