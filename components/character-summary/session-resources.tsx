'use client'

import { useRef, useState } from 'react'
import useSWR from 'swr'

type Damage = { superficial: number; aggravated: number }
type ResourceState = {
  hunger: number
  humanity: number
  healthDamage: Damage
  willpowerDamage: Damage
  healthCurrent: number
  willpowerCurrent: number
  stains: number
  condition: string
}
type ResourceResponse = {
  state: ResourceState
  maxima: { healthMax: number; willpowerMax: number }
  revision: number
  canEditNarrative: boolean
}
type Changes = Partial<Pick<ResourceState, 'hunger' | 'humanity' | 'healthDamage' | 'willpowerDamage' | 'stains'>>
type ResourceCommand = { changes: Changes; reason: string; expectedRevision: number; idempotencyKey: string }

async function fetchResources(url: string): Promise<ResourceResponse> {
  const response = await fetch(url)
  const body = await response.json().catch(() => null)
  if (!response.ok || !body?.state) throw new Error(body?.error ?? 'Não foi possível carregar os recursos.')
  return body
}

function ResourceForm({ data, url, refresh, notify }: { data: ResourceResponse; url: string; refresh: () => Promise<unknown>; notify: (message: string) => void }) {
  const [values, setValues] = useState({
    hunger: String(data.state.hunger),
    humanity: String(data.state.humanity),
    stains: String(data.state.stains),
    healthSuperficial: String(data.state.healthDamage.superficial),
    healthAggravated: String(data.state.healthDamage.aggravated),
    willpowerSuperficial: String(data.state.willpowerDamage.superficial),
    willpowerAggravated: String(data.state.willpowerDamage.aggravated),
  })
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const pending = useRef<ResourceCommand | null>(null)

  async function save(event: React.FormEvent) {
    event.preventDefault()
    if (saving) return
    if (!pending.current) {
      const numbers = Object.fromEntries(Object.entries(values).map(([field, value]) => [field, value.trim() ? Number(value) : Number.NaN])) as Record<keyof typeof values, number>
      if (Object.values(numbers).some((value) => !Number.isInteger(value) || value < 0) || numbers.hunger > 5 || numbers.humanity > 10 || numbers.stains > 10 || numbers.healthSuperficial + numbers.healthAggravated > data.maxima.healthMax || numbers.willpowerSuperficial + numbers.willpowerAggravated > data.maxima.willpowerMax) {
        notify('Use números inteiros nos limites indicados. A soma dos danos não pode ultrapassar o máximo da trilha.')
        return
      }
      if (!reason.trim() || reason.length > 500) { notify('Informe um motivo com até 500 caracteres.'); return }
      const changes: Changes = {}
      if (numbers.hunger !== data.state.hunger) changes.hunger = numbers.hunger
      const healthDamage = { superficial: numbers.healthSuperficial, aggravated: numbers.healthAggravated }
      const willpowerDamage = { superficial: numbers.willpowerSuperficial, aggravated: numbers.willpowerAggravated }
      if (healthDamage.superficial !== data.state.healthDamage.superficial || healthDamage.aggravated !== data.state.healthDamage.aggravated) changes.healthDamage = healthDamage
      if (willpowerDamage.superficial !== data.state.willpowerDamage.superficial || willpowerDamage.aggravated !== data.state.willpowerDamage.aggravated) changes.willpowerDamage = willpowerDamage
      if (data.canEditNarrative && numbers.humanity !== data.state.humanity) changes.humanity = numbers.humanity
      if (data.canEditNarrative && numbers.stains !== data.state.stains) changes.stains = numbers.stains
      if (!Object.keys(changes).length) { notify('Nenhum recurso foi alterado.'); return }
      pending.current = { changes, reason: reason.trim(), expectedRevision: data.revision, idempotencyKey: crypto.randomUUID() }
    }
    setSaving(true)
    try {
      const response = await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pending.current) })
      const body = await response.json().catch(() => null)
      if (response.status === 409) {
        pending.current = null
        setRetrying(false)
        notify('Os recursos foram alterados em outra operação. Recarregando o estado para revisar sua alteração.')
        await refresh()
        return
      }
      if (!response.ok) {
        if (response.status >= 500) {
          setRetrying(true)
          notify('Falha ao confirmar a alteração. Reenviar usa a mesma operação para evitar duplicidade.')
          return
        }
        pending.current = null
        setRetrying(false)
        notify(body?.error ?? 'Não foi possível salvar os recursos.')
        return
      }
      pending.current = null
      setRetrying(false)
      notify('Recursos salvos.')
      await refresh()
    } catch {
      setRetrying(!!pending.current)
      notify(pending.current ? 'Falha de conexão. Reenviar repete a mesma operação, sem aplicar a alteração duas vezes.' : 'Recursos salvos, mas não foi possível atualizar a leitura. Recarregue os recursos.')
    } finally {
      setSaving(false)
    }
  }

  function field(name: keyof typeof values, label: string, maximum: number, narrative = false) {
    return <label className="flex flex-col gap-2 text-sm"><span>{label}</span><input className="input" type="number" step={1} min={0} max={maximum} value={values[name]} readOnly={narrative && !data.canEditNarrative} aria-readonly={narrative && !data.canEditNarrative} disabled={saving || retrying} onChange={(event) => setValues((current) => ({ ...current, [name]: event.target.value }))} /></label>
  }

  return <form onSubmit={save} className="flex flex-col gap-5">
    <div className="grid gap-4 sm:grid-cols-3">
      {field('hunger', 'Fome (0–5)', 5)}
      {field('humanity', 'Humanidade (0–10)', 10, true)}
      {field('stains', 'Manchas (0–10)', 10, true)}
    </div>
    {!data.canEditNarrative && <p className="text-xs text-muted-foreground">Humanidade e manchas são controladas pelo Narrador.</p>}
    <div className="grid gap-5 md:grid-cols-2">
      <fieldset className="border border-border p-4"><legend className="px-2 font-serif text-lg">Vitalidade</legend><p className="mb-4 text-sm text-muted-foreground">Atual: {data.state.healthCurrent} / Máxima: {data.maxima.healthMax}</p><div className="grid gap-4 sm:grid-cols-2">{field('healthSuperficial', 'Dano superficial de Vitalidade', data.maxima.healthMax)}{field('healthAggravated', 'Dano agravado de Vitalidade', data.maxima.healthMax)}</div></fieldset>
      <fieldset className="border border-border p-4"><legend className="px-2 font-serif text-lg">Força de vontade</legend><p className="mb-4 text-sm text-muted-foreground">Atual: {data.state.willpowerCurrent} / Máxima: {data.maxima.willpowerMax}</p><div className="grid gap-4 sm:grid-cols-2">{field('willpowerSuperficial', 'Dano superficial de Vontade', data.maxima.willpowerMax)}{field('willpowerAggravated', 'Dano agravado de Vontade', data.maxima.willpowerMax)}</div></fieldset>
    </div>
    <p className="text-sm text-muted-foreground">Condição: {({ ACTIVE: 'Ativo', DAY_SLEEP: 'Sono diurno', STAKED: 'Empalado', TORPOR: 'Torpor', FINAL_DEATH: 'Morte definitiva' } as Record<string, string>)[data.state.condition] ?? 'Condição não reconhecida'}</p>
    <label className="flex flex-col gap-2 text-sm"><span>Motivo da alteração</span><input className="input" value={reason} maxLength={500} required disabled={saving || retrying} onChange={(event) => setReason(event.target.value)} /></label>
    <button type="submit" className="button-primary self-start" disabled={saving}>{saving ? 'Salvando…' : retrying ? 'Reenviar alteração' : 'Salvar recursos'}</button>
  </form>
}

export function SessionResources({ characterId }: { characterId: string }) {
  const url = `/api/characters/${characterId}/resources`
  const { data, error, isLoading, mutate } = useSWR<ResourceResponse>(url, fetchResources, { revalidateOnFocus: false })
  const [feedback, setFeedback] = useState('')
  return <section className="border border-border bg-card p-5 sm:p-6" aria-labelledby="recursos-sessao-titulo">
    <p className="eyebrow">Estado da sessão</p>
    <h2 id="recursos-sessao-titulo" className="mb-5 mt-2 font-serif text-xl">Recursos</h2>
    {feedback && <p role="status" className="mb-4 text-sm text-muted-foreground">{feedback}</p>}
    {isLoading && <p role="status" className="text-sm text-muted-foreground">Carregando recursos…</p>}
    {error && <div role="alert" className="mb-4 flex flex-col gap-3"><p className="text-sm text-primary">{error instanceof Error ? error.message : 'Falha ao carregar recursos.'}</p><button type="button" className="button-ghost self-start" onClick={() => void mutate()}>Recarregar recursos</button></div>}
    {data && !error && <ResourceForm key={`${characterId}:${data.revision}`} data={data} url={url} refresh={() => mutate()} notify={setFeedback} />}
  </section>
}
