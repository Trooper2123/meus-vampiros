'use client'

import { useRef, useState } from 'react'
import { useSWRConfig } from 'swr'
import { CLAN_CONDITION_LABELS, type ClanCondition } from '@/lib/vtm-v5/clan-mechanics'

type Pending = { active: ClanCondition[]; expectedRevision: number; key: string }
export function ClanConditions({ characterId, active, options, revision, canManage }: Readonly<{ characterId: string; active: ClanCondition[]; options: ClanCondition[]; revision: number; canManage: boolean }>) {
  const { mutate } = useSWRConfig()
  const pending = useRef<Pending | null>(null)
  const inFlight = useRef(false)
  const [busy, setBusy] = useState(false)
  const [retry, setRetry] = useState(false)
  const [message, setMessage] = useState('')

  async function send(next?: ClanCondition[]) {
    if (inFlight.current) return
    if (!pending.current && next) pending.current = { active: next, expectedRevision: revision, key: crypto.randomUUID() }
    if (!pending.current) return
    inFlight.current = true; setBusy(true); setMessage('')
    try {
      const response = await fetch(`/api/characters/${characterId}/clan`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pending.current) })
      const result = await response.json()
      if (!response.ok) {
        if (response.status < 500) { pending.current = null; setRetry(false) }
        if (response.status === 409) await mutate(`/api/characters/${characterId}/clan`)
        throw new Error(result.error ?? 'Não foi possível atualizar as condições.')
      }
      if (result.ok !== true) throw new Error('Operação não confirmada. Reenvie a mesma solicitação.')
      pending.current = null; setRetry(false)
      await Promise.all([mutate(`/api/characters/${characterId}/clan`), mutate(`/api/characters/${characterId}/rolls`)])
      setMessage('Condições confirmadas. As próximas rolagens usarão as regras do clã.')
    } catch (error) {
      setRetry(Boolean(pending.current)); setMessage(error instanceof Error ? error.message : 'Falha de conexão. Reenvie a mesma operação.')
    } finally { inFlight.current = false; setBusy(false) }
  }

  if (!options.length) return null
  return <div className="mt-5 border-t border-border pt-4" aria-busy={busy}>
    <h4 className="font-serif text-lg">Condições do clã</h4>
    <p className="mt-2 text-sm text-muted-foreground">O Narrador confirma os gatilhos e remove as condições ao terminar seu efeito. Só marque detecção eletrônica para as rolagens dessa tentativa. Danos de alimentação, sol e repouso são conduzidos pelo Narrador nos recursos da ficha.</p>
    {canManage ? <fieldset className="mt-3 flex flex-col gap-3" disabled={busy || retry}><legend className="mb-2 text-sm">Condições confirmadas pelo Narrador</legend>{options.map(condition => <label key={condition} className="flex items-start gap-2 text-sm"><input type="checkbox" checked={active.includes(condition)} onChange={() => void send(active.includes(condition) ? active.filter(value => value !== condition) : [...active, condition])} />{CLAN_CONDITION_LABELS[condition]}</label>)}</fieldset> : <p className="mt-3 text-sm">{active.length ? active.map(condition => CLAN_CONDITION_LABELS[condition]).join(' · ') : 'Nenhuma condição confirmada pelo Narrador.'}</p>}
    {message && <output className="mt-3 block text-sm" aria-live="polite">{message}</output>}
    {retry && <button type="button" className="button-ghost mt-3" disabled={busy} onClick={() => void send()}>Reenviar as mesmas condições</button>}
  </div>
}
