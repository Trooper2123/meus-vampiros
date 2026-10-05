import { NextRequest, NextResponse } from 'next/server'
import { getSessionOrDev } from '@/lib/auth0'
import { ensureAllTables, getCampaignEventCalendarStatus, toggleCampaignEventCalendar } from '@/lib/db'
import { canManageCampaign } from '@/lib/auth/authorization'
import { isUserInCampaign } from '@/lib/availability'

// ─── Validation Helpers ────────────────────────────────────────────────────────

function isValidUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

// ─── Request Body Types ───────────────────────────────────────────────────────

type ToggleStatusBody = {
  campaignId: string
  enabled: boolean
}

// ─── Error Responses ──────────────────────────────────────────────────────────

function unauthorized(): NextResponse {
  return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
}

function forbidden(): NextResponse {
  return NextResponse.json({ error: 'Acesso negado. Apenas mestres podem realizar esta ação.' }, { status: 403 })
}

function badRequest(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 400 })
}

// ─── GET /api/campaign-event-calendar/status ──────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    await ensureAllTables()
    const session = await getSessionOrDev()
    
    if (!session?.user) {
      return unauthorized()
    }

    const { searchParams } = new URL(request.url)
    const campaignId = searchParams.get('campaignId')

    // Validate required params
    if (!campaignId) {
      return badRequest('Parâmetro campaignId é obrigatório.')
    }

    if (!isValidUUID(campaignId)) {
      return badRequest('ID da mesa inválido.')
    }

    // Check if user is participant of the campaign (master or has a character)
    if (!(await isUserInCampaign(campaignId, session.user.sub))) {
      return forbidden()
    }

    // Get calendar status (returns null if no record exists)
    const status = await getCampaignEventCalendarStatus(campaignId)

    // Return enabled: false if no record exists
    const enabled = status?.enabled ?? false

    return NextResponse.json({ enabled })
  } catch (error) {
    console.error('[GET /api/campaign-event-calendar/status]', error)
    return NextResponse.json({ error: 'Não foi possível verificar o status do calendário.' }, { status: 500 })
  }
}

// ─── PATCH /api/campaign-event-calendar/status ────────────────────────────────

export async function PATCH(request: NextRequest) {
  try {
    await ensureAllTables()
    const session = await getSessionOrDev()
    
    if (!session?.user) {
      return unauthorized()
    }

    const body: ToggleStatusBody = await request.json()
    const { campaignId, enabled } = body

    // Validate required fields
    if (!campaignId || typeof enabled !== 'boolean') {
      return badRequest('Campos campaignId e enabled são obrigatórios.')
    }

    if (!isValidUUID(campaignId)) {
      return badRequest('ID da mesa inválido.')
    }

    // Check authorization - only master can toggle the calendar
    if (!await canManageCampaign(session.user.sub, campaignId)) {
      return forbidden()
    }

    // Toggle the calendar status
    const result = await toggleCampaignEventCalendar(campaignId, enabled)

    return NextResponse.json({ enabled: result.enabled })
  } catch (error) {
    console.error('[PATCH /api/campaign-event-calendar/status]', error)
    return NextResponse.json({ error: 'Não foi possível atualizar o status do calendário.' }, { status: 500 })
  }
}
