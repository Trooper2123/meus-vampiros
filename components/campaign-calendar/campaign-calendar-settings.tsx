'use client'

import { useState } from 'react'
import type { CampaignCalendarConfig, CampaignCalendarMode } from '@/lib/types/campaign-event'

const MODE_LABELS: Record<CampaignCalendarMode, string> = { real: 'Calendário real', fictional: 'Data fictícia livre', custom: 'Calendário personalizado' }

export function CampaignCalendarSettings({ campaignId, config, onChange }: Readonly<{ campaignId: string; config: CampaignCalendarConfig; onChange: (config: CampaignCalendarConfig) => void }>) {
  const [mode, setMode] = useState(config.mode)
  const [weekdays, setWeekdays] = useState(config.weekdays.join(', '))
  const [months, setMonths] = useState(config.months.join(', '))
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function save() {
    setSaving(true); setMessage(null)
    const response = await fetch('/api/campaign-event-calendar/status', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ campaignId, mode, weekdays: weekdays.split(','), months: months.split(',') }) })
    const body = await response.json().catch(() => ({}))
    setSaving(false)
    if (!response.ok) { setMessage(body.error ?? 'Não foi possível salvar o calendário.'); return }
    onChange({ mode: body.mode, weekdays: body.weekdays, months: body.months }); setMessage('Configuração salva.')
  }

  let modeDescription
  if (mode === 'real') {
    modeDescription = 'Usa datas do calendário gregoriano.'
  } else if (mode === 'fictional') {
    modeDescription = 'Usa dias da semana e meses reais, mas permite combiná-los livremente com qualquer ano.'
  } else {
    modeDescription = 'O modelo.md define os nomes e a ordem dos dias e meses do cenário.'
  }
  return <div className="border border-border bg-card p-4"><label className="sheet-field"><span>Tipo do calendário de eventos</span><select className="select" value={mode} onChange={(event) => setMode(event.target.value as CampaignCalendarMode)}>{Object.entries(MODE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><p className="mt-2 text-xs text-muted-foreground">{modeDescription}</p>{mode === 'custom' && <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2"><label className="sheet-field"><span>Dias da semana, separados por vírgula</span><input value={weekdays} onChange={(event) => setWeekdays(event.target.value)} placeholder="Alvorada, Sangria, Ocaso" /></label><label className="sheet-field"><span>Meses, separados por vírgula</span><input value={months} onChange={(event) => setMonths(event.target.value)} placeholder="Cinzas, Névoas, Sangue" /></label></div>}<div className="mt-4 flex items-center gap-3"><button type="button" className="button-primary" onClick={() => void save()} disabled={saving}>{saving ? 'Salvando...' : 'Salvar configuração'}</button>{message && <output className="block text-xs text-muted-foreground">{message}</output>}</div></div>
}
