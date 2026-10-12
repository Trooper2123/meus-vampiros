export type CampaignEventVisibility = 'master' | 'everyone'
export type CampaignCalendarMode = 'real' | 'fictional' | 'custom'

export const REAL_WEEKDAYS = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'] as const
export const REAL_MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'] as const

export type CampaignCalendarConfig = {
  mode: CampaignCalendarMode
  weekdays: string[]
  months: string[]
}

export type CampaignEvent = {
  id: string
  campaignId: string
  title: string
  description: string | null
  eventDate: string | null
  eventTime: string | null
  fictionalYear: number | null
  fictionalMonth: string | null
  fictionalMonthIndex: number | null
  fictionalWeekday: string | null
  fictionalWeekdayIndex: number | null
  visibility: CampaignEventVisibility
  createdAt: Date | string
}

export type EventFormData = {
  campaignId?: string
  eventId?: string
  title?: string
  description?: string | null
  eventDate?: string | null
  eventTime?: string | null
  fictionalYear?: number | null
  fictionalMonth?: string | null
  fictionalMonthIndex?: number | null
  fictionalWeekday?: string | null
  fictionalWeekdayIndex?: number | null
  visibility?: CampaignEventVisibility
}

export function sortCampaignEventsChronologically(events: CampaignEvent[]): CampaignEvent[] {
  return [...events].sort((firstEvent, secondEvent) => {
    const firstDate = firstEvent.eventDate ?? `${String(firstEvent.fictionalYear ?? 0).padStart(6, '0')}-${String(firstEvent.fictionalMonthIndex ?? 0).padStart(3, '0')}-${String(firstEvent.fictionalWeekdayIndex ?? 0).padStart(3, '0')}`
    const secondDate = secondEvent.eventDate ?? `${String(secondEvent.fictionalYear ?? 0).padStart(6, '0')}-${String(secondEvent.fictionalMonthIndex ?? 0).padStart(3, '0')}-${String(secondEvent.fictionalWeekdayIndex ?? 0).padStart(3, '0')}`
    const dateComparison = firstDate.localeCompare(secondDate)
    if (dateComparison !== 0) return dateComparison

    return (firstEvent.eventTime ?? '24:00').localeCompare(secondEvent.eventTime ?? '24:00')
  })
}
