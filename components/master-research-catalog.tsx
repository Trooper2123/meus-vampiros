'use client'

import { useMemo, useState } from 'react'
import type { DisciplineResearchEntry } from '@/lib/vtm-v5/research-catalog'

const PAGE_SIZE = 30
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR')

export function MasterResearchCatalog({ entries, skills }: { entries: readonly DisciplineResearchEntry[]; skills: readonly { id: string; name: string }[] }) {
  const [query, setQuery] = useState('')
  const [discipline, setDiscipline] = useState('')
  const [type, setType] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(0)
  const skillNames = useMemo(() => new Map(skills.map(skill => [skill.id, skill.name])), [skills])
  const filtered = useMemo(() => entries.filter(entry => {
    const text = normalize([entry.name, entry.effect, entry.cost, entry.prerequisite, entry.amalgam, entry.duration, entry.pool, entry.opposing_pool, entry.notes, entry.source, entry.source_file, ...entry.skillIds.map(id => skillNames.get(id))].join(' '))
    return (!query || text.includes(normalize(query))) && (!discipline || entry.disciplineId === discipline) && (!type || entry.type === type) && (!status || entry.status === status)
  }), [entries, query, discipline, type, status, skillNames])
  const pageCount = Math.ceil(filtered.length / PAGE_SIZE)
  const visible = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const update = (setter: (value: string) => void) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => { setter(event.target.value); setPage(0) }

  return <section aria-label="Catálogo de pesquisa de Disciplinas" className="flex flex-col gap-6">
    <div className="grid gap-4 rounded-lg border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
      <label className="text-sm text-muted-foreground sm:col-span-2 lg:col-span-4">Pesquisar no catálogo
        <input className="input mt-2 w-full" value={query} onChange={update(setQuery)} placeholder="Nome, efeito, requisito ou fonte" />
      </label>
      <label className="text-sm text-muted-foreground">Disciplina
        <select className="select mt-2 w-full" value={discipline} onChange={update(setDiscipline)}><option value="">Todas</option>{[...new Map(entries.map(entry => [entry.disciplineId, entry.discipline])).entries()].map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select>
      </label>
      <label className="text-sm text-muted-foreground">Tipo
        <select className="select mt-2 w-full" value={type} onChange={update(setType)}><option value="">Todos</option>{[...new Set(entries.map(entry => entry.type))].map(value => <option key={value}>{value}</option>)}</select>
      </label>
      <label className="text-sm text-muted-foreground">Situação da fonte
        <select className="select mt-2 w-full" value={status} onChange={update(setStatus)}><option value="">Todas</option>{[...new Set(entries.map(entry => entry.status))].map(value => <option key={value}>{value}</option>)}</select>
      </label>
      <p className="self-end text-sm text-muted-foreground" role="status">{filtered.length} de {entries.length} registros</p>
    </div>

    <details className="rounded-lg border border-border bg-card p-4">
      <summary className="cursor-pointer font-serif text-xl">Habilidades cadastradas ({skills.length})</summary>
      <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">{skills.map(skill => <li key={skill.id} className="flex justify-between gap-3 border-b border-border py-2"><span>{skill.name}</span><code className="text-muted-foreground">{skill.id}</code></li>)}</ul>
    </details>

    {visible.length ? <div className="grid gap-4">
      {visible.map(entry => <article key={entry.id} className="rounded-lg border border-border bg-card p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-3">
          <div><p className="eyebrow">{entry.discipline} · nível {entry.level} · {entry.type}</p><h2 className="mt-1 font-serif text-2xl">{entry.name}</h2></div>
          <span className="rounded border border-border px-2 py-1 text-xs text-muted-foreground">{entry.status}</span>
        </div>
        <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {([['Efeito', entry.effect], ['Custo', entry.cost], ['Pré-requisito', entry.prerequisite], ['Amálgama', entry.amalgam], ['Duração', entry.duration], ['Parada de dados', entry.pool], ['Resistência', entry.opposing_pool]] as const).map(([label, value]) => value && <div key={label}><dt className="text-muted-foreground">{label}</dt><dd className="mt-1 whitespace-pre-wrap">{value}</dd></div>)}
        </dl>
        {entry.skillIds.length > 0 && <p className="mt-4 text-sm"><span className="text-muted-foreground">Habilidades relacionadas: </span>{entry.skillIds.map(id => skillNames.get(id) ?? id).join(', ')}</p>}
        {entry.notes && <details className="mt-4 border-t border-border pt-3 text-sm"><summary className="cursor-pointer text-muted-foreground">Observações e trecho de sistema</summary><p className="mt-2 whitespace-pre-wrap leading-6">{entry.notes}</p></details>}
        <p className="mt-4 border-t border-border pt-3 text-xs leading-5 text-muted-foreground">Fonte: {entry.source} · p. {entry.printed_page} · PDF p. {entry.pdf_page}<br />Arquivo: {entry.source_file}</p>
      </article>)}
    </div> : <p className="empty-state">Nenhum registro corresponde aos filtros.</p>}

    {pageCount > 1 && <nav className="flex items-center justify-between gap-4" aria-label="Paginação do catálogo">
      <button className="button-ghost" disabled={page === 0} onClick={() => setPage(page - 1)}>Anterior</button>
      <span className="text-sm text-muted-foreground" aria-live="polite">Página {page + 1} de {pageCount}</span>
      <button className="button-ghost" disabled={page + 1 >= pageCount} onClick={() => setPage(page + 1)}>Próxima</button>
    </nav>}
  </section>
}
