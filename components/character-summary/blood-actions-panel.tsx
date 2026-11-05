'use client'

import { useState } from 'react'

type Source = 'SMALL_ANIMALS'|'MEDIUM_ANIMAL'|'LARGE_ANIMAL'|'UNPROCESSED_BAG'|'PROCESSED_BAG'|'HUMAN_SIP'|'HUMAN_SAFE'|'HUMAN_HARMFUL'|'HUMAN_KILLED'
const sources: { value: Source; label: string }[] = [
  { value: 'SMALL_ANIMALS', label: 'Vários animais pequenos (1 Fome base)' },
  { value: 'MEDIUM_ANIMAL', label: 'Animal médio (1)' },
  { value: 'LARGE_ANIMAL', label: 'Animal grande (2)' },
  { value: 'UNPROCESSED_BAG', label: 'Bolsa de sangue integral (1)' },
  { value: 'PROCESSED_BAG', label: 'Bolsa processada (exige Estômago de Ferro)' },
  { value: 'HUMAN_SIP', label: 'Pequeno gole humano (1)' },
  { value: 'HUMAN_SAFE', label: 'Alimentação humana não prejudicial (até 2)' },
  { value: 'HUMAN_HARMFUL', label: 'Alimentação prejudicial (1 a 4)' },
  { value: 'HUMAN_KILLED', label: 'Drenar e matar humano (Narrador)' },
]
export function BloodActionsPanel({ characterId, revision, onComplete }: Readonly<{ characterId: string; revision: number; onComplete: () => Promise<unknown> }>) {
  const [source, setSource] = useState<Source>('HUMAN_SIP')
  const [servings, setServings] = useState(1)
  const [nightId, setNightId] = useState('')
  const [ventrueConfirmed, setVentrueConfirmed] = useState(false)
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')
  const [retryCommand, setRetryCommand] = useState<{action: unknown; expectedRevision: number; idempotencyKey: string} | null>(null)

  async function execute(action?: unknown) {
    if (pending) return
    const command = retryCommand ?? { action, expectedRevision: revision, idempotencyKey: crypto.randomUUID() }
    if (!command.action) return
    setPending(true); setMessage('')
    try {
      const response = await fetch(`/api/characters/${characterId}/blood-actions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(command),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok) {
        if (response.status >= 500) {
          setRetryCommand(command)
          setMessage('Resposta não confirmada. Tente novamente com a mesma operação.')
        } else {
          setRetryCommand(null)
          setMessage(result?.error ?? 'Ação rejeitada.')
        }
        return
      }
      setRetryCommand(null)
      setMessage(`Ação registrada. Fome reduzida: ${result.hungerSlaked}; dano curado: ${result.healed}. ${(result.narrativeFlags ?? []).join(' ')}`)
      await onComplete()
    } catch {
      setRetryCommand(command)
      setMessage('Falha de conexão. Reenviar preservará a chave de idempotência.')
    } finally { setPending(false) }
  }
  let maxServings = 5
  if (source === 'HUMAN_HARMFUL') maxServings = 4
  else if (['HUMAN_SAFE','HUMAN_SIP','HUMAN_KILLED'].includes(source)) maxServings = 1
  return <section className="mt-6 border-t border-border pt-5" aria-label="Ações automáticas V5">
    <h3 className="font-serif text-xl">Alimentação e regeneração V5</h3>
    <p className="mt-2 text-sm text-muted-foreground">Estas ações aplicam regras do sangue e registram os dados no servidor. Os controles manuais de recursos acima permanecem disponíveis.</p>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <label className="sheet-field"><span>Fonte de alimentação</span>
        <select className="select" value={source} disabled={pending || !!retryCommand} onChange={e => { setSource(e.target.value as Source); setServings(1) }}>{sources.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
      </label>
      <label className="sheet-field"><span>Porções / pontos drenados</span>
        <input className="input" type="number" min={1} max={maxServings} value={servings} disabled={pending || !!retryCommand} onChange={e => setServings(Number(e.target.value))}/>
      </label>
    </div>
    <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={ventrueConfirmed} disabled={pending || !!retryCommand} onChange={e => setVentrueConfirmed(e.target.checked)}/> Alimentação compatível com a preferência Ventrue (confirmação do Narrador)</label>
    <div className="mt-4 flex flex-wrap gap-2">
      <button type="button" className="button-primary" disabled={pending || !!retryCommand} onClick={() => execute({ kind: 'FEED', source, servings, ...(source === 'HUMAN_HARMFUL' ? {victimHarmed: true} : {}), ...(ventrueConfirmed ? {ventruePreferenceMatched: true} : {}) })}>Registrar alimentação</button>
      <button type="button" className="button-ghost" disabled={pending || !!retryCommand} onClick={() => execute({ kind: 'MEND_SUPERFICIAL' })}>Regenerar dano superficial (1 Rouse)</button>
    </div>
    <div className="mt-4 flex flex-wrap items-end gap-2">
      <label className="sheet-field flex-1"><span>ID da noite da crônica (regeneração agravada)</span><input className="input" value={nightId} disabled={pending || !!retryCommand} onChange={e => setNightId(e.target.value)} placeholder="UUID da noite validada"/></label>
      <button type="button" className="button-ghost" disabled={pending || !!retryCommand || !nightId.trim()} onClick={() => execute({ kind: 'MEND_AGGRAVATED', nightId: nightId.trim() })}>Curar 1 agravado (3 Rouse)</button>
    </div>
    {retryCommand && <button type="button" className="button-ghost mt-3" disabled={pending} onClick={() => execute()}>Reenviar operação</button>}
    {message && <output className="mt-3 block text-sm" aria-live="polite">{message}</output>}
  </section>
}
