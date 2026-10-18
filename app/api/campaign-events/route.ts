import { NextRequest, NextResponse } from 'next/server'
import { getSessionOrDev } from '@/lib/auth0'
import { ensureAllTables, createCampaignEvent, getCampaignEventById, getCampaignEventCalendarStatus, getCampaignEventsByYear, updateCampaignEvent, deleteCampaignEvent } from '@/lib/db'
import { canManageCampaign } from '@/lib/auth/authorization'
import { isUserInCampaign } from '@/lib/availability'
import { REAL_MONTHS, REAL_WEEKDAYS, type EventFormData } from '@/lib/types/campaign-event'

// ─── Validation Helpers ────────────────────────────────────────────────────────

function isValidUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

function isValidDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function isValidTime(value: string | null): boolean {
  if (value === null) return true
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
}

function isValidVisibility(value: string): value is 'master' | 'everyone' {
  return value === 'master' || value === 'everyone'
}

// ─── Request Body Types ───────────────────────────────────────────────────────

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

// ─── GET /api/campaign-events ─────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    await ensureAllTables()
    const session = await getSessionOrDev()

    if (!session?.user) {
      return unauthorized()
    }

    const { searchParams } = new URL(request.url)
    const campaignId = searchParams.get('campaignId')
    const yearParam = searchParams.get('year')

    // Validate required params
    if (!campaignId) {
      return badRequest('Parâmetros campaignId e year são obrigatórios.')
    }

    if (!isValidUUID(campaignId)) {
      return badRequest('ID da mesa inválido.')
    }

    const year = yearParam === null ? undefined : Number.parseInt(yearParam, 10)
    if (year !== undefined && (Number.isNaN(year) || year < 0 || year > 999999)) {
      return badRequest('Ano inválido.')
    }

    // Check if user is participant of the campaign
    if (!await isUserInCampaign(campaignId, session.user.sub)) {
      return forbidden()
    }

    const isMaster = await canManageCampaign(session.user.sub, campaignId)
    const events = await getCampaignEventsByYear(campaignId, year)

    return NextResponse.json({ events: isMaster ? events : events.filter((event) => event.visibility === 'everyone') })
  } catch (error) {
    console.error('[GET /api/campaign-events]', error)
    return NextResponse.json({ error: 'Não foi possível carregar os eventos.' }, { status: 500 })
  }
}

// ─── POST /api/campaign-events ────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    await ensureAllTables()
    const session = await getSessionOrDev()

    if (!session?.user) {
      return unauthorized()
    }

    const body: EventFormData = await request.json()
    const { campaignId, title, description, eventDate, eventTime, visibility, fictionalYear, fictionalMonth, fictionalMonthIndex, fictionalWeekday, fictionalWeekdayIndex } = body

    // Validate required fields
    if (!campaignId || !title || !visibility || (!eventDate && fictionalYear === undefined)) {
      return badRequest('Campos campaignId, title, eventDate e visibility são obrigatórios.')
    }

    if (!isValidUUID(campaignId)) {
      return badRequest('ID da mesa inválido.')
    }

    if (typeof title !== 'string' || title.trim().length === 0 || title.length > 100) {
      return badRequest('Título deve ter entre 1 e 100 caracteres.')
    }

    const fieldsError = validateNewEventFields(body)
    if (fieldsError) return fieldsError

    // Check authorization - only master can create events
    if (!await canManageCampaign(session.user.sub, campaignId)) {
      return forbidden()
    }

    const calendar = await getCampaignEventCalendarStatus(campaignId)
    if (!eventDate && calendar?.mode === 'fictional' && (!REAL_MONTHS.includes(fictionalMonth as typeof REAL_MONTHS[number]) || !REAL_WEEKDAYS.includes(fictionalWeekday as typeof REAL_WEEKDAYS[number]))) {
      return badRequest('Use um dia da semana e um mês reais no modo de data fictícia livre.')
    }
    if (!eventDate && calendar?.mode === 'custom' && (!calendar.months.includes(fictionalMonth ?? '') || !calendar.weekdays.includes(fictionalWeekday ?? ''))) {
      return badRequest('Use os dias e meses definidos no calendário personalizado.')
    }

    // Create the event
    const result = await createCampaignEvent(
      campaignId,
      title.trim(),
      description?.trim() || null,
      eventDate ?? null,
      eventTime ?? null,
      visibility,
      { fictionalYear: fictionalYear ?? null, fictionalMonth: fictionalMonth?.trim() ?? null, fictionalMonthIndex: fictionalMonthIndex ?? null, fictionalWeekday: fictionalWeekday?.trim() ?? null, fictionalWeekdayIndex: fictionalWeekdayIndex ?? null }
    )

    // Get the created event
    const events = await getCampaignEventsByYear(campaignId, eventDate ? Number.parseInt(eventDate.split('-')[0], 10) : Number(fictionalYear))
    const createdEvent = events.find(e => e.id === result.id)

    if (!createdEvent) {
      return badRequest('Não foi possível recuperar o evento criado.')
    }

    return NextResponse.json({ event: createdEvent }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/campaign-events]', error)
    return NextResponse.json({ error: 'Não foi possível criar o evento.' }, { status: 500 })
  }
}

// ─── PATCH /api/campaign-events ───────────────────────────────────────────────

export async function PATCH(request: NextRequest) {
  try {
    await ensureAllTables()
    const session = await getSessionOrDev()

    if (!session?.user) {
      return unauthorized()
    }

    const body: EventFormData = await request.json()
    const { eventId, title, description, eventDate, eventTime, visibility, fictionalYear, fictionalMonth, fictionalMonthIndex, fictionalWeekday, fictionalWeekdayIndex } = body

    // Validate required fields
    if (!eventId) {
      return badRequest('Campo eventId é obrigatório.')
    }

    if (!isValidUUID(eventId)) {
      return badRequest('ID do evento inválido.')
    }

    // Check if event exists and get campaignId
    const existingEvent = await getCampaignEventById(eventId)
    if (!existingEvent) {
      return badRequest('Evento não encontrado.')
    }

    // Check authorization - only master can update events
    if (!await canManageCampaign(session.user.sub, existingEvent.campaignId)) {
      return forbidden()
    }

    const calendar = await getCampaignEventCalendarStatus(existingEvent.campaignId)
    if (eventDate === null && calendar?.mode === 'fictional' && (!REAL_MONTHS.includes(fictionalMonth as typeof REAL_MONTHS[number]) || !REAL_WEEKDAYS.includes(fictionalWeekday as typeof REAL_WEEKDAYS[number]))) {
      return badRequest('Use um dia da semana e um mês reais no modo de data fictícia livre.')
    }

    const changes = readEventChanges(body)
    if (changes instanceof NextResponse) return changes
    const updateData = changes

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      return badRequest('Nenhum campo para atualizar.')
    }

    // Update the event
    await updateCampaignEvent(eventId, updateData)
    const updatedEvent = await getCampaignEventById(eventId)

    if (!updatedEvent) {
      return badRequest('Não foi possível recuperar o evento atualizado.')
    }

    return NextResponse.json({ event: updatedEvent })
  } catch (error) {
    console.error('[PATCH /api/campaign-events]', error)
    return NextResponse.json({ error: 'Não foi possível atualizar o evento.' }, { status: 500 })
  }
}

// ─── DELETE /api/campaign-events ──────────────────────────────────────────────

export async function DELETE(request: NextRequest) {
  try {
    await ensureAllTables()
    const session = await getSessionOrDev()

    if (!session?.user) {
      return unauthorized()
    }

    const body: { eventId: string } = await request.json()
    const { eventId } = body

    // Validate required fields
    if (!eventId) {
      return badRequest('Campo eventId é obrigatório.')
    }

    if (!isValidUUID(eventId)) {
      return badRequest('ID do evento inválido.')
    }

    // Check if event exists and get campaignId
    const existingEvent = await getCampaignEventById(eventId)
    if (!existingEvent) {
      return badRequest('Evento não encontrado.')
    }

    // Check authorization - only master can delete events
    if (!await canManageCampaign(session.user.sub, existingEvent.campaignId)) {
      return forbidden()
    }

    // Delete the event
    await deleteCampaignEvent(eventId)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[DELETE /api/campaign-events]', error)
    return NextResponse.json({ error: 'Não foi possível excluir o evento.' }, { status: 500 })
  }
}

function validateNewEventFields({ description, eventDate, fictionalYear, fictionalMonth, fictionalWeekday, eventTime, visibility }: EventFormData) {
    if (description !== undefined && description !== null) {
      if (typeof description !== 'string' || description.length > 1000) {
        return badRequest('Descrição deve ter no máximo 1000 caracteres.')
      }
    }

    if (eventDate && !isValidDate(eventDate)) {
      return badRequest('Data inválida. Use o formato YYYY-MM-DD.')
    }

    if (!eventDate && (!Number.isInteger(fictionalYear) || Number(fictionalYear) < 0 || !fictionalMonth?.trim() || !fictionalWeekday?.trim())) {
      return badRequest('Informe dia da semana, mês e ano fictícios válidos.')
    }

    if (!isValidTime(eventTime ?? null)) {
      return badRequest('Hora inválida. Use o formato HH:MM.')
    }

    if (!isValidVisibility(visibility ?? '')) {
      return badRequest('Visibilidade deve ser "master" ou "everyone".')
    }

}

function readEventChanges({ title, description, eventDate, fictionalYear, fictionalMonth, fictionalMonthIndex, fictionalWeekday, fictionalWeekdayIndex, eventTime, visibility }: EventFormData) {
    // Validate provided fields
    const updateData: Partial<EventFormData> = {}

    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim().length === 0 || title.length > 100) {
        return badRequest('Título deve ter entre 1 e 100 caracteres.')
      }
      updateData.title = title.trim()
    }

    if (description !== undefined) {
      if (description !== null && (typeof description !== 'string' || description.length > 1000)) {
        return badRequest('Descrição deve ter no máximo 1000 caracteres.')
      }
      updateData.description = description?.trim() ?? null
    }

    if (eventDate !== undefined) {
      if (eventDate !== null && !isValidDate(eventDate)) {
        return badRequest('Data inválida. Use o formato YYYY-MM-DD.')
      }
      updateData.eventDate = eventDate
    }

    if (fictionalYear !== undefined) updateData.fictionalYear = fictionalYear
    if (fictionalMonth !== undefined) updateData.fictionalMonth = fictionalMonth?.trim() ?? null
    if (fictionalMonthIndex !== undefined) updateData.fictionalMonthIndex = fictionalMonthIndex
    if (fictionalWeekday !== undefined) updateData.fictionalWeekday = fictionalWeekday?.trim() ?? null
    if (fictionalWeekdayIndex !== undefined) updateData.fictionalWeekdayIndex = fictionalWeekdayIndex

    if (eventTime !== undefined) {
      if (!isValidTime(eventTime)) {
        return badRequest('Hora inválida. Use o formato HH:MM.')
      }
      updateData.eventTime = eventTime
    }

    if (visibility !== undefined) {
      if (!isValidVisibility(visibility)) {
        return badRequest('Visibilidade deve ser "master" ou "everyone".')
      }
      updateData.visibility = visibility
    }


  return updateData
}
