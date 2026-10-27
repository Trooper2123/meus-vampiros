'use client'

import { X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { REAL_MONTHS, REAL_WEEKDAYS, type CampaignCalendarConfig, type CampaignEvent, type CampaignEventVisibility, type EventFormData } from '@/lib/types/campaign-event'
import styles from './campaign-calendar.module.css'

type Props = { event?: CampaignEvent | null; config: CampaignCalendarConfig; submitting: boolean; error: string | null; onClose: () => void; onSubmit: (data: EventFormData) => Promise<void> }

export function EventFormModal({ event, config, submitting, error, onClose, onSubmit }: Readonly<Props>) {
  const [title, setTitle] = useState(event?.title ?? '')
  const [description, setDescription] = useState(event?.description ?? '')
  const [eventDate, setEventDate] = useState(event?.eventDate ?? '')
  const [eventTime, setEventTime] = useState(event?.eventTime?.slice(0, 5) ?? '')
  const [year, setYear] = useState(String(event?.fictionalYear ?? new Date().getFullYear()))
  const availableMonths = config.mode === 'custom' ? config.months : [...REAL_MONTHS]
  const availableWeekdays = config.mode === 'custom' ? config.weekdays : [...REAL_WEEKDAYS]
  const [month, setMonth] = useState(event?.fictionalMonth ?? availableMonths[0] ?? '')
  const [weekday, setWeekday] = useState(event?.fictionalWeekday ?? availableWeekdays[0] ?? '')
  const [visibility, setVisibility] = useState<CampaignEventVisibility>(event?.visibility ?? 'everyone')

  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const node = dialog.current
    node?.showModal()
    return () => node?.close()
  }, [])

  const fictional = config.mode !== 'real'

  return <dialog ref={dialog} className={styles.modalPanel} aria-labelledby="event-form-title" onCancel={event => { event.preventDefault(); if (!submitting) { onClose() } }} onClick={event => {
    const bounds = event.currentTarget.getBoundingClientRect()
    if (!submitting && event.target === event.currentTarget && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) { onClose() }
  }}><div className="flex items-start justify-between gap-4 border-b border-border pb-4"><div><p className="eyebrow">Calendário da crônica</p><h2 id="event-form-title" className="mt-2 font-serif text-2xl">{event ? 'Editar evento' : 'Criar evento'}</h2></div><button type="button" className="button-ghost" onClick={onClose} disabled={submitting} aria-label="Fechar formulário"><X className="size-4" aria-hidden="true" /></button></div>
    <form className="mt-6 flex flex-col gap-4" onSubmit={(submitEvent) => { submitEvent.preventDefault(); const monthIndex = availableMonths.indexOf(month) + 1; const weekdayIndex = availableWeekdays.indexOf(weekday) + 1; void onSubmit({ title: title.trim(), description: description.trim() || null, eventDate: fictional ? null : eventDate, eventTime: eventTime || null, fictionalYear: fictional ? Number(year) : null, fictionalMonth: fictional ? month : null, fictionalMonthIndex: fictional ? monthIndex : null, fictionalWeekday: fictional ? weekday : null, fictionalWeekdayIndex: fictional ? weekdayIndex : null, visibility }) }}>
      <label className="sheet-field"><span>Título</span><input autoFocus required maxLength={100} value={title} onChange={(inputEvent) => setTitle(inputEvent.target.value)} /></label>
      <label className="sheet-field"><span>Descrição</span><textarea rows={4} maxLength={1000} value={description} onChange={(inputEvent) => setDescription(inputEvent.target.value)} /></label>
      {fictional ? <div className="sheet-grid sheet-grid-3"><label className="sheet-field"><span>Dia da semana</span><select className="select" required value={weekday} onChange={(inputEvent) => setWeekday(inputEvent.target.value)}>{availableWeekdays.map((name) => <option key={name}>{name}</option>)}</select></label><label className="sheet-field"><span>Mês</span><select className="select" required value={month} onChange={(inputEvent) => setMonth(inputEvent.target.value)}>{availableMonths.map((name) => <option key={name}>{name}</option>)}</select></label><label className="sheet-field"><span>Ano</span><input required type="number" min="0" max="999999" value={year} onChange={(inputEvent) => setYear(inputEvent.target.value)} /></label></div> : <label className="sheet-field"><span>Data</span><input required type="date" value={eventDate} onChange={(inputEvent) => setEventDate(inputEvent.target.value)} /></label>}
      <label className="sheet-field"><span>Horário opcional</span><input type="time" value={eventTime} onChange={(inputEvent) => setEventTime(inputEvent.target.value)} /></label>
      <label className="sheet-field"><span>Visibilidade</span><select className="select" value={visibility} onChange={(inputEvent) => setVisibility(inputEvent.target.value as CampaignEventVisibility)}><option value="everyone">Todos os participantes</option><option value="master">Apenas mestre</option></select></label>
      {error && <p role="alert" className="text-sm text-primary">{error}</p>}<div className="flex flex-wrap justify-end gap-3 border-t border-border pt-4"><button type="button" className="button-ghost" onClick={onClose} disabled={submitting}>Cancelar</button><button type="submit" className="button-primary" disabled={submitting}>{submitting ? 'Salvando...' : 'Salvar evento'}</button></div>
    </form></dialog>
}
