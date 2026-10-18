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

function ResourceButtons({ label, onReduce, onIncrease, disabled, cannotReduce, cannotIncrease }: Readonly<{ label: string; onReduce?: () => void; onIncrease: () => void; disabled: boolean; cannotReduce?: boolean; cannotIncrease: boolean }>) {
  return <div className="flex shrink-0 items-center gap-2">
    {onReduce && <button type="button" className="button-ghost min-w-10 px-3" aria-label={`Reduzir ${label}`} disabled={disabled || cannotReduce} onClick={onReduce}>−</button>}
    <button type="button" className="button-ghost min-w-10 px-3" aria-label={`Aumentar ${label}`} disabled={disabled || cannotIncrease} onClick={onIncrease}>+</button>
  </div>
}

function ResourceForm({ data, url, refresh, notify }: Readonly<{ data: ResourceResponse; url: string; refresh: (updated: ResourceResponse) => Promise<unknown>; notify: (message: string, error?: boolean) => void }>) {
  const [saving, setSaving] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const pending = useRef<ResourceCommand | null>(null)
  const inFlight = useRef(false)
  const zeroDialog = useRef<HTMLDialogElement>(null)
  const locked = saving || retrying

  async function save(changes?: Changes, reason?: string) {
    if (inFlight.current || zeroDialog.current?.open) return
    if (!pending.current) {
      if (!changes || !reason) return
      pending.current = { changes, reason, expectedRevision: data.revision, idempotencyKey: crypto.randomUUID() }
    }
    inFlight.current = true
    setSaving(true)
    notify('')
    try {
      const response = await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pending.current) })
      const body = await response.json().catch(() => null)
      if (response.status === 409) {
        pending.current = null
        setRetrying(false)
        notify('Os recursos foram alterados em outra operação. Recarregue os recursos para continuar.', true)
        return
      }
      if (!response.ok) {
        if (response.status >= 500) {
          setRetrying(true)
          notify('Falha ao confirmar a alteração. Reenviar usa a mesma operação para evitar duplicidade.', true)
          return
        }
        pending.current = null
        setRetrying(false)
        notify(body?.error ?? 'Não foi possível salvar os recursos.', true)
        return
      }
      if (body?.ok !== true || !body.state || !body.maxima || !Number.isSafeInteger(body.revision)) {
        setRetrying(true)
        notify('A resposta não confirmou o salvamento. Reenvie a mesma operação para conferir o resultado.', true)
        return
      }
      pending.current = null
      setRetrying(false)
      await refresh({ ...data, state: body.state, maxima: body.maxima, revision: body.revision })
      notify('Alteração salva e registrada no histórico.')
    } catch {
      setRetrying(!!pending.current)
      notify(pending.current ? 'Falha de conexão. Reenviar repete a mesma operação, sem aplicar a alteração duas vezes.' : 'Alteração salva, mas não foi possível atualizar a leitura. Recarregue os recursos.', true)
    } finally {
      inFlight.current = false
      setSaving(false)
    }
  }

  function changeScalar(field: 'hunger' | 'humanity' | 'stains', delta: number) {
    if (locked || inFlight.current || (field !== 'hunger' && !data.canEditNarrative)) return
    const value = data.state[field] + delta
    if (!Number.isSafeInteger(value) || value < 0 || value > (field === 'hunger' ? 5 : 10)) return
    if (field === 'hunger' && value === 0) { zeroDialog.current?.showModal(); return }
    const label = { hunger: 'Fome', humanity: 'Humanidade', stains: 'Manchas' }[field]
    return save({ [field]: value }, `Ajuste de ${label}: ${data.state[field]} → ${value}.`)
  }

  function changeDamage(track: 'health' | 'willpower', type: keyof Damage, delta: number) {
    if (locked || inFlight.current) return
    const field = track === 'health' ? 'healthDamage' : 'willpowerDamage'
    const current = data.state[field]
    const maximum = track === 'health' ? data.maxima.healthMax : data.maxima.willpowerMax
    if (!Object.values(current).every(value => Number.isSafeInteger(value) && value >= 0) || current[type] + delta < 0 || current.superficial + current.aggravated + delta > maximum) return
    const label = `${type === 'superficial' ? 'superficial' : 'agravado'} de ${track === 'health' ? 'Vitalidade' : 'Força de vontade'}`
    return save({ [field]: { ...current, [type]: current[type] + delta } }, `Ajuste de dano ${label}: ${current[type]} → ${current[type] + delta}.`)
  }

  function damageResource(track: 'health' | 'willpower', label: string, maximum: number) {
    const current = data.state[track === 'health' ? 'healthDamage' : 'willpowerDamage']
    const total = current.superficial + current.aggravated
    return <div><dt>{label}</dt><dd>
      <span className="block font-serif text-4xl" aria-label={`${label} atual`}>{Math.max(0, maximum - total)} / {maximum}</span>
      <div className="mt-4 flex flex-col gap-3">{(['superficial', 'aggravated'] as const).map(type => <fieldset key={type} aria-label={`Dano ${type === 'superficial' ? 'superficial' : 'agravado'} de ${label}`} className="flex flex-wrap items-center justify-center gap-2">
        <span className="font-sans text-xs text-muted-foreground">{type === 'superficial' ? 'Superficial' : 'Agravado'} <span className="font-mono text-sm text-foreground">{current[type]}</span></span>
        <ResourceButtons label={`dano ${type === 'superficial' ? 'superficial' : 'agravado'} de ${label}`} onReduce={() => changeDamage(track, type, -1)} onIncrease={() => changeDamage(track, type, 1)} disabled={locked} cannotReduce={current[type] <= 0} cannotIncrease={total >= maximum} />
      </fieldset>)}</div>
    </dd></div>
  }

  let savingMessage
  if (saving) {
    savingMessage = 'Salvando alteração…'
  } else if (retrying) {
    savingMessage = 'Salvamento não confirmado. Reenvie ou recarregue os recursos.'
  } else {
    savingMessage = 'Cada alteração é salva automaticamente. Contadores mostram os valores confirmados.'
  }
  return <div aria-busy={saving} className="flex flex-col gap-5">
    <output className="block text-sm text-muted-foreground">{savingMessage}</output>
    <dl className="archive-resource-strip archive-session-resources">
      <div><dt>Humanidade</dt><dd><span className="block font-serif text-4xl">{data.state.humanity}</span><div className="mt-4"><ResourceButtons label="Humanidade" onReduce={() => changeScalar('humanity', -1)} cannotReduce={data.state.humanity <= 0} onIncrease={() => changeScalar('humanity', 1)} disabled={locked || !data.canEditNarrative} cannotIncrease={data.state.humanity >= 10} /></div></dd></div>
      {damageResource('willpower', 'Força de vontade', data.maxima.willpowerMax)}
      {damageResource('health', 'Vitalidade', data.maxima.healthMax)}
      <div><dt>Fome</dt><dd><span className="archive-hunger" aria-label={`${data.state.hunger} de 5`}>{Array.from({ length: 5 }, (_, index) => <span key={index} aria-hidden="true" className={`dot ${index < data.state.hunger ? 'is-filled' : ''}`} />)}</span><span className="mt-2 block font-sans text-xs text-muted-foreground">{data.state.hunger} de 5</span><div className="mt-4"><ResourceButtons label="Fome" onReduce={() => changeScalar('hunger', -1)} onIncrease={() => changeScalar('hunger', 1)} disabled={locked} cannotReduce={data.state.hunger <= 0} cannotIncrease={data.state.hunger >= 5} /></div><p className="mt-2 font-sans text-xs text-muted-foreground">Sem custo de XP.</p></dd></div>
      <div><dt>Manchas</dt><dd><span className="block font-serif text-4xl">{data.state.stains} <span className="font-sans text-xs text-muted-foreground">de 10</span></span><div className="mt-4"><ResourceButtons label="Manchas" onReduce={() => changeScalar('stains', -1)} onIncrease={() => changeScalar('stains', 1)} disabled={locked || !data.canEditNarrative} cannotReduce={data.state.stains <= 0} cannotIncrease={data.state.stains >= 10} /></div></dd></div>
    </dl>

    <p className="text-sm text-muted-foreground">Condição: {({ ACTIVE: 'Ativo', DAY_SLEEP: 'Sono diurno', STAKED: 'Empalado', TORPOR: 'Torpor', FINAL_DEATH: 'Morte definitiva' } as Record<string, string>)[data.state.condition] ?? 'Condição não reconhecida'}</p>
    {retrying && <button type="button" className="button-primary self-start" disabled={saving} onClick={() => save()}>Reenviar alteração</button>}
    <dialog ref={zeroDialog} aria-labelledby="hunger-zero-title" aria-describedby="hunger-zero-description" className="m-auto w-[min(32rem,95vw)] border border-border bg-card p-6 text-foreground backdrop:bg-background/80">
      <h3 id="hunger-zero-title" className="font-serif text-2xl">Atenção: ação tabu</h3>
      <p id="hunger-zero-description" className="mt-4 text-sm leading-6">Zerar a Fome indica uma ação tabu nesta crônica e pode trazer consequências narrativas, avaliadas pelo Narrador. Deseja continuar?</p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row"><button type="button" autoFocus className="button-ghost" onClick={() => zeroDialog.current?.close()}>Cancelar</button><button type="button" className="button-primary" onClick={() => { zeroDialog.current?.close(); if (!locked && data.state.hunger === 1) return save({ hunger: 0 }, 'Ação tabu confirmada: Fome 1 → 0.') }}>Confirmar redução para 0</button></div>
    </dialog>
  </div>
}

export function SessionResources({ characterId }: Readonly<{ characterId: string }>) {
  const url = `/api/characters/${characterId}/resources`
  const { data, error, isLoading, mutate } = useSWR<ResourceResponse>(url, fetchResources, { revalidateOnFocus: false })
  const [feedback, setFeedback] = useState({ message: '', error: false })
  return <section className="border border-border bg-card p-5 sm:p-6" aria-labelledby="recursos-sessao-titulo">
    <p className="eyebrow">Estado da sessão</p>
    <h2 id="recursos-sessao-titulo" className="mb-5 mt-2 font-serif text-xl">Recursos</h2>
    {feedback.message && <div className="mb-4 flex flex-col items-start gap-3"><p role={feedback.error ? 'alert' : 'status'} className="text-sm text-muted-foreground">{feedback.message}</p>{feedback.error && <button type="button" className="button-ghost" onClick={() => void mutate()}>Recarregar recursos</button>}</div>}
    {isLoading && <output className="block text-sm text-muted-foreground">Carregando recursos…</output>}
    {error && <div role="alert" className="mb-4 flex flex-col gap-3"><p className="text-sm text-primary">{error instanceof Error ? error.message : 'Falha ao carregar recursos.'}</p><button type="button" className="button-ghost self-start" onClick={() => void mutate()}>Recarregar recursos</button></div>}
    {data && !error && <ResourceForm key={`${characterId}:${data.revision}`} data={data} url={url} refresh={updated => mutate(updated, { revalidate: false })} notify={(message, error = false) => setFeedback({ message, error })} />}
  </section>
}
