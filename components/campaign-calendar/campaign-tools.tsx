'use client'

import { useEffect, useState } from 'react'
import { DateAvailabilityCalendar } from '@/components/date-availability-calendar'
import { CampaignCalendarToggle } from './campaign-calendar-toggle'
import { CampaignEventCalendar } from './campaign-event-calendar'
import { LiveKitRoomLink } from '@/components/livekit/livekit-room-link'

type CalendarStatus = { event: boolean; scheduling: boolean }

export function CampaignTools({ campaignId, master }: { campaignId: string; master: boolean }) {
  const [status, setStatus] = useState<CalendarStatus | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    Promise.all([
      fetch(`/api/campaign-event-calendar/status?campaignId=${encodeURIComponent(campaignId)}`).then((response) => response.ok ? response.json() : Promise.reject()),
      fetch(`/api/campaign-scheduling-calendar/status?campaignId=${encodeURIComponent(campaignId)}`).then((response) => response.ok ? response.json() : Promise.reject()),
    ]).then(([eventStatus, schedulingStatus]) => {
      if (active) setStatus({ event: eventStatus.enabled, scheduling: schedulingStatus.enabled })
    }).catch(() => {
      if (active) setError('Não foi possível carregar as configurações dos calendários.')
    })
    return () => { active = false }
  }, [campaignId])

  if (error) return <p role="alert" className="text-sm text-primary">{error}</p>
  if (!status) return <p role="status" className="text-sm text-muted-foreground">Carregando calendários...</p>

  return (
    <div className="flex flex-col gap-8">
      {master && <section aria-labelledby="calendar-settings-title"><p className="eyebrow">Configurações</p><h2 id="calendar-settings-title" className="mt-2 font-serif text-2xl">Calendários da mesa</h2><div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2"><CampaignCalendarToggle campaignId={campaignId} calendar="scheduling" label="Calendário de marcação" initialEnabled={status.scheduling} onChange={(enabled) => setStatus((current) => current ? { ...current, scheduling: enabled } : current)} /><CampaignCalendarToggle campaignId={campaignId} calendar="event" label="Calendário de eventos" initialEnabled={status.event} onChange={(enabled) => setStatus((current) => current ? { ...current, event: enabled } : current)} /></div></section>}
      {status.scheduling && <DateAvailabilityCalendar campaignId={campaignId} master={master} />}
      {status.event && <CampaignEventCalendar campaignId={campaignId} master={master} />}
      <LiveKitRoomLink campaignId={campaignId} master={master} />
    </div>
  )
}
