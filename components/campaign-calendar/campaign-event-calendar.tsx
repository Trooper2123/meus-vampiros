'use client'

import { Plus } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { REAL_MONTHS, sortCampaignEventsChronologically, type CampaignCalendarConfig, type CampaignEvent, type EventFormData } from '@/lib/types/campaign-event'
import { EventCard } from './event-card'
import { EventFormModal } from './event-form-modal'
import styles from './campaign-calendar.module.css'

function eventYear(event: CampaignEvent) {
  return event.eventDate ? Number(event.eventDate.slice(0, 4)) : event.fictionalYear
}

function eventMonth(event: CampaignEvent) {
  return event.eventDate ? Number(event.eventDate.slice(5, 7)) : event.fictionalMonthIndex
}

export function CampaignEventCalendar({ campaignId, master, config }: Readonly<{ campaignId: string; master: boolean; config: CampaignCalendarConfig }>) {
  const [events, setEvents] = useState<CampaignEvent[]>([])
  const [yearFilter, setYearFilter] = useState('all')
  const [monthFilter, setMonthFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingEvent, setEditingEvent] = useState<CampaignEvent | null | undefined>(undefined)
  const [submitting, setSubmitting] = useState(false)

  const loadEvents = useCallback(async () => {
    setLoading(true); setError(null)
    const response = await fetch(`/api/campaign-events?campaignId=${encodeURIComponent(campaignId)}`)
    const body = await response.json().catch(() => ({}))
    setLoading(false)
    if (!response.ok) { setError(body.error ?? 'Não foi possível carregar os eventos.'); return }
    setEvents(sortCampaignEventsChronologically(body.events ?? []))
  }, [campaignId])

  useEffect(() => { void loadEvents() }, [loadEvents])

  const showFilters = events.length > 20
  const years = useMemo(() => [...new Set(events.map(eventYear).filter((year): year is number => year !== null))].sort((first, second) => first - second), [events])
  const months = useMemo(() => [...new Map(events.map((event) => [eventMonth(event), event.fictionalMonth ?? (eventMonth(event) ? REAL_MONTHS[eventMonth(event)! - 1] : '')]).filter(([index]) => index !== null) as Array<[number, string]>).entries()].sort(([first], [second]) => first - second), [events])
  const visibleEvents = showFilters ? events.filter((event) => (yearFilter === 'all' || eventYear(event) === Number(yearFilter)) && (monthFilter === 'all' || eventMonth(event) === Number(monthFilter))) : events

  async function saveEvent(data: EventFormData) {
    setSubmitting(true); setError(null)
    const response = await fetch('/api/campaign-events', { method: editingEvent ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editingEvent ? { ...data, eventId: editingEvent.id } : { ...data, campaignId }) })
    const body = await response.json().catch(() => ({}))
    setSubmitting(false)
    if (!response.ok) { setError(body.error ?? 'Não foi possível salvar o evento.'); return }
    setEditingEvent(undefined); await loadEvents()
  }

  async function deleteEvent(event: CampaignEvent) {
    if (!window.confirm(`Excluir o evento “${event.title}”?`)) return
    const response = await fetch('/api/campaign-events', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ eventId: event.id }) })
    if (!response.ok) { const body = await response.json().catch(() => ({})); setError(body.error ?? 'Não foi possível excluir o evento.'); return }
    await loadEvents()
  }

  let calendarContent
  if (loading) {
    calendarContent = <output className="block mt-6 text-sm text-muted-foreground">Carregando eventos...</output>
  } else if (events.length === 0) {
    calendarContent = <div className="empty-state mt-6"><p>Nenhum evento cadastrado.</p></div>
  } else if (visibleEvents.length === 0) {
    calendarContent = <div className="empty-state mt-6"><p>Nenhum evento corresponde aos filtros selecionados.</p></div>
  } else {
    calendarContent = <div className={`${styles.eventGrid} mt-6`}>{visibleEvents.map((event) => <EventCard key={event.id} event={event} master={master} onEdit={setEditingEvent} onDelete={(selectedEvent) => void deleteEvent(selectedEvent)} />)}</div>
  }
  return <section aria-labelledby="campaign-events-title" className="border border-border p-6">
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5"><div><p className="eyebrow">Linha do tempo</p><h2 id="campaign-events-title" className="mt-2 font-serif text-2xl">Calendário de eventos</h2></div>{master && <button type="button" className="button-primary inline-flex items-center gap-2" onClick={() => setEditingEvent(null)}><Plus className="size-4" aria-hidden="true" /> Criar evento</button>}</div>
    {showFilters && <div className="mt-5 grid grid-cols-1 gap-4 border-b border-border pb-5 sm:grid-cols-2" aria-label="Filtrar eventos"><label className="sheet-field"><span>Ano</span><select className="select" value={yearFilter} onChange={(event) => setYearFilter(event.target.value)}><option value="all">Todos os anos</option>{years.map((year) => <option key={year} value={year}>{year}</option>)}</select></label><label className="sheet-field"><span>Mês</span><select className="select" value={monthFilter} onChange={(event) => setMonthFilter(event.target.value)}><option value="all">Todos os meses</option>{months.map(([index, label]) => <option key={index} value={index}>{label}</option>)}</select></label></div>}
    {error && <p role="alert" className="mt-4 text-sm text-primary">{error}</p>}
    {calendarContent}
    {editingEvent !== undefined && <EventFormModal event={editingEvent} config={config} submitting={submitting} error={error} onClose={() => { setEditingEvent(undefined); setError(null) }} onSubmit={saveEvent} />}
  </section>
}
