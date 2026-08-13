'use client'

import { useMemo, useState } from 'react'

type Character = {
  name: string
  className: string
  mode: string
  status: 'Ativo' | 'Em risco'
  date: string
  accent: string
  initials: string
}

const characters: Character[] = [
  { name: 'Unknown', className: 'Caçador', mode: 'Gen Solo', status: 'Ativo', date: '11 ago, 2026', accent: 'blood', initials: 'UN' },
  { name: 'Asmodeus', className: 'Ventrue', mode: 'Gen Solo', status: 'Ativo', date: '11 ago, 2026', accent: 'steel', initials: 'AS' },
  { name: 'Mara Voss', className: 'Oráculo', mode: 'Crônica', status: 'Em risco', date: '09 ago, 2026', accent: 'bone', initials: 'MV' },
]

export default function Page() {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('Todos')
  const [sort, setSort] = useState('recentes')
  const [notice, setNotice] = useState('')

  const visibleCharacters = useMemo(() => {
    const result = characters.filter((character) => {
      const matchesQuery = character.name.toLowerCase().includes(query.toLowerCase())
      const matchesStatus = status === 'Todos' || character.status === status
      return matchesQuery && matchesStatus
    })
    return sort === 'nome' ? [...result].sort((a, b) => a.name.localeCompare(b.name)) : result
  }, [query, status, sort])

  function showNotice(message: string) {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 2200)
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="noise" aria-hidden="true" />
      <header className="border-b border-border bg-card/80">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-5 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-10">
          <div className="flex items-center gap-4">
            <div className="sigil" aria-hidden="true">LC</div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Arquivo nº 13 / acesso restrito</p>
              <h1 className="font-serif text-2xl uppercase tracking-[0.12em] text-foreground sm:text-3xl">Ledger Command</h1>
            </div>
          </div>
          <div className="flex items-center justify-between gap-5 sm:justify-end">
            <div className="text-left sm:text-right">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Operador</p>
              <p className="text-sm text-foreground">teste@teste.com</p>
            </div>
            <button className="button-ghost" onClick={() => showNotice('Sessão encerrada com segurança.')}>Sair</button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
        <section className="mb-8 flex flex-col gap-6 border-b border-border pb-8 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow">Livro de registros · 03 entidades</p>
            <h2 className="mt-3 font-serif text-4xl uppercase tracking-[0.07em] text-foreground sm:text-5xl">Seus personagens</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">Acompanhe os sobreviventes, as ameaças e tudo aquilo que insiste em permanecer.</p>
          </div>
          <button className="button-primary w-full md:w-auto" onClick={() => showNotice('Abrindo ficha de novo personagem...')}><span aria-hidden="true">+</span> Novo personagem</button>
        </section>

        <section className="mb-8 grid grid-cols-2 gap-px border border-border bg-border sm:grid-cols-4" aria-label="Resumo dos personagens">
          {[['03', 'Total'], ['02', 'Ativos'], ['01', 'Em risco'], ['11', 'Última sessão']].map(([value, label]) => (
            <div key={label} className="bg-card px-4 py-4 sm:px-5"><p className="font-serif text-2xl text-foreground">{value}</p><p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p></div>
          ))}
        </section>

        <section className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-sm"><label htmlFor="search" className="sr-only">Buscar personagem</label><input id="search" value={query} onChange={(event) => setQuery(event.target.value)} className="input w-full pl-10" placeholder="Buscar por nome..." /><span className="absolute left-3 top-2.5 text-muted-foreground" aria-hidden="true">⌕</span></div>
          <div className="flex flex-col gap-3 sm:flex-row"><label className="select-label">Status<select className="select" value={status} onChange={(event) => setStatus(event.target.value)}><option>Todos</option><option>Ativo</option><option>Em risco</option></select></label><label className="select-label">Ordenar<select className="select" value={sort} onChange={(event) => setSort(event.target.value)}><option value="recentes">Mais recentes</option><option value="nome">Nome</option></select></label></div>
        </section>

        <section className="space-y-3" aria-label="Lista de personagens">
          {visibleCharacters.map((character) => <article key={character.name} className="character-card"><div className={`portrait ${character.accent}`}>{character.initials}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-3"><h3 className="font-serif text-xl uppercase tracking-[0.08em] text-foreground">{character.name}</h3><span className={`status ${character.status === 'Ativo' ? 'active' : 'risk'}`}><span aria-hidden="true" className="status-dot" />{character.status}</span></div><p className="mt-2 text-sm text-muted-foreground">{character.className}<span className="mx-2 text-border">•</span>{character.mode}</p></div><div className="meta"><p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Última atualização</p><p className="mt-1 text-sm text-foreground">{character.date}</p></div><div className="actions"><button className="action-edit" onClick={() => showNotice(`Editando ${character.name}...`)}>Editar</button><button className="action-delete" onClick={() => showNotice(`Exclusão de ${character.name} requer confirmação.`)}>Excluir</button></div></article>)}
          {visibleCharacters.length === 0 && <div className="empty-state">Nenhum registro encontrado.</div>}
        </section>
      </div>
      {notice && <div className="toast" role="status">{notice}</div>}
    </main>
  )
}
