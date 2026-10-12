'use client'

import { useState } from 'react'
import styles from './campaign-calendar.module.css'

export function CampaignCalendarToggle({ campaignId, calendar, label, initialEnabled, onChange }: { campaignId: string; calendar: 'event' | 'scheduling'; label: string; initialEnabled: boolean; onChange: (enabled: boolean) => void }) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function toggle() {
    const nextEnabled = !enabled
    setSaving(true)
    setError(null)
    const response = await fetch(`/api/campaign-${calendar === 'event' ? 'event' : 'scheduling'}-calendar/toggle`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ campaignId, enabled: nextEnabled }) })
    const body = await response.json().catch(() => ({}))
    setSaving(false)
    if (!response.ok) { setError(body.error ?? 'Não foi possível atualizar o calendário.'); return }
    setEnabled(body.enabled)
    onChange(body.enabled)
  }

  return <div className={styles.toggleCard}><div><p className="font-semibold">{label}</p><p className="mt-1 text-xs text-muted-foreground">{enabled ? 'Habilitado para esta mesa.' : 'Desabilitado sem remover os dados existentes.'}</p>{error && <p role="alert" className="mt-2 text-xs text-primary">{error}</p>}</div><button type="button" className={enabled ? 'button-ghost' : 'button-primary'} onClick={() => void toggle()} disabled={saving}>{saving ? 'Salvando...' : enabled ? 'Desabilitar' : 'Habilitar'}</button></div>
}
