'use client'

import { useId, useMemo, useRef, useState } from 'react'
import useSWR from 'swr'
import type { PlayerPredatorTypeDto, PredatorTypeSelection } from '@/lib/vtm-v5/predator-types'
import { PREDATOR_SOURCE_LABELS, PREDATOR_TYPE_SOURCES, type PredatorTypeSource } from '@/lib/vtm-v5/predator-types/types'
import { disciplineDefinition } from '@/lib/vtm-v5/disciplines'

const fetcher = (url: string) => fetch(url).then(async (response) => {
  const body = await response.json()
  if (!response.ok) { throw new Error(body.error ?? 'Não foi possível carregar os tipos de predação.') }
  return body
})

export function PlayerPredatorSelector({ characterId, selectedCode, onApplied, onBeforeSubmit }: Readonly<{ characterId: string | null; selectedCode?: string | null; onApplied?: (name: string, characterId: string) => void; onBeforeSubmit?: () => Promise<string | null> }>) {
  const url = characterId ? `/api/predator-types?characterId=${characterId}` : '/api/predator-types'
  const { data, error, isLoading, mutate } = useSWR<{ predatorTypes: PlayerPredatorTypeDto[]; selectedCode: string | null; selection?: Partial<PredatorTypeSelection> | null }>(url, fetcher)
  const [query, setQuery] = useState('')
  const [source, setSource] = useState<'ALL' | PredatorTypeSource>('ALL')
  const [draftSelected, setDraftSelected] = useState<string | null | undefined>(undefined)
  const [draftCatalogExpanded, setDraftCatalogExpanded] = useState<boolean | null>(null)
  const catalogId = useId()
  const reviewTitle = useRef<HTMLHeadingElement>(null)
  const [draftSpecialty, setDraftSpecialty] = useState<string | null>(null)
  const [draftDiscipline, setDraftDiscipline] = useState<string | null>(null)
  const [draftChoices, setDraftChoices] = useState<Record<string, number> | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const types = useMemo(() => data?.predatorTypes ?? [], [data?.predatorTypes])
  const filtered = useMemo(() => types.filter((entry) => (source === 'ALL' || entry.source === source) && `${entry.name} ${entry.aliases.join(' ')} ${entry.summary} ${entry.feedingStyle}`.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR'))), [types, query, source])
  const selected = draftSelected === undefined ? data?.selectedCode ?? selectedCode ?? null : draftSelected
  const selectedType = types.find((entry) => entry.code === selected) ?? null
  const catalogExpanded = draftCatalogExpanded ?? !selectedType
  const savedSelection = data?.selection?.code === selected ? data.selection : null
  const specialty = draftSpecialty ?? savedSelection?.specialty ?? ''
  const discipline = disciplineDefinition(draftDiscipline ?? savedSelection?.discipline)?.name ?? draftDiscipline ?? savedSelection?.discipline ?? ''
  const savedChoices = Object.fromEntries((savedSelection?.optionCodes ?? []).flatMap(value => {
    const match = /^([^:]+):([^:]+):([1-5])$/.exec(value)
    return match ? [[`${match[1]}:${match[2]}`, Number(match[3])]] : []
  }))
  const choices = draftChoices ?? savedChoices

  function updateChoice(groupCode: string, optionCode: string, dots: number, exclusive: boolean) {
    setDraftChoices(current => ({ ...Object.fromEntries(Object.entries(current ?? choices).filter(([key]) => !exclusive || !key.startsWith(`${groupCode}:`))), [`${groupCode}:${optionCode}`]: dots }))
  }

  async function removeSelection() {
    if (!characterId) { return }
    setSubmitting(true)
    setMessage(null)
    try {
      const response = await fetch(`/api/characters/${characterId}/predator-type`, { method: 'DELETE' })
      const body = await response.json()
      if (!response.ok) { throw new Error(body.error ?? 'Não foi possível remover o tipo de predação.') }
      setDraftSelected(null)
      setDraftCatalogExpanded(true)
      setDraftSpecialty('')
      setDraftDiscipline('')
      setDraftChoices({})
      onApplied?.('', characterId)
      setMessage('Tipo de predação removido. Os modificadores anteriores foram desfeitos.')
      await mutate()
    } catch (error_) {
      setMessage(error_ instanceof Error ? error_.message : 'Não foi possível remover o tipo de predação.')
    } finally {
      setSubmitting(false)
    }
  }

  async function confirmSelection() {
    if (!selectedType || submitting) { return }
    setSubmitting(true); setMessage(null)
    try {
      const savedId = onBeforeSubmit ? await onBeforeSubmit() : characterId
      if (!savedId) { throw new Error('Não foi possível salvar automaticamente. Corrija os campos indicados e confirme novamente.') }
      const optionCodes = Object.entries(choices).filter(([, dots]) => dots > 0).map(([key, dots]) => `${key}:${dots}`)
      const response = await fetch(`/api/characters/${savedId}/predator-type`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: selectedType.code, specialty, discipline, optionCodes }) })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) { throw new Error(body.error ?? 'Não foi possível aplicar o tipo de predação.') }
      setMessage('Tipo de predação aplicado à ficha.')
      onApplied?.(selectedType.name, savedId)
      await mutate()
    } catch (error_) { setMessage(error_ instanceof Error ? error_.message : 'Não foi possível aplicar o tipo de predação.') }
    finally { setSubmitting(false) }
  }

  return <section className="mt-6 border border-border bg-card p-5" aria-labelledby="predator-selector-title">
    <p className="eyebrow">Método de caça</p><h3 id="predator-selector-title" className="mt-2 font-serif text-xl">Tipo de predação</h3>
    {characterId && selected && (data?.selectedCode || selectedCode) && <button type="button" className="button-ghost mt-3" disabled={submitting} onClick={() => void removeSelection()}>Remover tipo de predação</button>}
    <p className="mt-2 text-sm text-muted-foreground">Compare estilos, escolha uma especialidade e uma disciplina, depois confirme os efeitos na ficha. A confirmação salva automaticamente; não é necessário salvar o rascunho antes.</p>
    {error && <p className="mt-4 text-sm text-primary" role="alert">{error.message}</p>}
    {selectedType && <button type="button" className="button-ghost mt-3" disabled={submitting} aria-expanded={catalogExpanded} aria-controls={catalogId} onClick={() => setDraftCatalogExpanded(!catalogExpanded)}>{catalogExpanded ? 'Recolher opções de predação' : 'Alterar escolha'}</button>}
    <div id={catalogId} hidden={!catalogExpanded}>
      <div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="sheet-field"><span>Buscar</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nome, estilo ou descrição" /></label><label className="sheet-field"><span>Fonte</span><select className="select" value={source} onChange={(event) => setSource(event.target.value as typeof source)}><option value="ALL">Todas as fontes</option>{PREDATOR_TYPE_SOURCES.map(value => <option key={value} value={value}>{PREDATOR_SOURCE_LABELS[value]}</option>)}</select></label></div>
      {isLoading && <output className="block mt-4 text-sm text-muted-foreground">Carregando tipos de predação...</output>}
      {!isLoading && !error && filtered.length === 0 && <p className="empty-state mt-4">Nenhum tipo disponível para estes filtros.</p>}
      <div className="mt-4 grid gap-3 md:grid-cols-2">{filtered.map((entry) => <button key={entry.code} type="button" disabled={submitting} onClick={() => { setDraftSelected(entry.code); setDraftCatalogExpanded(false); setDraftChoices({}); setDraftSpecialty(''); setDraftDiscipline(''); setMessage(null); requestAnimationFrame(() => reviewTitle.current?.focus()) }} className="choice-card" aria-pressed={selected === entry.code}><span className="eyebrow">{PREDATOR_SOURCE_LABELS[entry.source]}</span><strong className="mt-2 block font-serif text-lg">{entry.name}</strong><span className="mt-2 block text-sm text-muted-foreground">{entry.summary}</span><span className="mt-2 block text-xs">Rolagem: {entry.predatorRoll}</span>{entry.publicWarnings.map((warning) => <span key={warning.code} className="mt-2 block text-xs text-primary">{warning.message}</span>)}</button>)}</div>
    </div>
    {selectedType && <div className="mt-5 border-t border-border pt-5"><h4 ref={reviewTitle} tabIndex={-1} className="font-serif text-lg">Revisar {selectedType.name}</h4><p className="mt-2 text-sm text-muted-foreground">{selectedType.feedingStyle}</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="sheet-field"><span>Especialidade</span><select className="select" value={specialty} onChange={(event) => setDraftSpecialty(event.target.value)}><option value="">Selecione...</option>{selectedType.specialtyOptions.map((option) => <option key={option}>{option}</option>)}</select></label><label className="sheet-field"><span>Disciplina</span><select className="select" value={discipline} onChange={(event) => setDraftDiscipline(event.target.value)}><option value="">Selecione...</option>{selectedType.disciplineOptions.map((option) => <option key={option}>{option}</option>)}</select></label></div></div>}
    {selectedType?.choiceGroups?.map(group => <fieldset key={`${selectedType.code}:${group.code}`} className="mt-4 border border-border p-3">
      <legend className="text-sm">{choiceGroupLabel(group.mode,group.totalDots)}</legend>
      {group.options.map(option => <label key={option.code} className="sheet-field mt-2"><span>{option.label}</span><select className="select" value={choices[`${group.code}:${option.code}`] ?? 0} onChange={event => updateChoice(group.code, option.code, Number(event.target.value), group.mode !== 'DISTRIBUTE')}>
        <option value={0}>Não selecionar</option>
        {Array.from({ length: group.mode === 'ONE' ? 1 : option.dots ?? group.totalDots }, (_, index) => group.mode === 'ONE' ? group.totalDots : index + 1).map(dots => <option key={dots} value={dots}>{dots} ponto(s)</option>)}
      </select></label>)}
    </fieldset>)}
    {selectedType && <div className="mt-4 flex flex-col gap-2 text-sm"><p className="text-muted-foreground">{selectedType.rulesText}</p>{selectedType.sourceReference && <p className="text-xs text-muted-foreground">Fonte: {selectedType.sourceReference}</p>}{selectedType.publicWarnings.map(warning => <p key={warning.code} className="text-primary">{warning.message}</p>)}</div>}
    {selectedType && <button type="button" className="button-primary mt-4" disabled={submitting || !selectedType?.selectable || !specialty || !discipline} onClick={() => void confirmSelection()}>{submitting ? 'Aplicando...' : 'Confirmar escolha'}</button>}
    {selectedType && !submitting && <p className="mt-2 text-sm text-muted-foreground">{predatorChoiceMessage(selectedType,!!specialty&&!!discipline)}</p>}
    {message && (message.includes('aplicado') ? <output className="mt-4 block text-sm text-muted-foreground" aria-live="polite">{message}</output> : <p className="mt-4 text-sm text-muted-foreground" role="alert">{message}</p>)}
  </section>
}

export function PlayerPredatorSummary({ name, selection, roll, source }: Readonly<{ name: string; selection?: Partial<PredatorTypeSelection> | null; roll?: string | null; source?: string | null }>) {
  return <section className="border border-border bg-card p-5" aria-labelledby="predator-summary-title"><p className="eyebrow">Tipo de predação {source && PREDATOR_SOURCE_LABELS[source as PredatorTypeSource] ? `· ${PREDATOR_SOURCE_LABELS[source as PredatorTypeSource]}` : ''}</p><h3 id="predator-summary-title" className="mt-2 font-serif text-xl">{name}</h3>{roll && <p className="mt-2 text-sm">Rolagem: {roll}</p>}{selection?.specialty && <p className="mt-2 text-sm text-muted-foreground">Especialidade: {selection.specialty}</p>}{selection?.discipline && <p className="mt-1 text-sm text-muted-foreground">Disciplina: {selection.discipline}</p>}</section>
}

function choiceGroupLabel(mode:string,totalDots:number){
 if(mode==='PLAYER_DEFINED'){ return `A fonte não informa a pontuação. Defina de 1 a ${totalDots} pontos.` }
 const suffix=mode==='ONE'?' em uma opção':''
 return `Escolhas adicionais: distribua ${totalDots} ponto(s)${suffix}`
}
function predatorChoiceMessage(type:PlayerPredatorTypeDto,complete:boolean){
 if(!type.selectable){ return `Predação indisponível: ${type.publicWarnings.filter(warning=>warning.blocking).map(warning=>warning.message).join(' ')||'A configuração atual não permite esta escolha.'}` }
 if(!complete){ return 'Escolha a especialidade e a Disciplina para confirmar. A Disciplina de predação pode ser de fora do clã.' }
 return 'A Disciplina concedida pela predação não precisa pertencer ao clã.'
}
