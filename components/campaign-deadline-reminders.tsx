'use client'

import { campaignDaysUntil } from '@/lib/campaign-timezone'

import Link from 'next/link'
import { useEffect, useState } from 'react'

type Mission = { id: string; title: string; status: string; dueDate: string | null; eventDate: string | null }
type Event = { id: string; title: string; eventDate: string | null }

export function CampaignDeadlineReminders({ campaignId }: Readonly<{ campaignId: string }>) {
  const [timezone, setTimezone] = useState('UTC')
  const [missions, setMissions] = useState<Mission[]>([])
  const [events, setEvents] = useState<Event[]>([])
  useEffect(() => {
    let active = true
    void Promise.allSettled([
      fetch(`/api/campaigns/${encodeURIComponent(campaignId)}/missions`, { cache: 'no-store' }).then(async response => { if (!response.ok) throw new Error('Missões indisponíveis'); return response.json() }),
      fetch(`/api/campaign-events?campaignId=${encodeURIComponent(campaignId)}`, { cache: 'no-store' }).then(async response => { if (!response.ok) throw new Error('Eventos indisponíveis'); return response.json() }),
    ]).then(results => {
      if (!active) return
      if (results[0].status === 'fulfilled') (setMissions(results[0].value.missions ?? []), setTimezone(results[0].value.timezone ?? 'UTC'))
      if (results[1].status === 'fulfilled') setEvents(results[1].value.events ?? [])
    })
    return () => { active = false }
  }, [campaignId])
  const daysUntil = (date: string) => campaignDaysUntil(date, timezone)
  const reminders = [
    ...missions.filter(m => m.status === 'ACTIVE').flatMap(m => {
      const dates = [m.dueDate, m.eventDate].filter((date): date is string => Boolean(date))
      if (!dates.length) return []
      const date = dates.sort()[0]
      return [{ id: 'mission-' + m.id, title: m.title, kind: 'Missão', date, href: `/campaigns/${campaignId}?view=missions#mission-${m.id}` }]
    }),
    ...events.filter(e => e.eventDate).map(e => ({ id: 'event-' + e.id, title: e.title, kind: 'Evento', date: e.eventDate!, href: `/campaigns/${campaignId}?view=calendar&eventId=${e.id}` })),
  ].filter(item => daysUntil(item.date) <= 7).sort((a,b) => a.date.localeCompare(b.date)).slice(0,8)
  if (!reminders.length) return null
  return <section className="campaign-approved-card" aria-label="Lembretes de prazos e eventos">
    <div className="campaign-approved-card-title"><span>Lembretes de prazos</span></div>
    <p className="text-xs text-muted-foreground">Avisos na aplicação, visíveis conforme suas permissões.</p>
    <ul className="mt-3 flex flex-col gap-2">{reminders.map(item => { const days = daysUntil(item.date); return <li key={item.id} className="text-sm"><Link className="underline" href={item.href}>{item.kind}: {item.title}</Link> — {days < 0 ? `atrasado há ${-days} dia(s)` : days === 0 ? 'hoje' : `em ${days} dia(s)`}</li> })}</ul>
  </section>
}
