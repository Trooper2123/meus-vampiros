'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { BLOOD_RULESETS, type BloodRuleset } from '@/lib/vtm-v5/blood-potency-catalog'
import type { BloodPolicy } from '@/lib/vtm-v5/blood-potency'

async function readPolicy(url: string): Promise<BloodPolicy> {
  const response = await fetch(url)
  if (!response.ok) throw new Error('Não foi possível carregar o perfil.')
  return response.json()
}
export function BloodPolicySettings({ campaignId }: Readonly<{ campaignId: string }>) {
  const url = `/api/campaigns/${campaignId}/blood-policy`
  const { data, error, mutate } = useSWR(url, readPolicy)
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setSaving(true); setMessage('')
    try {
      const response = await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rulesetVersion: form.get('profile') as BloodRuleset, allowPlayerPotencyAboveFive: form.has('elders'), communityEnabled: form.has('community') }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? 'Falha ao salvar o perfil.')
      await mutate(result); setMessage('Perfil salvo. As próximas consultas usam estas regras; eventos anteriores são preservados.')
    } catch (error_) { setMessage(error_ instanceof Error ? error_.message : 'Falha ao salvar.') }
    finally { setSaving(false) }
  }
  return <section className="border border-border bg-card p-5">
    <h2 className="font-serif text-2xl">Potência do Sangue</h2>
    <p className="mt-2 text-sm text-muted-foreground">Escolha explícita da mesa. Companion é recomendado para novas mesas; regras comunitárias são opcionais.</p>
    {error && <p role="alert">{error.message}</p>}
    {data && <form key={JSON.stringify(data)} onSubmit={save} className="mt-4 grid gap-3">
      <label>Perfil<select className="ml-2 border border-border bg-background p-2" name="profile" defaultValue={data.rulesetVersion}>{BLOOD_RULESETS.map(profile => <option key={profile} value={profile}>{profile === 'CORE_V5_ORIGINAL_V1' ? 'Livro básico original' : 'Companion — atualizações opcionais'}</option>)}</select></label>
      <label><input name="elders" type="checkbox" defaultChecked={data.allowPlayerPotencyAboveFive} /> Permitir Potência permanente 6+ para jogadores, respeitando a geração</label>
      <label><input name="community" type="checkbox" defaultChecked={data.communityEnabled} /> Habilitar pacote comunitário de Bully (exige Companion)</label>
      <button type="submit" className="button-primary justify-self-start" disabled={saving}>{saving ? 'Salvando...' : 'Salvar perfil'}</button>
    </form>}
    <output className="mt-3 block text-sm" aria-live="polite">{message}</output>
  </section>
}
