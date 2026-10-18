import { getSessionOrDev } from '@/lib/auth0'
import { DISCIPLINES } from '@/lib/vtm-v5/disciplines'
import { disciplinePowerOptions } from '@/lib/vtm-v5/discipline-powers'
import { NextResponse } from 'next/server'

const response = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' } })

export async function GET(request: Request) {
  try {
    const session = await getSessionOrDev()
    if (!session?.user?.sub) return response({ error: 'Não autorizado.' }, 401)
    const params = new URL(request.url).searchParams
    const disciplineId = params.get('disciplineId')
    const maxLevel = params.get('maxLevel')
    if (!DISCIPLINES.some(row => row.id === disciplineId) || !/^[1-5]$/.test(maxLevel ?? '') || params.getAll('disciplineId').length !== 1 || params.getAll('maxLevel').length !== 1 || [...params.keys()].some(key => !['disciplineId', 'maxLevel'].includes(key))) return response({ error: 'Informe uma Disciplina e um nível de 1 a 5 válidos.' }, 400)
    return response({ powers: disciplinePowerOptions(disciplineId!, Number(maxLevel)) })
  } catch {
    return response({ error: 'Não foi possível carregar os poderes.' }, 500)
  }
}
