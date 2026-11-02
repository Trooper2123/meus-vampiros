'use client'

import { useEffect, useState } from 'react'
import { DateAvailabilityCalendar } from '@/components/date-availability-calendar'
import type { CampaignCalendarConfig } from '@/lib/types/campaign-event'
import { CampaignCalendarSettings } from './campaign-calendar-settings'
import { CampaignCalendarToggle } from './campaign-calendar-toggle'
import { CampaignEventCalendar } from './campaign-event-calendar'

type CalendarStatus = { event: boolean; scheduling: boolean; eventConfig: CampaignCalendarConfig }

export function CampaignTools({ campaignId, master, settingsOnly = false }: Readonly<{ campaignId: string; master: boolean; settingsOnly?: boolean }>) {
  const [status, setStatus] = useState<CalendarStatus | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    Promise.all([
      fetch(`/api/campaign-event-calendar/status?campaignId=${encodeURIComponent(campaignId)}`).then((response) => response.ok ? response.json() : Promise.reject(new Error('Falha ao carregar calendário de eventos.'))),
      fetch(`/api/campaign-scheduling-calendar/status?campaignId=${encodeURIComponent(campaignId)}`).then((response) => response.ok ? response.json() : Promise.reject(new Error('Falha ao carregar calendário de marcação.'))),
    ]).then(([eventStatus, schedulingStatus]) => {
      if (active) setStatus({ event: eventStatus.enabled, scheduling: schedulingStatus.enabled, eventConfig: { mode: eventStatus.mode ?? 'real', weekdays: eventStatus.weekdays ?? [], months: eventStatus.months ?? [] } })
    }).catch(() => { if (active) setError('Não foi possível carregar as configurações dos calendários.') })
    return () => { active = false }
  }, [campaignId])

  if (error) return <p role="alert" className="text-sm text-primary">{error}</p>
  if (!status) return <output className="block text-sm text-muted-foreground">Carregando calendários...</output>

  const settings = <section className="campaign-module-subsection campaign-calendar-settings-section" aria-labelledby="calendar-settings-title">
    <p className="eyebrow">Configurações</p>
    <h3 id="calendar-settings-title" className="mt-2 font-serif text-xl">Opções de calendários</h3>
    <p className="mt-2 text-sm text-muted-foreground">Ative a agenda de marcação e o calendário de eventos. Escolha o tipo de calendário e personalize seus períodos.</p>
    <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
      <CampaignCalendarToggle campaignId={campaignId} calendar="scheduling" label="Calendário de marcação" initialEnabled={status.scheduling} onChange={enabled => setStatus(current => current ? {...current,scheduling:enabled} : current)}/>
      <CampaignCalendarToggle campaignId={campaignId} calendar="event" label="Calendário de eventos" initialEnabled={status.event} onChange={enabled => setStatus(current => current ? {...current,event:enabled} : current)}/>
    </div>
    {status.event && <div className="mt-4"><CampaignCalendarSettings campaignId={campaignId} config={status.eventConfig} onChange={eventConfig => setStatus(current => current ? {...current,eventConfig} : current)}/></div>}
  </section>
  if (settingsOnly) return master ? settings : <p>Somente o Narrador pode configurar calendários.</p>

  return <div className="campaign-module-body campaign-calendar-workspace">
    {status.scheduling && <details className="campaign-module-subsection"><summary className="archive-disclosure"><span><span className="eyebrow block mb-3">Próximo encontro</span><span className="font-serif text-2xl">Disponibilidade</span></span><span className="archive-expand">Expandir</span><span className="archive-collapse">Recolher</span></summary><div className="campaign-module-subsection-content"><DateAvailabilityCalendar campaignId={campaignId} master={master} /></div></details>}
    {status.event && <details className="campaign-module-subsection"><summary className="cursor-pointer font-serif text-2xl">Calendário de eventos</summary><div className="mt-5"><CampaignEventCalendar campaignId={campaignId} master={master} config={status.eventConfig} /></div></details>}
    {master && <details className="campaign-module-subsection"><summary className="cursor-pointer font-serif text-2xl">Configurar calendários da mesa</summary><div className="mt-4">{settings}</div></details>}
  </div>
}
