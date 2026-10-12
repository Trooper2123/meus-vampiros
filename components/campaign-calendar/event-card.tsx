import { CalendarDays, Clock3, Pencil, Trash2 } from 'lucide-react'
import type { CampaignEvent } from '@/lib/types/campaign-event'
import { VisibilityBadge } from './visibility-badge'

function formatDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'long' }).format(new Date(Date.UTC(year, month - 1, day, 12)))
}

function formatEventDate(event: CampaignEvent) {
  if (event.eventDate) return formatDate(event.eventDate)
  return [event.fictionalWeekday, event.fictionalMonth, event.fictionalYear].filter((value) => value !== null).join(', ')
}

export function EventCard({ event, master, onEdit, onDelete }: { event: CampaignEvent; master: boolean; onEdit: (event: CampaignEvent) => void; onDelete: (event: CampaignEvent) => void }) {
  return (
    <article className="flex flex-col border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><VisibilityBadge visibility={event.visibility} />{master && <div className="flex gap-2"><button type="button" className="button-ghost" onClick={() => onEdit(event)} aria-label={`Editar ${event.title}`}><Pencil className="size-3.5" /></button><button type="button" className="button-ghost" onClick={() => onDelete(event)} aria-label={`Excluir ${event.title}`}><Trash2 className="size-3.5" /></button></div>}</div>
      <h3 className="mt-4 font-serif text-xl">{event.title}</h3>
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground"><span className="inline-flex items-center gap-2"><CalendarDays className="size-3.5" aria-hidden="true" /> {formatEventDate(event)}</span>{event.eventTime && <span className="inline-flex items-center gap-2"><Clock3 className="size-3.5" aria-hidden="true" /> {event.eventTime.slice(0, 5)}</span>}</div>
      {event.description && <p className="mt-4 text-sm leading-6 text-muted-foreground">{event.description}</p>}
    </article>
  )
}
