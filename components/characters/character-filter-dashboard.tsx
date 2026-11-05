'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'
import { ArrowRight, ListFilter, ScrollText, ShieldCheck, Users } from 'lucide-react'

export type CharacterFilter = 'all' | 'current' | 'approved' | 'linked'
export type CharacterFilterEntry = { status: string; linked: boolean }

const FilterContext = createContext<CharacterFilter>('all')

export function matchesCharacterFilter(character: CharacterFilterEntry, filter: CharacterFilter) {
  if (filter === 'current') return character.status !== 'ARCHIVED'
  if (filter === 'approved') return character.status === 'APPROVED'
  if (filter === 'linked') return character.linked && character.status !== 'ARCHIVED'
  return true
}

export function CharacterFilterDashboard({
  counts, characters, children,
}: Readonly<{
  counts: { current: number; approved: number; linked: number }
  characters: CharacterFilterEntry[]
  children: ReactNode
}>) {
  const [filter, setFilter] = useState<CharacterFilter>('all')
  const cards = [
    { id: 'current' as const, label: 'Fichas atuais', count: counts.current, Icon: Users },
    { id: 'approved' as const, label: 'Aprovadas', count: counts.approved, Icon: ShieldCheck },
    { id: 'linked' as const, label: 'Vinculadas a mesas', count: counts.linked, Icon: ScrollText },
  ]
  const visibleCount = characters.filter(character => matchesCharacterFilter(character, filter)).length

  return <FilterContext.Provider value={filter}>
    <section className="characters-ui-stats characters-filter-stats" aria-label="Filtrar personagens">
      {cards.map(({ id, label, count, Icon }) => {
        const selected = filter === id
        return <button
          key={id}
          type="button"
          className={`characters-filter-stat ${selected ? 'is-selected' : ''}`}
          aria-pressed={selected}
          aria-label={`${label}: ${count}. ${selected ? 'Clique para remover o filtro.' : 'Clique para filtrar personagens.'}`}
          onClick={() => setFilter(current => current === id ? 'all' : id)}
        >
          <Icon className="size-6 text-primary" aria-hidden="true"/>
          <span className="eyebrow">{label}</span>
          <strong>{count}</strong>
          <ArrowRight className="characters-filter-arrow size-4" aria-hidden="true"/>
          {selected && <span className="characters-filter-active"><ListFilter className="size-3" aria-hidden="true"/>Filtro ativo</span>}
        </button>
      })}
    </section>
    {filter !== 'all' && <output className="block characters-filter-feedback">
      <ListFilter className="size-4" aria-hidden="true"/>
      <span>{visibleCount} {visibleCount === 1 ? 'ficha encontrada' : 'fichas encontradas'} em <strong>{cards.find(card => card.id === filter)?.label}</strong>.</span>
      <button type="button" onClick={() => setFilter('all')}>Limpar filtro</button>
    </output>}
    {visibleCount === 0 && filter !== 'all' && <p className="characters-filter-empty">Nenhuma ficha corresponde ao filtro selecionado.</p>}
    {children}
  </FilterContext.Provider>
}

export function CharacterFilterGroup({
  characters, children,
}: Readonly<{ characters: CharacterFilterEntry[]; children: ReactNode }>) {
  const filter = useContext(FilterContext)
  if (!characters.some(character => matchesCharacterFilter(character, filter))) return null
  return <>{children}</>
}

export function CharacterFilterCard({
  character, children,
}: Readonly<{ character: CharacterFilterEntry; children: ReactNode }>) {
  const filter = useContext(FilterContext)
  return matchesCharacterFilter(character, filter) ? <>{children}</> : null
}
