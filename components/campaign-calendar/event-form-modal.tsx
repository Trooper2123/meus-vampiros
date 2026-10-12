'use client'

import { X } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { CampaignEvent, CampaignEventVisibility, EventFormData } from '@/lib/types/campaign-event'
import styles from './campaign-calendar.module.css'

type EventFormModalProps = {
  event?: CampaignEvent | null
  submitting: boolean
  error: string | null
  onClose: () => void
  onSubmit: (data: EventFormData) => Promise<void>
}

export function EventFormModal({ event, submitting, error, onClose, onSubmit }: EventFormModalProps) {
  const [title, setTitle] = useState(event?.title ?? '')
  const [description, setDescription] = useState(event?.description ?? '')
  const [eventDate, setEventDate] = useState(event?.eventDate ?? '')
  const [eventTime, setEventTime] = useState(event?.eventTime?.slice(0, 5) ?? '')
  const [visibility, setVisibility] = useState<CampaignEventVisibility>(event?.visibility ?? 'everyone')

  useEffect(() => {
    const closeOnEscape = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key === 'Escape' && !submitting) onClose()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [onClose, submitting])

  return (
    <div className={styles.modalBackdrop} role="presentation" onMouseDown={(mouseEvent) => {
      if (mouseEvent.target === mouseEvent.currentTarget && !submitting) onClose()
    }}>
      <section className={styles.modalPanel} role="dialog" aria-modal="true" aria-labelledby="event-form-title">
        <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
          <div><p className="eyebrow">Calendário da crônica</p><h2 id="event-form-title" className="mt-2 font-serif text-2xl">{event ? 'Editar evento' : 'Criar evento'}</h2></div>
          <button type="button" className="button-ghost" onClick={onClose} disabled={submitting} aria-label="Fechar formulário"><X className="size-4" /></button>
        </div>
        <form className="mt-6 flex flex-col gap-4" onSubmit={(submitEvent) => {
          submitEvent.preventDefault()
          void onSubmit({ title: title.trim(), description: description.trim() || null, eventDate, eventTime: eventTime || null, visibility })
        }}>
          <label className="sheet-field"><span>Título</span><input autoFocus required maxLength={100} value={title} onChange={(inputEvent) => setTitle(inputEvent.target.value)} /></label>
          <label className="sheet-field"><span>Descrição</span><textarea rows={4} maxLength={1000} value={description} onChange={(inputEvent) => setDescription(inputEvent.target.value)} /></label>
          <div className="sheet-grid sheet-grid-2">
            <label className="sheet-field"><span>Data</span><input required type="date" value={eventDate} onChange={(inputEvent) => setEventDate(inputEvent.target.value)} /></label>
            <label className="sheet-field"><span>Horário</span><input type="time" value={eventTime} onChange={(inputEvent) => setEventTime(inputEvent.target.value)} /></label>
          </div>
          <label className="sheet-field"><span>Visibilidade</span><select className="select" value={visibility} onChange={(inputEvent) => setVisibility(inputEvent.target.value as CampaignEventVisibility)}><option value="everyone">Todos os participantes</option><option value="master">Apenas mestre</option></select></label>
          {error && <p role="alert" className="text-sm text-primary">{error}</p>}
          <div className="flex flex-wrap justify-end gap-3 border-t border-border pt-4"><button type="button" className="button-ghost" onClick={onClose} disabled={submitting}>Cancelar</button><button type="submit" className="button-primary" disabled={submitting}>{submitting ? 'Salvando...' : 'Salvar evento'}</button></div>
        </form>
      </section>
    </div>
  )
}
