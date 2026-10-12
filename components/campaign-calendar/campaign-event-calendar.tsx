'use client'

import { Plus } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import type { CampaignEvent, EventFormData } from '@/lib/types/campaign-event'
import { CalendarYearSelector } from './calendar-year-selector'
import { EventCard } from './event-card'
import { EventFormModal } from './event-form-modal'
import styles from './campaign-calendar.module.css'

function currentYearInSaoPaulo() {
  return Number(new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', year: 'numeric' }).format(new Date()))
}

export function CampaignEventCalendar({ campaignId, master }: { campaignId: string; master: boolean }) {
  const [year, setYear] = useState(currentYearInSaoPaulo)
  const [events, setEvents] = useState<CampaignEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingEvent, setEditingEvent] = useState<CampaignEvent | null | undefined>(undefined)
  const [submitting, setSubmitting] = useState(false)

  const loadEvents = useCallback(async () => {
    await Promise.resolve()
    setLoading(true)
    setError(null)
    const response = await fetch(`/api/campaign-events?campaignId=${encodeURIComponent(campaignId)}&year=${year}`)
    const body = await response.json().catch(() => ({}))
    setLoading(false)
    if (!response.ok) { setError(body.error ?? 'Não foi possível carregar os eventos.'); return }
    setEvents(body.events ?? [])
  }, [campaignId, year])

  useEffect(() => {
    let active = true
    fetch(`/api/campaign-events?campaignId=${encodeURIComponent(campaignId)}&year=${year}`)
      .then(async (response) => ({ response, body: await response.json().catch(() => ({})) }))
      .then(({ response, body }) => {
        if (!active) return
        setLoading(false)
        if (!response.ok) { setError(body.error ?? 'Não foi possível carregar os eventos.'); return }
        setEvents(body.events ?? [])
      })
      .catch(() => {
        if (active) { setLoading(false); setError('Não foi possível carregar os eventos.') }
      })
    return () => { active = false }
  }, [campaignId, year])

  async function saveEvent(data: EventFormData) {
    setSubmitting(true)
    setError(null)
    const response = await fetch('/api/campaign-events', {
      method: editingEvent ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingEvent ? { ...data, eventId: editingEvent.id } : { ...data, campaignId }),
    })
    const body = await response.json().catch(() => ({}))
    setSubmitting(false)
    if (!response.ok) { setError(body.error ?? 'Não foi possível salvar o evento.'); return }
    setEditingEvent(undefined)
    await loadEvents()
  }

  async function deleteEvent(event: CampaignEvent) {
    if (!window.confirm(`Excluir o evento “${event.title}”?`)) return
    setError(null)
    const response = await fetch('/api/campaign-events', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ eventId: event.id }) })
    if (!response.ok) { const body = await response.json().catch(() => ({})); setError(body.error ?? 'Não foi possível excluir o evento.'); return }
    await loadEvents()
  }

  return (
    <section aria-labelledby="campaign-events-title" className="border border-border p-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5"><div><p className="eyebrow">Linha do tempo</p><h2 id="campaign-events-title" className="mt-2 font-serif text-2xl">Calendário de eventos</h2></div><div className="flex flex-wrap items-center gap-3"><CalendarYearSelector year={year} onChange={(nextYear) => { setLoading(true); setYear(nextYear) }} />{master && <button type="button" className="button-primary inline-flex items-center gap-2" onClick={() => setEditingEvent(null)}><Plus className="size-4" /> Criar evento</button>}</div></div>
      {error && <p role="alert" className="mt-4 text-sm text-primary">{error}</p>}
      {loading ? <p role="status" className="mt-6 text-sm text-muted-foreground">Carregando eventos...</p> : events.length === 0 ? <div className="empty-state mt-6"><p>Nenhum evento cadastrado em {year}.</p></div> : <div className={`${styles.eventGrid} mt-6`}>{events.map((event) => <EventCard key={event.id} event={event} master={master} onEdit={setEditingEvent} onDelete={(selectedEvent) => void deleteEvent(selectedEvent)} />)}</div>}
      {editingEvent !== undefined && <EventFormModal event={editingEvent} submitting={submitting} error={error} onClose={() => { setEditingEvent(undefined); setError(null) }} onSubmit={saveEvent} />}
    </section>
  )
}
