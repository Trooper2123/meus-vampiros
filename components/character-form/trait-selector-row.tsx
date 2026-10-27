'use client'

import { useEffect, useRef, useState } from 'react'
import useSWR from 'swr'
import type { TraitKind, TraitOption } from '@/lib/vtm-v5/trait-options'
import { grantedDotOrigins, type CreationGrant } from '@/lib/vtm-v5/creation-grants'
import { dots } from './dot-track'

export type TraitItem = { id?: string; name: string; level: number; description: string; expanded?: boolean }
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR')
async function fetchOptions(url: string): Promise<{ options: TraitOption[] }> {
  const response = await fetch(url, { cache: 'no-store' })
  const body = await response.json().catch(() => null)
  if (!response.ok || !Array.isArray(body?.options)) { throw new Error('Não foi possível carregar o catálogo.') }
  return body
}

export function TraitSelectorRow({ kind, index, value, grants = [], autoOpen = false, onChange }: Readonly<{ kind: TraitKind; index: number; value: TraitItem; grants?: readonly CreationGrant[]; autoOpen?: boolean; onChange: (value: TraitItem) => void }>) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [open, setOpen] = useState(autoOpen)
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState({ name: value.name, level: value.level, description: value.description })
  const [message, setMessage] = useState('')
  const { data, error, isLoading, mutate } = useSWR(open ? `/api/merits-flaws?kind=${kind}` : null, fetchOptions)
  const options = (data?.options ?? []).filter(entry => normalize(`${entry.name} ${entry.originalName} ${entry.type} ${entry.group} ${entry.description}`).includes(normalize(query.trim())))
  const minimum = grants.filter(grant => grant.kind === kind && grant.id === value.id).reduce((sum, grant) => sum + grant.dots, 0)
  const label = kind === 'MERIT' ? 'vantagem' : 'defeito'
  const base = `${label}-${index}`

  useEffect(() => {
    if (autoOpen) { dialog.current?.showModal() }
  }, [autoOpen])

  function show() {
    setDraft({ name: value.name, level: value.level, description: value.description })
    setQuery(''); setMessage(''); setOpen(true)
    dialog.current?.showModal()
  }
  function applyCustom() {
    if (!draft.name.trim() || draft.name.length > 120 || !Number.isSafeInteger(draft.level) || draft.level < minimum || draft.level > 5 || draft.level < 0 || draft.description.length > 10000 || minimum > 0 && draft.name !== value.name) { setMessage('Informe nome, descrição de até 10.000 caracteres e pontos válidos de 0 a 5, preservando as concessões.'); return }
    onChange({ ...value, ...draft, name: draft.name.trim() })
    dialog.current?.close()
  }

  return <div className="flex flex-col gap-3 border border-border bg-card p-3">
    <input type="hidden" name={`${base}-nome`} value={value.name} />
    <input type="hidden" name={`${base}-descricao`} value={value.description} />
    <div className="flex flex-wrap items-center justify-between gap-3"><button type="button" className="button-ghost flex-1 text-left" aria-haspopup="dialog" aria-controls={`${base}-dialog`} onClick={show}>{value.name || `Selecionar ${label}`}</button>{dots(5, value.level, level => { if (level >= minimum) { onChange({ ...value, level }) } }, `${base}-nivel`, true, false, grantedDotOrigins(grants, kind, value.id, value.level))}</div>
    <button type="button" className="text-left text-sm text-muted-foreground" aria-haspopup="dialog" aria-controls={`${base}-dialog`} onClick={show}><span className="line-clamp-2 whitespace-pre-wrap">{value.description || 'Pesquisar no catálogo ou criar um registro personalizado'}</span></button>
    {minimum > 0 && <p className="grant-origin text-xs">Nome e pontos de origem preservados. Altere a concessão no seletor de clã ou predação.</p>}
    <dialog ref={dialog} id={`${base}-dialog`} aria-labelledby={`${base}-title`} onClose={() => { setOpen(false); setDraft({ name: value.name, level: value.level, description: value.description }) }} onKeyDown={event => { if (event.key === 'Enter' && (event.target as HTMLElement).tagName === 'INPUT') { event.preventDefault() } }} className="m-auto max-h-[90dvh] w-[min(64rem,95vw)] overflow-y-auto border border-border bg-card p-5 text-foreground backdrop:bg-background/80">
      <div className="mb-5 flex items-start justify-between gap-4"><h2 id={`${base}-title`} className="font-serif text-2xl">Selecionar {label}</h2><button autoFocus type="button" className="button-ghost" onClick={() => dialog.current?.close()}>Cancelar</button></div>
      <label className="sheet-field mb-4"><span>Pesquisar {kind === 'MERIT' ? 'vantagens' : 'defeitos'}</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Nome em português ou inglês, efeito, requisito ou fonte" /></label>
      <details className="mb-5 border border-border p-4"><summary className="cursor-pointer">Criar ou editar registro personalizado</summary><div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="sheet-field"><span>Nome do registro</span><input value={draft.name} readOnly={minimum > 0} maxLength={120} onChange={event => setDraft(current => ({ ...current, name: event.target.value }))} /></label>
        <label className="sheet-field"><span>Pontos do registro</span><input type="number" min={minimum} max={5} step={1} value={Number.isNaN(draft.level) ? '' : draft.level} onChange={event => setDraft(current => ({ ...current, level: event.target.value === '' ? Number.NaN : Number(event.target.value) }))} /></label>
        <label className="sheet-field sm:col-span-2"><span>Descrição do registro</span><textarea value={draft.description} rows={4} maxLength={10000} onChange={event => setDraft(current => ({ ...current, description: event.target.value }))} /></label>
        {message && <p role="alert" className="text-sm text-primary sm:col-span-2">{message}</p>}
        <button type="button" className="button-primary justify-self-start" onClick={applyCustom}>Usar registro personalizado</button>
      </div></details>
      {isLoading && <output className="block text-sm text-muted-foreground">Carregando opções…</output>}
      {error && <div role="alert"><p>Não foi possível carregar o catálogo. Você pode criar um registro personalizado.</p><button type="button" className="button-ghost mt-3" onClick={() => void mutate().catch(() => undefined)}>Tentar novamente</button></div>}
      {data && !error && <output className="mb-4 block text-sm text-muted-foreground">{options.length} opções encontradas</output>}
      {data && !error && options.length === 0 && <p className="empty-state">Nenhuma opção encontrada. Você pode criar um registro personalizado acima.</p>}
      <div className="flex flex-col gap-4">{!error && options.map(entry => <article key={entry.id} className="border border-border p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-serif text-xl">{entry.name} · {entry.rating}</h3><p lang="en" className="text-sm text-muted-foreground">{entry.originalName}</p></div><button type="button" className="button-primary" disabled={minimum > 0 || !entry.selectable} onClick={() => { if (minimum > 0 || !entry.selectable) { return; } onChange({ ...value, name: entry.name, level: entry.level, description: entry.description }); dialog.current?.close() }}>Selecionar {entry.name}</button></div><p className="mt-3 text-xs text-muted-foreground">{entry.type} · {entry.group}{!entry.selectable && ' · Somente referência'}</p><p className="mt-3 whitespace-pre-wrap text-sm leading-6">{entry.description}</p></article>)}</div>
    </dialog>
  </div>
}
