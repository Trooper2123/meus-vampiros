'use client'

import { useRef, useState } from 'react'
import useSWR from 'swr'
import { disciplineDefinition } from '@/lib/vtm-v5/disciplines'
import type { DisciplinePowerOption } from '@/lib/vtm-v5/discipline-powers'
import type { DisciplinePower } from './discipline-fields'

const fields = [
  ['name', 'name', 'Nome'], ['effect', 'effect', 'Efeito'], ['cost', 'cost', 'Custo'],
  ['prerequisite', 'prereq', 'Pré-requisito'], ['amalgam', 'amalgam', 'Amálgama'],
  ['duration', 'duration', 'Duração'], ['dicePool', 'dicepool', 'Parada'],
  ['opposingPool', 'opposing', 'Parada oposta'], ['additionalNotes', 'notes', 'Notas adicionais'], ['source', 'source', 'Fonte'],
] as const

async function fetchPowers(url: string): Promise<{ powers: DisciplinePowerOption[] }> {
  const response = await fetch(url, { cache: 'no-store' })
  const body = await response.json().catch(() => null)
  if (!response.ok || !Array.isArray(body?.powers)) throw new Error(body?.error ?? 'Não foi possível carregar os poderes.')
  return body
}

export function DisciplinePowerRow({ disciplineName, maxLevel, disciplineIndex, powerIndex, value, onSelect }: Readonly<{
  disciplineName: string
  maxLevel: number
  disciplineIndex: number
  powerIndex: number
  value: DisciplinePower
  onSelect: (power: DisciplinePower) => void
}>) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [open, setOpen] = useState(false)
  const [level, setLevel] = useState('')
  const discipline = disciplineDefinition(disciplineName)
  const base = `disciplina-${disciplineIndex}-poder-${powerIndex}`
  const { data, error, isLoading, mutate } = useSWR(open && discipline ? `/api/discipline-powers?disciplineId=${discipline.id}&maxLevel=${maxLevel}` : null, fetchPowers)
  const options = (data?.powers ?? []).filter(entry => entry.level <= maxLevel && (!level || entry.level === Number(level)))

  function show() {
    setLevel('')
    setOpen(true)
    dialog.current?.showModal()
  }

  return <tr className="hover:bg-muted/5">
    <td className="p-2 font-bold text-muted-foreground">Nível {powerIndex + 1}
      <dialog ref={dialog} id={`${base}-dialog`} aria-labelledby={`${base}-title`} onClose={() => setOpen(false)} className="m-auto max-h-[90dvh] w-[min(64rem,95vw)] overflow-y-auto border border-border bg-card p-5 text-foreground backdrop:bg-background/80">
        <div className="mb-5 flex items-start justify-between gap-4"><div><p className="eyebrow">{discipline?.name ?? disciplineName} · até nível {maxLevel}</p><h2 id={`${base}-title`} className="mt-2 font-serif text-2xl">Selecionar poder de Disciplina</h2></div><button autoFocus type="button" className="button-ghost" onClick={() => dialog.current?.close()}>Cancelar</button></div>
        <div className="mb-5 grid gap-4 sm:grid-cols-2">
          <label className="sheet-field"><span>Disciplina da ficha</span><select className="select" value={discipline?.id ?? ''} disabled><option value={discipline?.id ?? ''}>{discipline?.name ?? disciplineName}</option></select></label>
          <label className="sheet-field"><span>Nível do poder</span><select className="select" value={level} onChange={event => setLevel(event.target.value)}><option value="">Todos até nível {maxLevel}</option>{Array.from({ length: maxLevel }, (_, index) => <option key={index + 1} value={index + 1}>Nível {index + 1}</option>)}</select></label>
        </div>
        {!discipline && <p role="alert" className="text-sm text-primary">Escolha uma Disciplina do catálogo na ficha para consultar seus poderes.</p>}
        {isLoading && <output className="block text-sm text-muted-foreground">Carregando poderes…</output>}
        {error && <div role="alert" className="flex flex-col gap-3"><p className="text-sm text-primary">Não foi possível carregar os poderes.</p><button type="button" className="button-ghost self-start" onClick={() => void mutate()}>Tentar novamente</button></div>}
        {data && !error && !options.length && <p className="empty-state">Nenhum poder publicado está disponível para estes filtros.</p>}
        <div className="flex flex-col gap-4">{!error && options.map(entry => <article key={entry.id} className="border border-border p-4 font-normal">
          <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-serif text-xl">{entry.power.name} · nível {entry.level}</h3><button type="button" className="button-primary" onClick={() => { onSelect(entry.power); dialog.current?.close() }}>Selecionar {entry.power.name}</button></div>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">{fields.filter(([field]) => field !== 'name').map(([field, , label]) => <div key={field}><dt className="text-muted-foreground">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words">{entry.power[field] || 'Não informado'}</dd></div>)}</dl>
        </article>)}</div>
      </dialog>
    </td>
    {fields.map(([field, suffix, label]) => <td key={field} className="p-1"><input type="hidden" name={`${base}-${suffix}`} value={value[field]} /><button type="button" className="w-full min-h-10 bg-transparent p-1 text-left text-sm font-normal hover:bg-muted/20" title={value[field] || label} aria-label={`${label}: ${value[field] || 'Não preenchido'}. Selecionar poder de ${discipline?.name ?? disciplineName}, até nível ${maxLevel}`} aria-haspopup="dialog" aria-controls={`${base}-dialog`} onClick={show}><span className={`line-clamp-2 max-w-[220px] break-words ${value[field] ? '' : 'text-muted-foreground'}`}>{value[field] || label}</span></button></td>)}
  </tr>
}
