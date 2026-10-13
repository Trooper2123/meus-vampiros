'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import type { PlayerPredatorTypeDto, PredatorTypeSelection } from '@/lib/vtm-v5/predator-types'

const fetcher = (url: string) => fetch(url).then(async (response) => {
  const body = await response.json()
  if (!response.ok) throw new Error(body.error ?? 'Não foi possível carregar os tipos de predação.')
  return body
})

export function PlayerPredatorSelector({ characterId, selectedCode, onApplied }: { characterId: string | null; selectedCode?: string | null; onApplied?: (name: string) => void }) {
  const url = characterId ? `/api/predator-types?characterId=${characterId}` : '/api/predator-types'
  const { data, error, isLoading, mutate } = useSWR<{ predatorTypes: PlayerPredatorTypeDto[]; selectedCode: string | null }>(url, fetcher)
  const [query, setQuery] = useState('')
  const [source, setSource] = useState<'ALL' | 'COREBOOK' | 'PLAYERS_GUIDE'>('ALL')
  const [selected, setSelected] = useState<string | null>(selectedCode ?? null)
  const [specialty, setSpecialty] = useState('')
  const [discipline, setDiscipline] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const types = data?.predatorTypes ?? []
  const filtered = useMemo(() => types.filter((entry) => (source === 'ALL' || entry.source === source) && `${entry.name} ${entry.summary} ${entry.feedingStyle}`.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR'))), [types, query, source])
  const selectedType = types.find((entry) => entry.code === selected) ?? null

  async function removeSelection() {
    if (!characterId) return
    setSubmitting(true)
    setMessage(null)
    try {
      const response = await fetch(`/api/characters/${characterId}/predator-type`, { method: 'DELETE' })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error ?? 'Não foi possível remover o tipo de predação.')
      setSelected(null)
      setSpecialty('')
      setDiscipline('')
      onApplied?.('')
      setMessage('Tipo de predação removido. Os modificadores anteriores foram desfeitos.')
      await mutate()
    } catch (failure) {
      setMessage(failure instanceof Error ? failure.message : 'Não foi possível remover o tipo de predação.')
    } finally {
      setSubmitting(false)
    }
  }

  async function confirmSelection() {
    if (!characterId || !selectedType) { setMessage('Salve o rascunho antes de confirmar o tipo de predação.'); return }
    setSubmitting(true); setMessage(null)
    const response = await fetch(`/api/characters/${characterId}/predator-type`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: selectedType.code, specialty, discipline, optionCodes: [] }) })
    const body = await response.json().catch(() => ({}))
    setSubmitting(false)
    if (!response.ok) { setMessage(body.error ?? 'Não foi possível aplicar o tipo de predação.'); return }
    setMessage('Tipo de predação aplicado à ficha.')
    onApplied?.(selectedType.name)
    await mutate()
  }

  return <section className="mt-6 border border-border bg-card p-5" aria-labelledby="predator-selector-title">
    <p className="eyebrow">Método de caça</p><h3 id="predator-selector-title" className="mt-2 font-serif text-xl">Tipo de predação</h3>
    {characterId && (data?.selectedCode || selectedCode) && <button type="button" className="button-ghost mt-3" disabled={submitting} onClick={() => void removeSelection()}>Remover tipo de predação</button>}
    <p className="mt-2 text-sm text-muted-foreground">Compare estilos, escolha uma especialidade e uma disciplina, depois confirme os efeitos na ficha.</p>
    <div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="sheet-field"><span>Buscar</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nome, estilo ou descrição" /></label><label className="sheet-field"><span>Fonte</span><select className="select" value={source} onChange={(event) => setSource(event.target.value as typeof source)}><option value="ALL">Todas as fontes</option><option value="COREBOOK">Livro básico</option><option value="PLAYERS_GUIDE">Players Guide</option></select></label></div>
    {isLoading && <p className="mt-4 text-sm text-muted-foreground" role="status">Carregando tipos de predação...</p>}
    {error && <p className="mt-4 text-sm text-primary" role="alert">{error.message}</p>}
    {!isLoading && !error && filtered.length === 0 && <p className="empty-state mt-4">Nenhum tipo disponível para estes filtros.</p>}
    <div className="mt-4 grid gap-3 md:grid-cols-2">{filtered.map((entry) => <button key={entry.code} type="button" disabled={!entry.selectable} onClick={() => { setSelected(entry.code); setSpecialty(''); setDiscipline(''); setMessage(null) }} className={`character-card text-left ${selected === entry.code ? 'border-primary' : ''}`} aria-pressed={selected === entry.code}><span className="eyebrow">{entry.source === 'COREBOOK' ? 'Livro básico' : 'Players Guide'}</span><strong className="mt-2 block font-serif text-lg">{entry.name}</strong><span className="mt-2 block text-sm text-muted-foreground">{entry.summary}</span><span className="mt-2 block text-xs">Rolagem: {entry.predatorRoll}</span>{entry.publicWarnings.map((warning) => <span key={warning.code} className="mt-2 block text-xs text-primary">{warning.message}</span>)}</button>)}</div>
    {selectedType && <div className="mt-5 border-t border-border pt-5"><h4 className="font-serif text-lg">Revisar {selectedType.name}</h4><p className="mt-2 text-sm text-muted-foreground">{selectedType.feedingStyle}</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="sheet-field"><span>Especialidade</span><select className="select" value={specialty} onChange={(event) => setSpecialty(event.target.value)}><option value="">Selecione...</option>{selectedType.specialtyOptions.map((option) => <option key={option}>{option}</option>)}</select></label><label className="sheet-field"><span>Disciplina</span><select className="select" value={discipline} onChange={(event) => setDiscipline(event.target.value)}><option value="">Selecione...</option>{selectedType.disciplineOptions.map((option) => <option key={option}>{option}</option>)}</select></label></div><button type="button" className="button-primary mt-4" disabled={submitting || !selectedType.selectable || !specialty || !discipline} onClick={confirmSelection}>{submitting ? 'Aplicando...' : 'Confirmar tipo de predação'}</button></div>}
    {message && <p className="mt-4 text-sm text-muted-foreground" role={message.includes('aplicado') ? 'status' : 'alert'}>{message}</p>}
  </section>
}

export function PlayerPredatorSummary({ name, selection, roll, source }: { name: string; selection?: Partial<PredatorTypeSelection> | null; roll?: string | null; source?: string | null }) {
  return <section className="border border-border bg-card p-5" aria-labelledby="predator-summary-title"><p className="eyebrow">Tipo de predação {source ? `· ${source === 'COREBOOK' ? 'Livro básico' : 'Players Guide'}` : ''}</p><h3 id="predator-summary-title" className="mt-2 font-serif text-xl">{name}</h3>{roll && <p className="mt-2 text-sm">Rolagem: {roll}</p>}{selection?.specialty && <p className="mt-2 text-sm text-muted-foreground">Especialidade: {selection.specialty}</p>}{selection?.discipline && <p className="mt-1 text-sm text-muted-foreground">Disciplina: {selection.discipline}</p>}</section>
}
