'use client'

import { useMemo, useState } from 'react'
import type catalog from '@/lib/vtm-v5/merits-flaws-catalog.json'

type Entry = (typeof catalog.entries)[number]
const PAGE_SIZE = 30
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR')

export function MeritsFlawsResearch({ entries, rules }: Readonly<{ entries: readonly Entry[]; rules: typeof catalog.general_rules }>) {
  const [filters, setFilters] = useState({ query: '', type: '', group: '', dots: '', eligibility: '', book: '' })
  const [page, setPage] = useState(0)
  const filtered = useMemo(() => entries.filter(entry => {
    const text = [entry.name, entry.effect, entry.restriction, entry.rating_detail, entry.group, entry.eligibility].flatMap(value => [value.pt, value.en]).concat(entry.source.title).join(' ')
    return (!filters.query || normalize(text).includes(normalize(filters.query.trim())))
      && (!filters.type || entry.type.pt === filters.type)
      && (!filters.group || entry.group.pt === filters.group)
      && (!filters.dots || String(entry.dots) === filters.dots)
      && (!filters.eligibility || entry.eligibility.pt === filters.eligibility)
      && (!filters.book || entry.source.title === filters.book)
  }), [entries, filters])
  const pageCount = Math.ceil(filtered.length / PAGE_SIZE)
  const visible = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const update = (field: keyof typeof filters, value: string) => { setFilters(current => ({ ...current, [field]: value })); setPage(0) }
  const selectors = [
    { field: 'type', label: 'Tipo', values: entries.map(entry => entry.type.pt) },
    { field: 'group', label: 'Categoria', values: entries.map(entry => entry.group.pt) },
    { field: 'dots', label: 'Pontos', values: entries.map(entry => String(entry.dots)) },
    { field: 'eligibility', label: 'Elegibilidade', values: entries.map(entry => entry.eligibility.pt) },
    { field: 'book', label: 'Livro', values: entries.map(entry => entry.source.title) },
  ] as const

  return <section aria-label="Pesquisa de vantagens e defeitos" className="flex flex-col gap-6">
    <div className="grid gap-4 rounded-lg border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-3">
      <label className="text-sm text-muted-foreground sm:col-span-2 lg:col-span-3"><span>Pesquisar vantagens e defeitos</span><input type="search" className="input mt-2 w-full" value={filters.query} onChange={event => update('query', event.target.value)} placeholder="Nome em português ou inglês, efeito, requisito ou fonte" /></label>
      {selectors.map(({ field, label, values }) => <label key={field} className="text-sm text-muted-foreground"><span>{label}</span><select className="select mt-2 w-full" value={filters[field]} onChange={event => update(field, event.target.value)}><option value="">Todos</option>{[...new Set(values)].sort((first, second) => first.localeCompare(second, 'pt-BR', { numeric: true })).map(value => <option key={value} value={value}>{value === 'null' ? 'Sem pontos (escolha especial)' : value}</option>)}</select></label>)}
      <div className="flex items-end justify-between gap-3"><output aria-live="polite" className="text-sm text-muted-foreground">{filtered.length} de {entries.length} registros</output><button type="button" className="button-ghost" onClick={() => { setFilters({ query: '', type: '', group: '', dots: '', eligibility: '', book: '' }); setPage(0) }}>Limpar filtros</button></div>
    </div>

    <details className="rounded-lg border border-border bg-card p-4"><summary className="cursor-pointer font-serif text-xl">Regras gerais e custos</summary><dl className="mt-4 flex flex-col gap-4">{rules.map(rule => <div key={rule.name.en}><dt className="font-semibold">{rule.name.pt}</dt><dd className="mt-1 text-sm leading-6 text-muted-foreground">{rule.text.pt}<span className="mt-1 block text-xs">Fonte: {rule.source}</span></dd></div>)}</dl></details>

    {visible.length ? <div className="grid gap-4">{visible.map(entry => <article key={entry.id} className="rounded-lg border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-3"><div><p className="eyebrow">{entry.type.pt} · {entry.group.pt}</p><h2 className="mt-1 font-serif text-2xl">{entry.name.pt}</h2><p lang="en" className="mt-1 text-sm text-muted-foreground">{entry.name.en}</p></div><span className="status">{entry.rating_label.pt} · {entry.selectable ? 'Disponível para avaliação' : 'Somente referência'}</span></div>
      <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
        <div><dt className="text-muted-foreground">Efeito</dt><dd className="mt-1 whitespace-pre-wrap leading-6">{entry.effect.pt}</dd></div>
        <div><dt className="text-muted-foreground">Graduação</dt><dd className="mt-1 whitespace-pre-wrap leading-6">{entry.rating_detail.pt}</dd></div>
        <div><dt className="text-muted-foreground">Restrições e requisitos</dt><dd className="mt-1 whitespace-pre-wrap leading-6">{entry.restriction.pt}</dd></div>
        <div><dt className="text-muted-foreground">Elegibilidade</dt><dd className="mt-1">{entry.eligibility.pt}</dd><dt className="mt-3 text-muted-foreground">XP da graduação a partir de zero</dt><dd className="mt-1">{entry.xp_from_zero ?? 'Não se aplica'}</dd></div>
      </dl>
      <p className="mt-4 border-t border-border pt-3 text-xs leading-5 text-muted-foreground">Fonte: {entry.source.title} · p. {entry.source.printed_pages} · PDF p. {entry.source.pdf_pages.join(', ')}<br />{entry.source_status.pt}</p>
    </article>)}</div> : <p className="empty-state">Nenhum registro corresponde aos filtros.</p>}

    {pageCount > 1 && <nav className="flex items-center justify-between gap-4" aria-label="Paginação de vantagens e defeitos"><button type="button" className="button-ghost" disabled={page === 0} onClick={() => setPage(page - 1)}>Anterior</button><span className="text-sm text-muted-foreground" aria-live="polite">Página {page + 1} de {pageCount}</span><button type="button" className="button-ghost" disabled={page + 1 >= pageCount} onClick={() => setPage(page + 1)}>Próxima</button></nav>}
  </section>
}
