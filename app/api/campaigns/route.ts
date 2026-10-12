import { getSessionOrDev } from '@/lib/auth0'
import { NextResponse } from 'next/server'
import { createCampaign, getCampaignsForMaster, hasMasterAccess } from '@/lib/campaigns'
import { db, ensureAllTables } from '@/lib/db'
import { sql } from 'drizzle-orm'

async function getAuthenticatedUser() {
  const session = await getSessionOrDev()
  return session?.user ?? null
}

export async function GET() {
  try {
    await ensureAllTables()
    const user = await getAuthenticatedUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    if (!await hasMasterAccess(user)) return NextResponse.json({ campaigns: [] })
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
    const body = await request.json()
    const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim() : null
    if (!name) return NextResponse.json({ error: 'Nome da campanha é obrigatório.' }, { status: 400 })
    const theme = typeof body.theme === 'string' && body.theme.trim() ? body.theme.trim() : null
    const principios = typeof body.principios === 'string' && body.principios.trim() ? body.principios.trim() : null
    const averageXp = typeof body.averageXp === 'number' && Number.isFinite(body.averageXp) ? Math.trunc(body.averageXp) : typeof body.averageXp === 'string' && body.averageXp.trim() ? Number.parseInt(body.averageXp, 10) : null
    const status = typeof body.status === 'string' && body.status.trim() ? body.status.trim() : 'Ativa'
    const lastSessionAt = typeof body.lastSessionAt === 'string' && body.lastSessionAt.trim() ? body.lastSessionAt.trim() : null
    const enableSchedulingCalendar = typeof body.enableSchedulingCalendar === 'boolean' ? body.enableSchedulingCalendar : true

    const campaign = await createCampaign(user.sub, { name, theme, principios, averageXp: Number.isFinite(averageXp) ? averageXp : null, status, lastSessionAt })

    // Criar registro no calendário de marcação com valor padrão do checkbox
    await db.execute(sql`
      INSERT INTO campaign_scheduling_calendars (campaign_id, enabled)
      VALUES (${campaign.id}, ${enableSchedulingCalendar})
    `)

    return NextResponse.json({ campaign }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Não foi possível criar a mesa.' }, { status: 500 })
  }
}
