'use client'

import { useRef, useState } from 'react'
import useSWR from 'swr'
import type { ClanModifiers } from '@/lib/vtm-v5/clan-mechanics'

type Result = { normalDice: number[]; hungerDice: number[]; successes: number; difficulty?: number; margin?: number; outcome?: string; totalFailure: boolean }
type Roll = { id: string; mode: string; reason: string; visibility: string; hiddenDifficulty: boolean; clanModifiers?: ClanModifiers; result: Result; canReroll: boolean; canAdjudicate?: boolean; dice: { id: string; type: string; value: number }[]; revisions: { number: number; result: Result; replacements?: { dieId: string; before: number; after: number }[] }[]; adjudications: { id: string; kind: string; note: string; offerId?: string }[]; sources: { id: string; book: string; edition: string; printed: string; pdf: number; href: string }[] }
type History = { revision: number; history: Roll[]; canAdjudicate: boolean; canAcceptCost?: boolean }
type Pending = { path: string; body: Record<string, unknown> }
const outcomes: Record<string, string> = { SUCCESS: 'Vitória', CRITICAL: 'Vitória crítica', MESSY_CRITICAL: 'Crítico com Fome', FAILURE: 'Falha', BESTIAL_FAILURE: 'Falha bestial' }
const modeNames: Record<string, string> = { TEST: 'Atributo + habilidade', CHECK: 'Check', WILLPOWER: 'Força de Vontade', HUMANITY: 'Humanidade', TAKING_HALF: 'Taking Half', AUTOMATIC: 'Vitória automática' }

async function fetchHistory(url: string): Promise<History> {
  const response = await fetch(url)
  const data = await response.json()
  if (!response.ok) throw new Error('Não foi possível carregar o histórico.')
  return data
}

export function RollHistory({ characterId }: Readonly<{ characterId: string }>) {
  const endpoint = `/api/characters/${characterId}/rolls`
  const { data, error, mutate } = useSWR<History>(endpoint, fetchHistory)
  const [selection, setSelection] = useState<{ rollId: string; ids: string[] }>({ rollId: '', ids: [] })
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [retry, setRetry] = useState(false)
  const pending = useRef<Pending | null>(null)
  const inFlight = useRef(false)

  async function send(path?: string, body?: Record<string, unknown>) {
    if (inFlight.current || !data) return
    if (!pending.current && path && body) pending.current = { path, body: { ...body, expectedRevision: data.revision, idempotencyKey: crypto.randomUUID() } }
    if (!pending.current) return
    inFlight.current = true
    setBusy(true)
    setMessage('')
    try {
      const response = await fetch(pending.current.path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pending.current.body) })
      const result = await response.json()
      if (!response.ok) {
        if (response.status < 500) { pending.current = null; setRetry(false) }
        if (response.status === 409) await mutate()
        throw new Error(result.error ?? 'Não foi possível confirmar a operação.')
      }
      if (result.ok !== true) throw new Error('Operação não confirmada.')
      pending.current = null
      setRetry(false)
      setSelection({ rollId: '', ids: [] })
      await mutate()
      setMessage('Operação registrada. Os dados originais foram preservados.')
    } catch (error_) {
      setRetry(Boolean(pending.current))
      setMessage(error_ instanceof Error ? error_.message : 'Falha de conexão. Reenvie a mesma operação.')
    } finally { inFlight.current = false; setBusy(false) }
  }

  if (!data?.history?.length && !error) return null
  return <section className="border border-border bg-card p-5" aria-label="Histórico de dados" aria-busy={busy}>
    <h2 className="font-serif text-xl">Histórico de dados</h2>
    <p className="mt-2 text-sm text-muted-foreground">Força de Vontade: uma ativação por teste, até três dados comuns, com 1 dano superficial. Os novos valores substituem os anteriores, mesmo quando forem menores.</p>
    {error && <p role="alert">Não foi possível carregar o histórico.</p>}
    {message && <output className="mt-3 block text-sm" aria-live="polite">{message}</output>}
    {retry && <button type="button" className="button-ghost mt-3" disabled={busy} onClick={() => void send()}>Reenviar a mesma operação</button>}
    <div className="mt-4 flex flex-col gap-4">{data?.history.toReversed().map(roll => <details key={roll.id} className="border border-border p-4">
      <summary className="cursor-pointer text-sm">{roll.reason} · {roll.result.successes} sucesso(s) · {outcomes[roll.result.outcome ?? ''] ?? 'Resolução reservada'}{roll.visibility === 'SECRET' ? ' · Secreta' : ''}</summary>
      <p className="mt-3 text-sm">{roll.result.difficulty === undefined ? 'Dificuldade reservada; a rerrolagem é conduzida pelo Narrador.' : `Dificuldade ${roll.result.difficulty} · Margem ${roll.result.margin}`} · {modeNames[roll.mode] ?? 'Teste registrado'}</p>
      {roll.result.totalFailure && <p className="mt-2 text-sm">Nenhum sucesso: falha total.</p>}
      {roll.clanModifiers && <p className="mt-2 text-sm">{roll.clanModifiers.labels.join(' · ')} · Penalidade de clã: −{roll.clanModifiers.dicePenalty} dado(s).</p>}
      <fieldset className="mt-3 flex flex-wrap gap-2" disabled={busy || retry || !roll.canReroll}>
        <legend className="mb-2 text-xs">Selecionar dados comuns para rerrolar</legend>
        {roll.dice.map(die => <label key={die.id} className="flex items-center gap-2 border border-border p-2 text-sm"><input type="checkbox" aria-label={`${die.type === 'NORMAL' ? 'Dado comum' : 'Dado de Fome'} ${die.id}, valor ${die.value}`} disabled={die.type !== 'NORMAL'} checked={selection.rollId === roll.id && selection.ids.includes(die.id)} onChange={() => setSelection(current => {
          const ids = current.rollId === roll.id ? current.ids : []
          return { rollId: roll.id, ids: ids.includes(die.id) ? ids.filter(id => id !== die.id) : ids.length < 3 ? [...ids, die.id] : ids }
        })} />{die.type === 'HUNGER' ? 'Fome' : 'Comum'} {die.value}</label>)}
      </fieldset>
      {roll.canReroll && <button type="button" className="button-ghost mt-3" disabled={busy || retry || selection.rollId !== roll.id || selection.ids.length === 0} onClick={() => void send(`${endpoint}/${roll.id}/reroll`, { dieIds: selection.ids })}>Gastar Vontade e rerrolar</button>}
      <details className="mt-4 text-sm"><summary className="cursor-pointer">Dados originais e revisões ({roll.revisions.length})</summary>{roll.revisions.map(revision => <p key={revision.number} className="mt-2 font-mono text-xs">Revisão {revision.number}: comuns [{revision.result.normalDice.join(', ')}], Fome [{revision.result.hungerDice.join(', ')}], {revision.result.successes} sucesso(s){revision.replacements?.map(change => ` · ${change.dieId}: ${change.before} → ${change.after}`).join('')}</p>)}</details>
      {roll.adjudications.map(entry => <div key={entry.id} className="mt-3 border-l border-border pl-3 text-sm"><p>{entry.note}</p>{entry.kind === 'OFFER_COST' && data.canAcceptCost && !roll.adjudications.some(decision => decision.kind === 'ACCEPT_COST') && <button type="button" className="button-ghost mt-2" disabled={busy || retry} onClick={() => void send(`${endpoint}/${roll.id}/adjudications`, { kind: 'ACCEPT_COST', offerId: entry.id, note: 'Oferta de vitória a custo aceita pelo jogador.' })}>Aceitar vitória a custo</button>}</div>)}
      {data.canAdjudicate && roll.canAdjudicate !== false && <form className="mt-4 flex flex-col gap-3" onSubmit={event => {
        event.preventDefault()
        const fields = new FormData(event.currentTarget)
        void send(`${endpoint}/${roll.id}/adjudications`, { kind: fields.get('kind'), note: fields.get('note'), shared: fields.get('shared') === 'on' })
      }}><label className="sheet-field"><span>Decisão do Narrador</span><select name="kind" className="select" disabled={busy || retry}><option value="COMPLICATION">Registrar complicação</option><option value="NARRATIVE_FAILURE">Resolver Messy Critical como falha narrativa</option><option value="OFFER_COST">Oferecer vitória a custo</option></select></label><label className="sheet-field"><span>Decisão e justificativa</span><textarea name="note" className="input" required maxLength={1000} disabled={busy || retry} /></label><label className="flex items-center gap-2 text-sm"><input name="shared" type="checkbox" disabled={busy || retry} />Compartilhar esta decisão com o jogador (ofertas são compartilhadas)</label><button type="submit" className="button-ghost self-start" disabled={busy || retry}>Registrar decisão</button></form>}
      <div className="mt-4 flex flex-wrap gap-3">{roll.sources.map(source => <p key={source.id} className="text-xs text-muted-foreground">{source.book} · {source.edition} · livro {source.printed} · PDF {source.pdf} · arquivo não disponível nesta etapa</p>)}</div>
    </details>)}</div>
  </section>
}
