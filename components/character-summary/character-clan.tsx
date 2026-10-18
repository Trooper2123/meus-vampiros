'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { disciplineDefinition } from '@/lib/vtm-v5/disciplines'
import { CLANS, DISCIPLINE_NAMES, type ClanCode, type ClanSelection } from '@/lib/vtm-v5/clans'

type ClanView = { authorizedInitialDisciplines?: { name: string; targetLevel: number }[]; revision: number; selection: ClanSelection | null; enabledClanCodes?: string[]; clans: { code: ClanCode; name: string; disciplines: readonly string[]; bane: string; compulsion: string }[] }
const fetcher = async (url: string): Promise<ClanView> => {
  const response = await fetch(url)
  const body = await response.json()
  if (!response.ok) throw new Error(body.error ?? 'Não foi possível carregar os clãs.')
  return body
}

export function CharacterClanSummary({ characterId }: Readonly<{ characterId: string }>) {
  const { data, error } = useSWR(`/api/characters/${characterId}/clan`, fetcher)
  const clan = data?.clans.find(entry => entry.code === data.selection?.code)
  if (error) return <p className="text-sm text-muted-foreground" role="alert">Não foi possível carregar as regras do clã.</p>
  if (!clan) return null
  return <section className="border border-border bg-card p-5" aria-labelledby="clan-summary-title"><h3 id="clan-summary-title" className="font-serif text-xl">{clan.name}</h3><p className="mt-3 text-sm">Perdição: {clan.bane}</p><p className="mt-2 text-sm">Compulsão: {clan.compulsion}</p><p className="mt-3 text-sm text-muted-foreground">Consequências contextuais dependem da revisão do Narrador.</p></section>
}

export function CharacterClan({ characterId, onBeforeSubmit, onChange }: Readonly<{ characterId?: string | null; onBeforeSubmit: () => Promise<string | null>; onChange: (characterId: string) => void }>) {
  const url = characterId ? `/api/characters/${characterId}/clan` : null
  const { data: savedData, error, mutate } = useSWR(url, fetcher)
  const data: ClanView | undefined = characterId ? savedData : { revision: 0, selection: null, clans: CLANS.map(({ code, name, disciplines, bane, compulsion }) => ({ code, name, disciplines, bane, compulsion })) }
  const [code, setCode] = useState<ClanCode | ''>('')
  const [major, setMajor] = useState('')
  const [minor, setMinor] = useState('')
  const [third, setThird] = useState('')
  const [preference, setPreference] = useState('')
  const [category, setCategory] = useState('MENTAL')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const clan = data?.clans.find(entry => entry.code === code)
  const disciplines = code === 'CAITIFF' ? DISCIPLINE_NAMES : [...new Set([...(clan?.disciplines ?? []), ...(data?.authorizedInitialDisciplines ?? []).map(grant => grant.name)])]

  async function apply() {
    setBusy(true)
    setMessage('')
    try {
      if (!code) throw new Error('Escolha um clã habilitado para a mesa.')
      const savedId = await onBeforeSubmit()
      if (!savedId) throw new Error('Salve o rascunho antes de selecionar o clã.')
      const savedUrl = `/api/characters/${savedId}/clan`
      const current = await fetcher(savedUrl)
      const selection: ClanSelection = { code, disciplineDots: code === 'THIN_BLOOD' ? {} : { [major]: 2, [minor]: 1 } }
      if (code === 'CAITIFF') selection.caitiffDisciplines = [major, minor, third]
      if (code === 'VENTRUE') selection.feedingPreference = preference.trim()
      if (code === 'MALKAVIAN') selection.afflictionCategory = category
      const response = await fetch(savedUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ selection, expectedRevision: current.revision, key: crypto.randomUUID() }) })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error ?? 'Não foi possível aplicar o clã.')
      setMessage('Clã aplicado. A ficha permanece em rascunho para revisão.')
      await mutate()
      await onChange(savedId)
    } catch (error_) { setMessage(error_ instanceof Error ? error_.message : 'Não foi possível aplicar o clã.') }
    finally { setBusy(false) }
  }

  return <section className="mt-6 border border-border bg-card p-5" aria-labelledby="clan-selector-title">
    <h3 id="clan-selector-title" className="font-serif text-xl">Clã e disciplinas de criação</h3>
    {data?.selection && <p className="mt-2 text-sm">Clã registrado: {data.clans.find(entry => entry.code === data.selection?.code)?.name}</p>}
    <p className="mt-2 text-sm text-muted-foreground">A confirmação salva o rascunho e aplica apenas concessões rastreadas. Pontos existentes incompatíveis não serão sobrescritos. Poderes e consequências contextuais exigem revisão.</p>
    {data?.authorizedInitialDisciplines?.map(grant => <p key={`${grant.name}:${grant.targetLevel}`} className="mt-2 text-sm text-muted-foreground">Exceção do Narrador: {grant.name}, distribuição inicial no nível {grant.targetLevel}.</p>)}
    {error && <p role="alert">{error.message}</p>}
    <fieldset className="mt-4 grid gap-4 lg:grid-cols-3" aria-label="Escolher clã">{data?.clans.filter(entry => !data.enabledClanCodes || data.enabledClanCodes.includes(entry.code)).map(entry => <button key={entry.code} type="button" className="choice-card" disabled={busy} aria-pressed={code === entry.code} onClick={() => { setCode(entry.code); setMajor(''); setMinor(''); setThird('') }}><strong className="font-serif text-2xl">{entry.name}</strong><span className="text-xs text-muted-foreground">Disciplinas: {entry.disciplines.map(name => disciplineDefinition(name)?.name ?? name).join(' · ') || 'Escolha livre conforme as regras'}</span><span className="text-xs text-muted-foreground">Perdição: {entry.bane}</span><span className="text-xs text-muted-foreground">Compulsão: {entry.compulsion}</span>{code === entry.code && <span className="text-xs">✓ Selecionado</span>}</button>)}</fieldset>
    {clan && <div className="mt-3 text-sm text-muted-foreground"><p>Perdição: {clan.bane}</p><p className="mt-2">Compulsão: {clan.compulsion}</p></div>}
    {code !== 'THIN_BLOOD' && <div className="mt-4 grid gap-3 sm:grid-cols-2">{[{ label: 'Disciplina com 2 pontos', value: major, update: setMajor }, { label: 'Disciplina com 1 ponto', value: minor, update: setMinor }, ...(code === 'CAITIFF' ? [{ label: 'Terceira disciplina disponível (0 pontos)', value: third, update: setThird }] : [])].map(field => <label key={field.label} className="sheet-field"><span>{field.label}</span><select className="select" value={field.value} disabled={busy} onChange={event => field.update(event.target.value)}><option value="">Selecione...</option>{disciplines.map(name => <option key={name} value={name}>{disciplineDefinition(name)?.name ?? name}</option>)}</select></label>)}</div>}
    {code === 'VENTRUE' && <label className="sheet-field mt-4"><span>Preferência alimentar</span><input value={preference} maxLength={200} disabled={busy} onChange={event => setPreference(event.target.value)} /></label>}
    {code === 'MALKAVIAN' && <label className="sheet-field mt-4"><span>Categoria afetada pela Perdição</span><select className="select" value={category} disabled={busy} onChange={event => setCategory(event.target.value)}><option value="PHYSICAL">Física</option><option value="SOCIAL">Social</option><option value="MENTAL">Mental</option></select></label>}
    <button type="button" className="button-primary mt-4" disabled={busy || !data || !clan || (code !== 'THIN_BLOOD' && (!major || !minor || major === minor))} onClick={() => void apply()}>{busy ? 'Aplicando...' : 'Confirmar clã'}</button>
    {message && <output className="block mt-3 text-sm">{message}</output>}
  </section>
}
