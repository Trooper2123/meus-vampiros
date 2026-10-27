'use client'

import { useRef, useState } from 'react'
import useSWR from 'swr'
import type { XpHistory } from '@/lib/campaign-xp-history'

const categories: Record<string, string> = { DISCIPLINE: 'Disciplina', SPECIALTY: 'Especialidade', XP: 'Movimentação de XP' }
const types: Record<string, string> = { XP_GRANTED: 'Concessão', XP_SPENT: 'Compra', XP_ADJUSTED: 'Ajuste', XP_REFUNDED: 'Estorno' }
async function read(url: string): Promise<XpHistory> {
  const response = await fetch(url, { cache: 'no-store' })
  const body = await response.json()
  if (!response.ok) throw new Error(body.error ?? 'Não foi possível consultar a evolução.')
  return body
}

export function CampaignXpHistory({ campaignId, initialCharacterId = '' }: Readonly<{ campaignId: string; initialCharacterId?: string }>) {
  const [filters, setFilters] = useState({ characterId: initialCharacterId, category: '', from: '', to: '', viewed: '', page: '1' })
  const url = `/api/campaigns/${campaignId}/xp-history`
  const { data: snapshot, error, mutate } = useSWR<XpHistory>(`${url}?${new URLSearchParams(filters)}`, read, { refreshInterval: 15000, keepPreviousData: false })
  const data = error ? undefined : snapshot
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState('')
  const sending = useRef(false)
  const selected = data?.characters.filter(character => !filters.characterId || character.id === filters.characterId) ?? []
  function filter(key: string, value: string) { setFilters(current => ({ ...current, [key]: value, page: '1' })) }
  async function markViewed() {
    if (sending.current || !data) return
    const eventIds = data.entries.filter(entry => !entry.viewed).map(entry => entry.id)
    if (!eventIds.length) return
    sending.current = true; setBusy(true); setFeedback('')
    try {
      const response = await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ eventIds }) })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error ?? 'Não foi possível registrar a leitura.')
      setFeedback('Registros desta página marcados como visualizados. O histórico foi preservado.')
      await mutate()
    } catch (failure) { setFeedback(failure instanceof Error ? failure.message : 'Falha ao registrar leitura. Tente novamente.') }
    finally { sending.current = false; setBusy(false) }
  }
  return <details id="campaign-xp-history" open={!!initialCharacterId} className="border border-border bg-card p-5">
    <summary className="cursor-pointer font-serif text-2xl">Histórico de evolução dos personagens{data ? ` (${data.unread} ${data.unread === 1 ? 'nova compra' : 'novas compras'})` : ''}</summary>
    <div className="mt-5 flex flex-col gap-5">
      <p className="text-sm text-muted-foreground">Compras válidas são informativas e não exigem nova aprovação. Saldos incluem os registros existentes da ficha; compras anteriores à implantação deste histórico podem não ter detalhamento.</p>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <label className="sheet-field"><span>Personagem</span><select className="select" value={filters.characterId} onChange={event => filter('characterId', event.target.value)}><option value="">Todos</option>{data?.characters.map(character => <option key={character.id} value={character.id}>{character.name}</option>)}</select></label>
        <label className="sheet-field"><span>Categoria</span><select className="select" value={filters.category} onChange={event => filter('category', event.target.value)}><option value="">Todas</option>{Object.entries(categories).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <label className="sheet-field"><span>De</span><input className="input" type="date" value={filters.from} onChange={event => filter('from', event.target.value)} /></label>
        <label className="sheet-field"><span>Até</span><input className="input" type="date" value={filters.to} onChange={event => filter('to', event.target.value)} /></label>
        <label className="sheet-field"><span>Visualização</span><select className="select" value={filters.viewed} onChange={event => filter('viewed', event.target.value)}><option value="">Todas</option><option value="false">Não visualizadas</option><option value="true">Visualizadas</option></select></label>
      </div>
      {feedback && <p role="status" className="text-sm text-muted-foreground">{feedback}</p>}
      {error && <div role="alert"><p>Não foi possível consultar o histórico.</p><button type="button" className="button-ghost" onClick={() => void mutate()}>Tentar novamente</button></div>}
      {!data && !error && <p role="status" className="text-sm text-muted-foreground">Carregando evolução…</p>}
      {data && <>
        <details className="border border-border p-4"><summary className="cursor-pointer font-serif text-xl">Resumo de XP por personagem</summary><div className="mt-4 grid gap-3 sm:grid-cols-2">{selected.map(character => <article key={character.id} className="border border-border p-3"><h3 className="font-serif text-xl">{character.name}</h3><p className="mt-2 text-sm">Recebido: {character.totalXp} XP · Gasto: {character.spentXp} XP · Disponível: {character.availableXp} XP</p><p className="mt-3 text-sm">Últimas compras:</p>{character.recentPurchases.length ? <ul className="mt-2 flex flex-col gap-1">{character.recentPurchases.map((purchase, index) => <li key={index} className="text-sm text-muted-foreground">{purchase.traitName} · {purchase.xpAmount} XP</li>)}</ul> : <p className="text-sm text-muted-foreground">Nenhuma compra detalhada registrada.</p>}<button type="button" className="button-ghost mt-3" onClick={() => setFilters({ characterId: character.id, category: '', from: '', to: '', viewed: '', page: '1' })}>Consultar histórico completo</button></article>)}</div></details>
        <button type="button" className="button-ghost self-start" disabled={busy || !data.entries.some(entry => !entry.viewed)} onClick={() => void markViewed()}>Marcar registros desta página como visualizados</button>
        {data.entries.length === 0 && <p className="empty-state">Nenhuma evolução encontrada para os filtros selecionados.</p>}
        <ul className="flex flex-col gap-3">{data.entries.map(entry => <li key={entry.id} className="border border-border p-4"><h3 className="font-serif text-xl">{entry.characterName}</h3><p className="text-sm text-muted-foreground">Jogador: {entry.player}</p><p className="mt-2 text-sm">{categories[entry.category]}: {entry.traitName}{entry.previousValue !== null && entry.newValue !== null ? ` ${entry.previousValue} → ${entry.newValue}` : ''}</p><p className="text-sm">{types[entry.type]} · {entry.xpAmount} XP · {entry.viewed ? 'Visualizada' : 'Não visualizada'}</p><p className="mt-2 text-xs text-muted-foreground"><time dateTime={entry.createdAt}>{new Date(entry.createdAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</time>{entry.source && ` · Origem: ${entry.source}`}</p></li>)}</ul>
        <nav className="flex flex-wrap items-center gap-3" aria-label="Paginação do histórico de evolução"><button type="button" className="button-ghost" disabled={Number(filters.page) <= 1} onClick={() => setFilters(current => ({ ...current, page: String(Number(current.page) - 1) }))}>Anterior</button><p className="text-sm">Página {data.page} · {data.total} registros</p><button type="button" className="button-ghost" disabled={data.page * 30 >= data.total} onClick={() => setFilters(current => ({ ...current, page: String(Number(current.page) + 1) }))}>Próxima</button></nav>
      </>}
    </div>
  </details>
}
