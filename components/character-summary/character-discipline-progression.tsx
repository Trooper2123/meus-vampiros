'use client'

import { useRef, useState } from 'react'
import useSWR from 'swr'
import type { disciplineView } from '@/lib/character-disciplines'

type View = ReturnType<typeof disciplineView>
type Command = { kind: 'PURCHASE' | 'AUTHORIZE' | 'REVOKE'; disciplineId: string; targetLevel: number; reason: string; expectedRevision: number; idempotencyKey: string; acquisitionSource?: 'CLAN' | 'XP'; requirement?: 'CLAN_ASSOCIATION' | 'LEARNING_APPROVAL'; grantId?: string }
async function load(url: string): Promise<View> {
  const response = await fetch(url)
  const body = await response.json()
  if (!response.ok) throw new Error(body.error ?? 'Não foi possível carregar a evolução.')
  return body
}
export function CharacterDisciplineProgression({ characterId }: Readonly<{ characterId: string }>) {
  const url = `/api/characters/${characterId}/disciplines`
  const { data, error, mutate } = useSWR<View>(url, load)
  const [selected, setSelected] = useState('')
  const [reason, setReason] = useState('')
  const [requirement, setRequirement] = useState<'LEARNING_APPROVAL' | 'CLAN_ASSOCIATION'>('LEARNING_APPROVAL')
  const [grantLevel, setGrantLevel] = useState(1)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [retry, setRetry] = useState<Command | null>(null)
  const inFlight = useRef(false)
  const discipline = data?.disciplines.find(entry => entry.id === selected) ?? data?.disciplines[0]
  const locked = busy || Boolean(retry)
  async function execute(command: Command) {
    if (inFlight.current) return
    inFlight.current = true
    setBusy(true)
    setMessage('')
    setRetry(command)
    try {
      const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(command) })
      const body = await response.json().catch(() => null)
      if (!response.ok) {
        if (response.status < 500) setRetry(null)
        if (response.status === 409) await mutate()
        throw new Error(body?.error ?? 'Não foi possível confirmar a operação.')
      }
      if (body?.ok !== true || !Number.isSafeInteger(body.revision) || !Array.isArray(body.disciplines)) throw new Error('Resposta não confirmada. Reenvie a mesma operação.')
      setRetry(null)
      await mutate(body, { revalidate: false })
      setReason('')
      setMessage(command.kind === 'PURCHASE' ? 'Nível adquirido e XP registrado. Complete o poder e revise a ficha no editor.' : 'Autorização registrada. Nenhum nível ou XP foi concedido.')
    } catch (error_) { setMessage(error_ instanceof Error ? error_.message : 'Falha de conexão. Reenvie a mesma operação.') }
    finally { inFlight.current = false; setBusy(false) }
  }
  function submit(kind: 'PURCHASE' | 'AUTHORIZE') {
    if (!data || !discipline || locked || !reason.trim()) return
    void execute({ kind, disciplineId: discipline.id, targetLevel: kind === 'PURCHASE' ? discipline.level + 1 : grantLevel, reason: reason.trim(), expectedRevision: data.revision, idempotencyKey: crypto.randomUUID(), ...(kind === 'AUTHORIZE' ? { requirement, acquisitionSource: requirement === 'CLAN_ASSOCIATION' ? 'CLAN' : 'XP' } : {}) })
  }
  return <section className="border border-border bg-card p-5" aria-label="Evolução de Disciplinas" aria-busy={busy}>
    <p className="eyebrow">Experiência e aprendizado</p><h2 className="mt-2 font-serif text-2xl">Evolução de Disciplinas</h2>
    {error && <p role="alert" className="mt-3 text-sm">Não foi possível carregar a evolução.</p>}
    {!data && !error && <output>Carregando Disciplinas…</output>}
    {data && discipline && <div className="mt-4 flex flex-col gap-4">
      <p className="text-sm">XP disponível: {data.availableXp}. Custos por novo nível: clã ×5, fora do clã ×7 e Caitiff ×6.</p>
      <label className="sheet-field"><span>Disciplina para evoluir</span><select className="select" value={discipline.id} disabled={locked} onChange={event => setSelected(event.target.value)}>{data.disciplines.map(entry => <option key={entry.id} value={entry.id}>{entry.name} — nível {entry.level}</option>)}</select></label>
      <p className="text-sm">{discipline.inClan ? 'Disciplina do clã' : 'Disciplina fora do clã'} · Próximo nível: {discipline.level + 1} · Custo: {discipline.xpCost} XP</p>
      {discipline.blockers.map(blocker => <p key={blocker.code} className="text-sm text-muted-foreground">{blocker.message}</p>)}
      <label className="sheet-field"><span>Justificativa da evolução ou autorização</span><textarea className="input" maxLength={500} value={reason} disabled={locked} onChange={event => setReason(event.target.value)} /></label>
      <button type="button" className="button-primary self-start" disabled={locked || !reason.trim() || !discipline.eligible || data.availableXp < discipline.xpCost} onClick={() => submit('PURCHASE')}>Comprar próximo nível</button>
      <p className="text-xs text-muted-foreground">Rituais e cerimônias são conteúdos separados: exigem nível da Disciplina e seus próprios pré-requisitos. Este painel compra somente níveis de Disciplina.</p>
      {data.contents.map(content => <p key={content.id} className="text-xs text-muted-foreground">{content.kind === 'RITUAL' ? 'Ritual' : 'Cerimônia'}: {content.name} · nível {content.level}{content.requiredPowerIds.length > 0 ? ' · exige poder específico aprovado' : ''}.</p>)}
      {data.canAuthorize && <fieldset className="flex flex-col gap-3 border border-border p-4"><legend>Autorização específica do Narrador</legend>
        <label className="sheet-field"><span>Requisito dispensado</span><select className="select" value={requirement} disabled={locked} onChange={event => setRequirement(event.target.value as typeof requirement)}><option value="LEARNING_APPROVAL">Aprovação de aprendizado para evolução</option><option value="CLAN_ASSOCIATION">Associação ao clã na distribuição inicial</option></select></label>
        <label className="sheet-field"><span>Nível autorizado</span><input className="input" type="number" min={1} max={requirement === 'CLAN_ASSOCIATION' ? 2 : 5} value={grantLevel} disabled={locked} onChange={event => setGrantLevel(Number(event.target.value))} /></label>
        <button type="button" className="button-ghost self-start" disabled={locked || !reason.trim() || !Number.isSafeInteger(grantLevel) || grantLevel < 1 || grantLevel > (requirement === 'CLAN_ASSOCIATION' ? 2 : 5)} onClick={() => submit('AUTHORIZE')}>Autorizar requisito</button>
        {data.grants.filter(grant => !grant.revokedAt).map(grant => <div key={grant.id} className="flex flex-wrap items-center gap-3 text-sm"><span>{data.disciplines.find(entry => entry.id === grant.disciplineId)?.name} · nível {grant.targetLevel} · {grant.requirement === 'CLAN_ASSOCIATION' ? 'Distribuição inicial' : 'Aprendizado'}</span><button type="button" className="button-ghost" disabled={locked || !reason.trim()} onClick={() => void execute({ kind: 'REVOKE', disciplineId: grant.disciplineId, targetLevel: grant.targetLevel, grantId: grant.id, reason: reason.trim(), expectedRevision: data.revision, idempotencyKey: crypto.randomUUID() })}>Revogar autorização</button></div>)}
      </fieldset>}
    </div>}
    {message && <output className="block mt-4 text-sm">{message}</output>}
    {retry && !busy && <button type="button" className="button-ghost mt-3" onClick={() => void execute(retry)}>Reenviar mesma operação</button>}
  </section>
}

