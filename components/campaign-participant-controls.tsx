'use client'

import { useRef, useState } from 'react'
import useSWR from 'swr'
import { useRouter } from 'next/navigation'

const statuses: Record<string, string> = { DRAFT: 'Rascunho', PENDING_REVIEW: 'Aguardando aprovação', APPROVED: 'Aprovada', ARCHIVED: 'Arquivada', DISABLED: 'Desabilitada' }
const conditions: Record<string, string> = { ACTIVE: 'Ativo', DAY_SLEEP: 'Sono diurno', STAKED: 'Empalado', TORPOR: 'Torpor', FINAL_DEATH: 'Morte definitiva' }
async function read(url: string) {
  const response = await fetch(url, { cache: 'no-store' })
  const body = await response.json()
  if (!response.ok) throw new Error(body.error ?? 'Não foi possível consultar a ficha.')
  return body
}

export function CampaignParticipantControls({ characterId }: Readonly<{ characterId: string }>) {
  const router = useRouter()
  const { data: sheet, error: sheetError, mutate: reloadSheet } = useSWR<{ character: { status: string; revision: number } }>(`/api/characters?id=${characterId}`, read, { refreshInterval: 15000 })
  const { data: resources, error: resourceError, mutate: reloadResources } = useSWR<{ state: { condition: string }; revision: number }>(`/api/characters/${characterId}/resources`, read, { refreshInterval: 15000 })
  const [reason, setReason] = useState('')
  const [cause, setCause] = useState('VOLUNTARY')
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState('')
  const sending = useRef(false)
  const [retry, setRetry] = useState<{ endpoint: string; body: Record<string, unknown> } | null>(null)

  async function send(action: 'APPROVED' | 'DRAFT' | 'ARCHIVED' | 'ACTIVE' | 'STAKED' | 'TORPOR') {
    if (sending.current || !sheet || !resources) return
    const approval = ['APPROVED', 'DRAFT', 'ARCHIVED'].includes(action)
    let operation = retry
    if (!operation) {
      if (action === 'ARCHIVED' && !window.confirm('Rejeitar e arquivar esta ficha? O histórico será preservado.')) return
      if (!approval && !reason.trim()) { setFeedback('Informe o motivo da alteração.'); return }
      operation = { endpoint: `/api/characters/${characterId}/${approval ? 'status' : 'condition'}`, body: { ...(approval ? { status: action } : { condition: action, reason: reason.trim(), ...(action === 'TORPOR' ? { cause } : {}) }), expectedRevision: approval ? sheet.character.revision : resources.revision, idempotencyKey: crypto.randomUUID() } }
      setRetry(operation)
    }
    sending.current = true
    setBusy(true)
    try {
      const response = await fetch(operation.endpoint, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(operation.body) })
      const body = await response.json().catch(() => null)
      if (!response.ok) {
        if (response.status < 500) setRetry(null)
        setFeedback(body?.error ?? 'Falha ao confirmar. Reenvie a mesma operação.')
      } else {
        if (!Number.isSafeInteger(body?.revision)) throw new Error('Resposta inválida.')
        setRetry(null)
        setReason('')
        setFeedback('Alteração registrada.')
        if (approval) router.refresh()
      }
      await Promise.allSettled([reloadSheet(), reloadResources()])
    } catch { setFeedback('Falha de conexão. Reenvie para confirmar a mesma operação.') }
    finally { sending.current = false; setBusy(false) }
  }

  if (sheetError || resourceError) return <p role="alert" className="text-sm text-primary">Não foi possível consultar o estado da ficha. Recarregue a página.</p>
  if (!sheet || !resources) return <p role="status" className="text-sm text-muted-foreground">Consultando estado da ficha…</p>
  const condition = resources.state.condition
  return <div className="flex flex-col gap-3 border border-border p-4">
    <p className="text-sm">Ficha: {statuses[sheet.character.status] ?? 'Indisponível'} · Condição: {conditions[condition] ?? 'Indisponível'}</p>
    {feedback && <p role="status" className="text-sm text-muted-foreground">{feedback}</p>}
    {retry ? <button type="button" className="button-primary self-start" disabled={busy} onClick={() => send('APPROVED')}>Reenviar operação</button> : <>
      {sheet.character.status === 'PENDING_REVIEW' && <div className="flex flex-wrap gap-3"><button type="button" className="button-primary self-start" disabled={busy} onClick={() => send('APPROVED')}>Aprovar ficha</button><button type="button" className="button-ghost" disabled={busy} onClick={() => send('DRAFT')}>Solicitar correções</button><button type="button" className="action-delete" disabled={busy} onClick={() => send('ARCHIVED')}>Rejeitar ficha</button></div>}
      {condition !== 'FINAL_DEATH' && <>
        <label className="sheet-field"><span>Motivo da alteração de condição</span><input maxLength={500} value={reason} disabled={busy} onChange={event => setReason(event.target.value)} /></label>
        {['ACTIVE', 'DAY_SLEEP'].includes(condition) && <label className="sheet-field"><span>Causa do torpor</span><select className="select" value={cause} disabled={busy} onChange={event => setCause(event.target.value)}><option value="VOLUNTARY">Voluntário</option><option value="HUNGER">Fome</option><option value="DAMAGE">Dano</option></select></label>}
        <div className="flex flex-wrap gap-3">{['STAKED', 'TORPOR'].includes(condition) ? <button type="button" className="button-ghost" disabled={busy || !reason.trim()} onClick={() => send('ACTIVE')}>{condition === 'STAKED' ? 'Remover empalamento' : 'Encerrar torpor'}</button> : <><button type="button" className="button-ghost" disabled={busy || !reason.trim()} onClick={() => send('STAKED')}>Marcar Empalado</button><button type="button" className="button-ghost" disabled={busy || !reason.trim()} onClick={() => send('TORPOR')}>Registrar Torpor</button></>}</div>
        <p className="text-xs text-muted-foreground">Decisão narrativa do Narrador. Não altera Fome, dano ou Humanidade.</p>
      </>}
    </>}
  </div>
}
