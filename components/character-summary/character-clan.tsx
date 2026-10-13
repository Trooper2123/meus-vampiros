'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { DISCIPLINE_NAMES, type ClanCode, type ClanSelection } from '@/lib/vtm-v5/clans'

type ClanView = { revision: number; selection: ClanSelection | null; clans: { code: ClanCode; name: string; disciplines: readonly string[]; bane: string; compulsion: string }[] }
const fetcher = async (url: string): Promise<ClanView> => {
  const response = await fetch(url)
  const body = await response.json()
  if (!response.ok) throw new Error(body.error ?? 'Não foi possível carregar os clãs.')
  return body
}

export function CharacterClanSummary({ characterId }: { characterId: string }) {
  const { data, error } = useSWR(`/api/characters/${characterId}/clan`, fetcher)
  const clan = data?.clans.find(entry => entry.code === data.selection?.code)
  if (error) return <p className="text-sm text-muted-foreground" role="alert">Não foi possível carregar as regras do clã.</p>
  if (!clan) return null
  return <section className="border border-border bg-card p-5" aria-labelledby="clan-summary-title"><h3 id="clan-summary-title" className="font-serif text-xl">{clan.name}</h3><p className="mt-3 text-sm">Perdição: {clan.bane}</p><p className="mt-2 text-sm">Compulsão: {clan.compulsion}</p><p className="mt-3 text-sm text-muted-foreground">Consequências contextuais dependem da revisão do Narrador.</p></section>
}

export function CharacterClan({ characterId, onBeforeSubmit, onChange }: { characterId: string; onBeforeSubmit: () => Promise<string | null>; onChange: () => void }) {
  const url = `/api/characters/${characterId}/clan`
  const { data, error } = useSWR(url, fetcher)
  const [code, setCode] = useState<ClanCode>('BRUJAH')
  const [major, setMajor] = useState('')
  const [minor, setMinor] = useState('')
  const [third, setThird] = useState('')
  const [preference, setPreference] = useState('')
  const [category, setCategory] = useState('MENTAL')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const clan = data?.clans.find(entry => entry.code === code)
  const disciplines = code === 'CAITIFF' ? DISCIPLINE_NAMES : clan?.disciplines ?? []

  async function apply() {
    setBusy(true)
    setMessage('')
    try {
      if (!await onBeforeSubmit()) throw new Error('Salve o rascunho antes de selecionar o clã.')
      const current = await fetcher(url)
      const selection: ClanSelection = { code, disciplineDots: code === 'THIN_BLOOD' ? {} : { [major]: 2, [minor]: 1 } }
      if (code === 'CAITIFF') selection.caitiffDisciplines = [major, minor, third]
      if (code === 'VENTRUE') selection.feedingPreference = preference.trim()
      if (code === 'MALKAVIAN') selection.afflictionCategory = category
      const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ selection, expectedRevision: current.revision, key: crypto.randomUUID() }) })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error ?? 'Não foi possível aplicar o clã.')
      setMessage('Clã aplicado. A ficha permanece em rascunho para revisão.')
      onChange()
    } catch (failure) { setMessage(failure instanceof Error ? failure.message : 'Não foi possível aplicar o clã.') }
    finally { setBusy(false) }
  }

  return <section className="mt-6 border border-border bg-card p-5" aria-labelledby="clan-selector-title">
    <h3 id="clan-selector-title" className="font-serif text-xl">Clã e disciplinas de criação</h3>
    {data?.selection && <p className="mt-2 text-sm">Clã registrado: {data.clans.find(entry => entry.code === data.selection?.code)?.name}</p>}
    <p className="mt-2 text-sm text-muted-foreground">A confirmação salva o rascunho e aplica apenas concessões rastreadas. Pontos existentes incompatíveis não serão sobrescritos. Poderes e consequências contextuais exigem revisão.</p>
    {error && <p role="alert">{error.message}</p>}
    <label className="sheet-field mt-4"><span>Clã</span><select className="select" value={code} disabled={busy} onChange={event => { setCode(event.target.value as ClanCode); setMajor(''); setMinor(''); setThird('') }}>{data?.clans.map(entry => <option key={entry.code} value={entry.code}>{entry.name}</option>)}</select></label>
    {clan && <div className="mt-3 text-sm text-muted-foreground"><p>Perdição: {clan.bane}</p><p className="mt-2">Compulsão: {clan.compulsion}</p></div>}
    {code !== 'THIN_BLOOD' && <div className="mt-4 grid gap-3 sm:grid-cols-2">{[{ label: 'Disciplina com 2 pontos', value: major, update: setMajor }, { label: 'Disciplina com 1 ponto', value: minor, update: setMinor }, ...(code === 'CAITIFF' ? [{ label: 'Terceira disciplina disponível (0 pontos)', value: third, update: setThird }] : [])].map(field => <label key={field.label} className="sheet-field"><span>{field.label}</span><select className="select" value={field.value} disabled={busy} onChange={event => field.update(event.target.value)}><option value="">Selecione...</option>{disciplines.map(name => <option key={name}>{name}</option>)}</select></label>)}</div>}
    {code === 'VENTRUE' && <label className="sheet-field mt-4"><span>Preferência alimentar</span><input value={preference} maxLength={200} disabled={busy} onChange={event => setPreference(event.target.value)} /></label>}
    {code === 'MALKAVIAN' && <label className="sheet-field mt-4"><span>Categoria afetada pela Perdição</span><select className="select" value={category} disabled={busy} onChange={event => setCategory(event.target.value)}><option value="PHYSICAL">Física</option><option value="SOCIAL">Social</option><option value="MENTAL">Mental</option></select></label>}
    <button type="button" className="button-primary mt-4" disabled={busy || !data || (code !== 'THIN_BLOOD' && (!major || !minor || major === minor))} onClick={() => void apply()}>{busy ? 'Aplicando...' : 'Confirmar clã'}</button>
    {message && <p className="mt-3 text-sm" role="status">{message}</p>}
  </section>
}
