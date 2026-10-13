'use client'

import { NotesBacklinks } from '@/components/notes/notes-panel'

import { useRef, useState } from 'react'
import useSWR, { useSWRConfig } from 'swr'
import type { NightRequest, NightResult } from '@/lib/chronicle-nights'

type AwakeCharacter = { id: string; name: string; hunger: number; condition: string; status: string; lastProcessedNight: number | null; eligible: boolean }
type PanelData = { characters: AwakeCharacter[]; nights: NightResult[] }
const conditions: Record<string, string> = { ACTIVE: 'Ativo', DAY_SLEEP: 'Sono diurno', STAKED: 'Empalado', TORPOR: 'Torpor', FINAL_DEATH: 'Morte definitiva' }
const outcomes: Record<string, string> = { SKIPPED: 'Não processado: torpor exige intervenção do Narrador', AWAKENED: 'Despertou', AWAKENED_HUNGRIER: 'Despertou com mais Fome', TORPOR: 'Entrou em torpor por Fome' }

async function fetchPanel(url: string): Promise<PanelData> {
  const response = await fetch(url)
  const body = await response.json().catch(() => null)
  if (!response.ok || !Array.isArray(body?.characters)) throw new Error(body?.error ?? 'Não foi possível carregar o início de noite.')
  return body
}

export function AwakePanel({ campaignId }: { campaignId: string }) {
  const url = `/api/campaigns/${campaignId}/nights/awake`
  const { data, error, isLoading, mutate } = useSWR<PanelData>(url, fetchPanel)
  const { mutate: refreshCache } = useSWRConfig()
  const [inGameDate, setInGameDate] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [processing, setProcessing] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [result, setResult] = useState<NightResult | null>(null)
  const pending = useRef<NightRequest | null>(null)

  async function start(event: React.FormEvent) {
    event.preventDefault()
    if (processing) return
    if (!pending.current) {
      if (!inGameDate || !selected.length) { setFeedback('Informe a data da crônica e selecione pelo menos uma ficha elegível.'); return }
      const names = selected.map(id => data?.characters.find(character => character.id === id)?.name ?? 'Personagem').join(', ')
      if (!window.confirm(`Iniciar uma nova noite da crônica em ${inGameDate} para ${names}? Cada vampiro fora de torpor realiza um teste de Despertar. Falhar com Fome 5 causa torpor. Confirmar novamente após uma operação concluída inicia outra noite, mesmo na mesma data.`)) return
      pending.current = { inGameDate, characterIds: [...selected], idempotencyKey: crypto.randomUUID(), confirmed: true }
    }
    setProcessing(true)
    try {
      const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pending.current) })
      const body = await response.json().catch(() => null)
      if (!response.ok) {
        if (response.status >= 500) {
          setRetrying(true)
          setFeedback('Não foi possível confirmar o início. Reenviar usa a mesma operação para evitar outro despertar.')
          return
        }
        pending.current = null
        setRetrying(false)
        setFeedback(body?.error ?? 'Não foi possível iniciar a noite.')
        await mutate()
        return
      }
      if (!body?.id || !Array.isArray(body.results)) throw new Error('Resposta inválida.')
      const completed: NightResult = body
      setResult(completed)
      pending.current = null
      setRetrying(false)
      setSelected([])
      setFeedback(`Noite ${completed.nightNumber} iniciada. Os resultados foram registrados.`)
      await Promise.allSettled([mutate(), ...completed.results.flatMap(entry => [refreshCache(`/api/characters/${entry.characterId}/resources`), refreshCache(`/api/characters?id=${entry.characterId}`)])])
    } catch {
      setRetrying(!!pending.current)
      setFeedback(pending.current ? 'Falha de conexão. Reenviar preserva a mesma operação e os resultados já confirmados.' : 'A noite foi iniciada. Recarregue para atualizar a consulta.')
    } finally {
      setProcessing(false)
    }
  }

  const history = result ? [result, ...(data?.nights ?? []).filter(night => night.id !== result.id)] : data?.nights ?? []
  return <section className="border border-border bg-card p-5 sm:p-6" aria-labelledby="awake-title">
    <p className="eyebrow">Crônica / Despertar</p>
    <h2 id="awake-title" className="mt-2 font-serif text-2xl">Iniciar nova noite</h2>
    <p className="mb-5 mt-2 text-sm text-muted-foreground">A data da crônica é independente da sessão real. Uma nova confirmação inicia outra noite, inclusive na mesma data. Torpor exige intervenção do Narrador; personagens empalados continuam impedidos de agir.</p>
    {feedback && <p role="status" className="mb-4 text-sm text-muted-foreground">{feedback}</p>}
    {isLoading && <p role="status" className="text-sm text-muted-foreground">Carregando fichas e noites…</p>}
    {error && <div role="alert" className="flex flex-col gap-3"><p className="text-sm text-primary">{error instanceof Error ? error.message : 'Falha ao carregar o início de noite.'}</p><button className="button-ghost self-start" type="button" onClick={() => void mutate()}>Recarregar início de noite</button></div>}
    {data && !error && <>
      <form onSubmit={start} className="flex flex-col gap-5">
        <label className="flex max-w-sm flex-col gap-2 text-sm"><span>Data da crônica</span><input className="input" type="date" value={inGameDate} onChange={event => setInGameDate(event.target.value)} required disabled={processing || retrying} /></label>
        <fieldset className="flex flex-col gap-3"><legend className="mb-3 font-mono text-xs uppercase tracking-wider">Selecionar vampiros</legend>
          {!data.characters.length && <p className="empty-state text-sm">Nenhuma ficha está vinculada a esta mesa.</p>}
          {data.characters.map(character => <label key={character.id} className="flex items-start gap-3 border border-border p-3 text-sm"><input className="mt-1 accent-primary" type="checkbox" checked={selected.includes(character.id)} disabled={!character.eligible || processing || retrying} onChange={event => setSelected(current => event.target.checked ? [...current, character.id] : current.filter(id => id !== character.id))} /><span><strong>{character.name}</strong><span className="mt-1 block text-xs text-muted-foreground">Fome {character.hunger} / 5 · Última noite: {character.lastProcessedNight ?? 'nenhuma'} · {conditions[character.condition] ?? 'Condição inválida'}{!character.eligible && ' · Ficha indisponível para despertar'}{character.eligible && character.hunger === 5 && ' · Risco de torpor em caso de falha'}</span></span></label>)}
        </fieldset>
        <button className="button-primary self-start" type="submit" disabled={processing || (!retrying && !selected.length)}>{processing ? 'Processando despertares…' : retrying ? 'Reenviar início de noite' : 'Confirmar início de noite'}</button>
      </form>
      {history.length > 0 && <div className="mt-6 flex flex-col gap-4 border-t border-border pt-5"><h3 className="font-serif text-xl">Histórico de despertares</h3>{history.map(night => <article key={night.id} className="border border-border p-4"><h4 className="font-semibold">Noite {night.nightNumber} · {night.inGameDate}</h4><ul className="mt-3 flex flex-col gap-3">{night.results.map(entry => <li key={entry.characterId} className="text-sm"><strong>{entry.name}</strong>: {outcomes[entry.outcome] ?? 'Resultado não reconhecido'}<span className="mt-1 block text-xs text-muted-foreground">D10: {entry.roll ?? 'não rolado'} · Fome {entry.before.hunger} → {entry.after.hunger} · {conditions[entry.after.condition] ?? 'Condição inválida'}{entry.after.torpor && ` · Causa: ${{ HUNGER: 'Fome', DAMAGE: 'Dano', VOLUNTARY: 'Voluntário' }[entry.after.torpor.cause]}`}</span></li>)}</ul><NotesBacklinks targetType="SESSION" targetId={night.id} /></article>)}</div>}
    </>}
  </section>
}
