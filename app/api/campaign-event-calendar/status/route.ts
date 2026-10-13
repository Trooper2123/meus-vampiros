import { NextRequest, NextResponse } from 'next/server'
import { getSessionOrDev } from '@/lib/auth0'
import { canManageCampaign } from '@/lib/auth/authorization'
import { isUserInCampaign } from '@/lib/availability'
import { ensureAllTables, getCampaignEventCalendarStatus, toggleCampaignEventCalendar, updateCampaignEventCalendarConfig } from '@/lib/db'
import type { CampaignCalendarMode } from '@/lib/types/campaign-event'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function cleanNames(names: unknown): string[] {
  if (!Array.isArray(names)) return []
  return names.filter((name): name is string => typeof name === 'string').map((name) => name.trim()).filter(Boolean).slice(0, 24)
}

export async function GET(request: NextRequest) {
  try {
    await ensureAllTables()
    const session = await getSessionOrDev()
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

    const campaignId = new URL(request.url).searchParams.get('campaignId') ?? ''
    if (!UUID_PATTERN.test(campaignId)) return NextResponse.json({ error: 'ID da mesa inválido.' }, { status: 400 })
    if (!await isUserInCampaign(campaignId, session.user.sub)) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })

    const status = await getCampaignEventCalendarStatus(campaignId)
    return NextResponse.json({ enabled: status?.enabled ?? false, mode: status?.mode ?? 'real', weekdays: status?.weekdays ?? [], months: status?.months ?? [] })
  } catch (error) {
    console.error('[GET /api/campaign-event-calendar/status]', error)
    return NextResponse.json({ error: 'Não foi possível verificar o calendário.' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await ensureAllTables()
    const session = await getSessionOrDev()
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    const campaignId = typeof body.campaignId === 'string' ? body.campaignId : ''
    if (!UUID_PATTERN.test(campaignId)) return NextResponse.json({ error: 'ID da mesa inválido.' }, { status: 400 })
    if (!await canManageCampaign(session.user.sub, campaignId)) return NextResponse.json({ error: 'Apenas o modelo.md pode configurar o calendário.' }, { status: 403 })

    const current = await getCampaignEventCalendarStatus(campaignId)
    const enabled = body.enabled === undefined ? current?.enabled ?? false : body.enabled
    if (typeof enabled !== 'boolean') return NextResponse.json({ error: 'Valor de habilitação inválido.' }, { status: 400 })

    const mode = (body.mode ?? current?.mode ?? 'real') as CampaignCalendarMode
    if (!['real', 'fictional', 'custom'].includes(mode)) return NextResponse.json({ error: 'Modo de calendário inválido.' }, { status: 400 })
    const weekdays = cleanNames(body.weekdays ?? current?.weekdays)
    const months = cleanNames(body.months ?? current?.months)
    if (mode === 'custom' && (weekdays.length === 0 || months.length === 0)) return NextResponse.json({ error: 'Informe os dias da semana e os meses personalizados.' }, { status: 400 })

    await toggleCampaignEventCalendar(campaignId, enabled)
    const config = await updateCampaignEventCalendarConfig(campaignId, { mode, weekdays, months })
    return NextResponse.json({ enabled, ...config })
  } catch (error) {
    console.error('[PATCH /api/campaign-event-calendar/status]', error)
    return NextResponse.json({ error: 'Não foi possível atualizar o calendário.' }, { status: 500 })
  }
}
