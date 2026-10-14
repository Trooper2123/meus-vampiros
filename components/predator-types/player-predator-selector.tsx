'use client'

import { useId, useMemo, useRef, useState } from 'react'
import useSWR from 'swr'
import type { PlayerPredatorTypeDto, PredatorTypeSelection } from '@/lib/vtm-v5/predator-types'

const fetcher = (url: string) => fetch(url).then(async (response) => {
  const body = await response.json()
  if (!response.ok) throw new Error(body.error ?? 'Não foi possível carregar os tipos de predação.')
  return body
})

export function PlayerPredatorSelector({ characterId, selectedCode, onApplied, onBeforeSubmit }: { characterId: string | null; selectedCode?: string | null; onApplied?: (name: string, characterId: string) => void; onBeforeSubmit?: () => Promise<string | null> }) {
  const url = characterId ? `/api/predator-types?characterId=${characterId}` : '/api/predator-types'
  const { data, error, isLoading, mutate } = useSWR<{ predatorTypes: PlayerPredatorTypeDto[]; selectedCode: string | null }>(url, fetcher)
  const [query, setQuery] = useState('')
  const [source, setSource] = useState<'ALL' | 'COREBOOK' | 'PLAYERS_GUIDE'>('ALL')
  const [selected, setSelected] = useState<string | null>(selectedCode ?? null)
  const [catalogExpanded, setCatalogExpanded] = useState(!selectedCode)
  const catalogId = useId()
  const reviewTitle = useRef<HTMLHeadingElement>(null)
  const [specialty, setSpecialty] = useState('')
  const [discipline, setDiscipline] = useState('')
  const [choices, setChoices] = useState<Record<string, number>>({})
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const types = useMemo(() => data?.predatorTypes ?? [], [data?.predatorTypes])
  const filtered = useMemo(() => types.filter((entry) => (source === 'ALL' || entry.source === source) && `${entry.name} ${entry.summary} ${entry.feedingStyle}`.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR'))), [types, query, source])
  const selectedType = types.find((entry) => entry.code === selected) ?? null

  function updateChoice(groupCode: string, optionCode: string, dots: number, exclusive: boolean) {
    setChoices(current => ({ ...Object.fromEntries(Object.entries(current).filter(([key]) => !exclusive || !key.startsWith(`${groupCode}:`))), [`${groupCode}:${optionCode}`]: dots }))
  }

  async function removeSelection() {
    if (!characterId) return
    setSubmitting(true)
    setMessage(null)
    try {
      const response = await fetch(`/api/characters/${characterId}/predator-type`, { method: 'DELETE' })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error ?? 'Não foi possível remover o tipo de predação.')
      setSelected(null)
      setCatalogExpanded(true)
      setSpecialty('')
      setDiscipline('')
      setChoices({})
      onApplied?.('', characterId)
      setMessage('Tipo de predação removido. Os modificadores anteriores foram desfeitos.')
      await mutate()
    } catch (failure) {
      setMessage(failure instanceof Error ? failure.message : 'Não foi possível remover o tipo de predação.')
    } finally {
      setSubmitting(false)
    }
  }

  async function confirmSelection() {
    if (!selectedType || submitting) return
    setSubmitting(true); setMessage(null)
    try {
      const savedId = onBeforeSubmit ? await onBeforeSubmit() : characterId
      if (!savedId) throw new Error('Não foi possível salvar automaticamente. Corrija os campos indicados e confirme novamente.')
      const optionCodes = Object.entries(choices).filter(([, dots]) => dots > 0).map(([key, dots]) => `${key}:${dots}`)
      const response = await fetch(`/api/characters/${savedId}/predator-type`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: selectedType.code, specialty, discipline, optionCodes }) })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error ?? 'Não foi possível aplicar o tipo de predação.')
      setMessage('Tipo de predação aplicado à ficha.')
      onApplied?.(selectedType.name, savedId)
      await mutate()
    } catch (failure) { setMessage(failure instanceof Error ? failure.message : 'Não foi possível aplicar o tipo de predação.') }
    finally { setSubmitting(false) }
  }

  return <section className="mt-6 border border-border bg-card p-5" aria-labelledby="predator-selector-title">
    <p className="eyebrow">Método de caça</p><h3 id="predator-selector-title" className="mt-2 font-serif text-xl">Tipo de predação</h3>
    {characterId && (data?.selectedCode || selectedCode) && <button type="button" className="button-ghost mt-3" disabled={submitting} onClick={() => void removeSelection()}>Remover tipo de predação</button>}
    <p className="mt-2 text-sm text-muted-foreground">Compare estilos, escolha uma especialidade e uma disciplina, depois confirme os efeitos na ficha. A confirmação salva automaticamente; não é necessário salvar o rascunho antes.</p>
    {error && <p className="mt-4 text-sm text-primary" role="alert">{error.message}</p>}
    <button type="button" className="button-ghost mt-3" disabled={submitting} aria-expanded={catalogExpanded} aria-controls={catalogId} onClick={() => setCatalogExpanded(value => !value)}>{catalogExpanded ? 'Recolher opções de predação' : 'Escolher outra predação'}</button>
    <div id={catalogId} hidden={!catalogExpanded}>
    <div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="sheet-field"><span>Buscar</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nome, estilo ou descrição" /></label><label className="sheet-field"><span>Fonte</span><select className="select" value={source} onChange={(event) => setSource(event.target.value as typeof source)}><option value="ALL">Todas as fontes</option><option value="COREBOOK">Livro básico</option><option value="PLAYERS_GUIDE">Players Guide</option></select></label></div>
    {isLoading && <p className="mt-4 text-sm text-muted-foreground" role="status">Carregando tipos de predação...</p>}
    {!isLoading && !error && filtered.length === 0 && <p className="empty-state mt-4">Nenhum tipo disponível para estes filtros.</p>}
    <div className="mt-4 grid gap-3 md:grid-cols-2">{filtered.map((entry) => <button key={entry.code} type="button" disabled={submitting || !entry.selectable} onClick={() => { setSelected(entry.code); setCatalogExpanded(false); setChoices({}); setSpecialty(''); setDiscipline(''); setMessage(null); requestAnimationFrame(() => reviewTitle.current?.focus()) }} className={`character-card text-left ${selected === entry.code ? 'border-primary' : ''}`} aria-pressed={selected === entry.code}><span className="eyebrow">{entry.source === 'COREBOOK' ? 'Livro básico' : 'Players Guide'}</span><strong className="mt-2 block font-serif text-lg">{entry.name}</strong><span className="mt-2 block text-sm text-muted-foreground">{entry.summary}</span><span className="mt-2 block text-xs">Rolagem: {entry.predatorRoll}</span>{entry.publicWarnings.map((warning) => <span key={warning.code} className="mt-2 block text-xs text-primary">{warning.message}</span>)}</button>)}</div>
    </div>
    {selectedType && <div className="mt-5 border-t border-border pt-5"><h4 ref={reviewTitle} tabIndex={-1} className="font-serif text-lg">Revisar {selectedType.name}</h4><p className="mt-2 text-sm text-muted-foreground">{selectedType.feedingStyle}</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="sheet-field"><span>Especialidade</span><select className="select" value={specialty} onChange={(event) => setSpecialty(event.target.value)}><option value="">Selecione...</option>{selectedType.specialtyOptions.map((option) => <option key={option}>{option}</option>)}</select></label><label className="sheet-field"><span>Disciplina</span><select className="select" value={discipline} onChange={(event) => setDiscipline(event.target.value)}><option value="">Selecione...</option>{selectedType.disciplineOptions.map((option) => <option key={option}>{option}</option>)}</select></label></div></div>}
    {selectedType?.choiceGroups?.map(group => <fieldset key={`${selectedType.code}:${group.code}`} className="mt-4 border border-border p-3">
      <legend className="text-sm">Escolhas adicionais: distribua {group.totalDots} ponto(s){group.mode === 'ONE' ? ' em uma opção' : ''}</legend>
      {group.options.map(option => <label key={option.code} className="sheet-field mt-2"><span>{option.label}</span><select className="select" value={choices[`${group.code}:${option.code}`] ?? 0} onChange={event => updateChoice(group.code, option.code, Number(event.target.value), group.mode === 'ONE')}>
        <option value={0}>Não selecionar</option>
        {Array.from({ length: group.mode === 'ONE' ? 1 : option.dots ?? group.totalDots }, (_, index) => group.mode === 'ONE' ? group.totalDots : index + 1).map(dots => <option key={dots} value={dots}>{dots} ponto(s)</option>)}
      </select></label>)}
    </fieldset>)}
    {selectedType && <button type="button" className="button-primary mt-4" disabled={submitting || !selectedType?.selectable || !specialty || !discipline} onClick={() => void confirmSelection()}>{submitting ? 'Aplicando...' : 'Confirmar escolha'}</button>}
    {message && <p className="mt-4 text-sm text-muted-foreground" role={message.includes('aplicado') ? 'status' : 'alert'}>{message}</p>}
  </section>
}

export function PlayerPredatorSummary({ name, selection, roll, source }: { name: string; selection?: Partial<PredatorTypeSelection> | null; roll?: string | null; source?: string | null }) {
  return <section className="border border-border bg-card p-5" aria-labelledby="predator-summary-title"><p className="eyebrow">Tipo de predação {source ? `· ${source === 'COREBOOK' ? 'Livro básico' : 'Players Guide'}` : ''}</p><h3 id="predator-summary-title" className="mt-2 font-serif text-xl">{name}</h3>{roll && <p className="mt-2 text-sm">Rolagem: {roll}</p>}{selection?.specialty && <p className="mt-2 text-sm text-muted-foreground">Especialidade: {selection.specialty}</p>}{selection?.discipline && <p className="mt-1 text-sm text-muted-foreground">Disciplina: {selection.discipline}</p>}</section>
}
