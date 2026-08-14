import { auth0 } from '@/lib/auth0'
import { NextResponse } from 'next/server'
import { createCampaign, getCampaignsForMaster, isMaster } from '@/lib/campaigns'

async function getAuthenticatedUser() {
  const session = await auth0.getSession()
  return session?.user ?? null
}

export async function GET() {
  try {
    const user = await getAuthenticatedUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    if (!isMaster(user)) return NextResponse.json({ campaigns: [] })
    const campaigns = await getCampaignsForMaster(user.sub)
    return NextResponse.json({ campaigns })
  } catch {
    return NextResponse.json({ error: 'Não foi possível carregar as mesas.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    if (!isMaster(user)) return NextResponse.json({ error: 'Apenas mestres podem criar mesas.' }, { status: 403 })

    const body = await request.json()
    const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim() : null
    if (!name) return NextResponse.json({ error: 'Nome da campanha é obrigatório.' }, { status: 400 })
    const averageXp = typeof body.averageXp === 'number' && Number.isFinite(body.averageXp) ? Math.trunc(body.averageXp) : typeof body.averageXp === 'string' && body.averageXp.trim() ? Number.parseInt(body.averageXp, 10) : null
    const status = typeof body.status === 'string' && body.status.trim() ? body.status.trim() : 'Ativa'
    const lastSessionAt = typeof body.lastSessionAt === 'string' && body.lastSessionAt.trim() ? body.lastSessionAt.trim() : null

    const campaign = await createCampaign(user.sub, { name, averageXp: Number.isFinite(averageXp) ? averageXp : null, status, lastSessionAt })
    return NextResponse.json({ campaign }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Não foi possível criar a mesa.' }, { status: 500 })
  }
}
