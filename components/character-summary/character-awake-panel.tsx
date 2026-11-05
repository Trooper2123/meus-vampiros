'use client'
import { useRef, useState } from 'react'
import useSWR, { useSWRConfig } from 'swr'

type AwakeView = { context: 'EXTERNAL_TABLE' | 'CAMPAIGN' | 'UNLINKED'; night: { id: string; number?: number; night_number?: number; execution_mode?: string; inGameDate?: string | null } | null; completed?: { outcome: string; roll: number | null } | null; last?: { nightId: string; outcome: string; roll: number | null } | null; revision: number; hunger: number; condition: string; eligible: boolean }
type Intent = { action: 'AWAKE' | 'START_NIGHT' | 'DECLARE_EXTERNAL'; expectedRevision: number; idempotencyKey: string; nightId?: string; inGameDate?: string; sessionId?: string }
async function read(url: string): Promise<AwakeView> { const response = await fetch(url,{cache:'no-store'}); const data = await response.json(); if (!response.ok) throw new Error(data.error ?? 'Falha ao consultar o despertar.'); return data }
export function CharacterAwakePanel({ characterId, sessionId }: Readonly<{ characterId: string; sessionId?: string }>) {
  const url = `/api/characters/${characterId}/awake`
  const {data,error,mutate} = useSWR<AwakeView>(url,read)
  const {mutate: refresh} = useSWRConfig()
  const [date,setDate] = useState('')
  const [busy,setBusy] = useState(false)
  const [feedback,setFeedback] = useState('')
  const [pendingIntent,setPendingIntent] = useState<Intent|null>(null)
  const pending = useRef<Intent|null>(null)
  async function command(action: Intent['action']) {
    if (!data || busy) return
    if (!pending.current) {
      pending.current = {action,expectedRevision:data.revision,idempotencyKey:crypto.randomUUID(),...(action==='AWAKE' ? {nightId:data.night?.id,...(sessionId ? {sessionId}:{})} : (action==='START_NIGHT'&&date ? {inGameDate:date}:{}))}
      setPendingIntent(pending.current)
    }
    setBusy(true); setFeedback('')
    try {
      const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(pending.current)})
      const result=await response.json().catch(()=>null)
      if(!response.ok) {
        if(response.status<500) {pending.current=null;setPendingIntent(null);if(response.status===409) await mutate()}
        throw new Error(result?.error ?? 'Falha ao processar a operação.')
      }
      pending.current=null
      setPendingIntent(null)
      setFeedback(action==='DECLARE_EXTERNAL' ? 'Ficha identificada como pertencente a uma mesa fora do aplicativo.' : action==='START_NIGHT' ? 'Nova noite ficcional registrada.' : `Despertar: ${result.outcome}. D10: ${result.roll ?? 'não rolado'}. Fome: ${result.after?.hunger ?? '—'}.`)
      await Promise.allSettled([mutate(),refresh(`/api/characters/${characterId}/resources`)])
    }catch(e){setPendingIntent(pending.current);setFeedback(e instanceof Error ? e.message:'Falha de conexão; reenviar preserva a operação.')}finally{setBusy(false)}
  }
  const current = data?.night
  const completed = data?.context==='CAMPAIGN' ? Boolean(data.completed) : data?.last?.nightId === current?.id
  const canRoll = data?.eligible && current && !completed && (data.context==='EXTERNAL_TABLE' || current.execution_mode==='PLAYER_ROLLS' && Boolean(sessionId))
  return <section className="border border-border bg-card p-4 sm:p-5" aria-label="Despertar V5">
    <p className="eyebrow">Awake · Rouse Check</p><h3 className="mt-2 font-serif text-xl">Despertar noturno</h3>
    {error && <p role="alert">{error.message}</p>}
    {!data && !error && <p>Carregando despertar…</p>}
    {data && <div className="mt-3 flex flex-col gap-3 text-sm">
      <p>{data.context==='UNLINKED' ? 'Ficha sem mesa vinculada. Indique se joga em uma mesa fora do aplicativo.' : data.context==='EXTERNAL_TABLE' ? 'Mesa fora do aplicativo · controle do jogador' : data.night?.execution_mode==='NARRATOR_FORCES' ? 'O Narrador executa os despertares desta mesa.' : 'O jogador realiza seu despertar na sessão ativa.'}</p>
      <p>Fome: {data.hunger}/5 · Condição: {data.condition}{data.hunger===5 ? ' · Risco de torpor se falhar' : ''}</p>
      {data.context==='UNLINKED' && <button className="button-ghost self-start" disabled={busy} type="button" onClick={()=>void command('DECLARE_EXTERNAL')}>Indicar mesa fora do aplicativo</button>}
      {data.context==='EXTERNAL_TABLE' && <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">Data ficcional (opcional)<input className="input" type="date" value={date} onChange={e=>setDate(e.target.value)} disabled={busy || Boolean(pendingIntent)}/></label>
        <button className="button-ghost" type="button" disabled={busy} onClick={()=>void command('START_NIGHT')}>{busy?'Processando…':'Iniciar próxima noite'}</button>
      </div>}
      {current && <p>Noite {current.number ?? current.night_number ?? 'atual'}{current.inGameDate ? ` · ${current.inGameDate}`:''} · {completed ? 'Despertar já registrado' : 'Aguardando despertar'}</p>}
      {canRoll && <button className="button-primary self-start" type="button" disabled={busy} onClick={()=>void command('AWAKE')}>{busy?'Rolando…':'Realizar despertar (1d10)'}</button>}
      {!data.eligible && <p>Esta ficha ou condição não permite o despertar normal.</p>}
      {feedback && <output role="status" aria-live="polite">{feedback}</output>}
      {pendingIntent && !busy && <button className="button-ghost self-start" type="button" onClick={()=>void command(pendingIntent.action)}>Reenviar mesma operação</button>}
    </div>}
  </section>
}
