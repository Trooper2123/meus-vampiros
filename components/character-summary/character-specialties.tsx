'use client'

import { useId, useRef, useState } from 'react'
import useSWR from 'swr'
import type { Specialty, SpecialtyGrant } from '@/lib/vtm-v5/specialties'

type SpecialtyData = {
  specialties: Specialty[]
  grants: SpecialtyGrant[]
  skills: Record<string, number>
  availableXp: number
  revision: number
  canApprove: boolean
}

type SpecialtyCommand = {
  kind: 'GRANT' | 'PURCHASE' | 'APPROVE' | 'REJECT'
  grantId?: string
  skillId?: string
  name?: string
  specialtyId?: string
  expectedRevision: number
  idempotencyKey: string
  reason: string
}

const skillNames: Record<string, string> = {
  'armas-brancas': 'Armas brancas', 'armas-de-fogo': 'Armas de fogo', atletismo: 'Atletismo', briga: 'Briga', conducao: 'Condução', furtividade: 'Furtividade', ladroagem: 'Ladroagem', oficios: 'Ofícios', sobrevivencia: 'Sobrevivência', 'empatia-com-animais': 'Empatia com animais', etiqueta: 'Etiqueta', intimidacao: 'Intimidação', lideranca: 'Liderança', manha: 'Manha', performance: 'Performance', persuasao: 'Persuasão', sagacidade: 'Sagacidade', subterfugio: 'Subterfúgio', ciencia: 'Ciência', academicos: 'Erudição', financas: 'Finanças', investigacao: 'Investigação', medicina: 'Medicina', ocultismo: 'Ocultismo', percepcao: 'Percepção', politica: 'Política', tecnologia: 'Tecnologia',
}
const originNames: Record<Specialty['origin'], string> = { SKILL: 'Primeiro ponto na habilidade', CREATION: 'Concessão de criação', PREDATOR: 'Tipo de predação', XP: 'Compra com XP', CUSTOM: 'Personalizada' }

async function fetchSpecialties(url: string): Promise<SpecialtyData> {
  const response = await fetch(url, { cache: 'no-store' })
  const body = await response.json()
  if (!response.ok) throw new Error(typeof body.error === 'string' ? body.error : 'Não foi possível carregar as especialidades.')
  return body
}

export function CharacterSpecialties(props: { characterId: string; onChange?: () => void }) {
  return <SpecialtyPanel key={props.characterId} {...props} />
}

function SpecialtyPanel({ characterId, onChange }: { characterId: string; onChange?: () => void }) {
  const fieldId = useId()
  const endpoint = `/api/characters/${characterId}/specialties`
  const { data, error: loadError, isLoading, mutate } = useSWR<SpecialtyData>(endpoint, fetchSpecialties)
  const [grantId, setGrantId] = useState('')
  const [skillId, setSkillId] = useState('')
  const [name, setName] = useState('')
  const [reason, setReason] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [retryCommand, setRetryCommand] = useState<SpecialtyCommand | null>(null)
  const submitting = useRef(false)
  const grant = data?.grants.find(entry => entry.id === grantId)
  const eligibleSkills = Object.entries(data?.skills ?? {}).filter(([id, dots]) => dots > 0 && (!grant || !grant.skillId || grant.skillId === id) && (!grant?.options || grant.options.some(option => option.skillId === id)))
  const selectedSkill = eligibleSkills.some(([id]) => id === skillId) ? skillId : eligibleSkills[0]?.[0] ?? ''
  const disabled = busy || retryCommand !== null

  async function execute(command: SpecialtyCommand) {
    if (submitting.current) return
    submitting.current = true
    setBusy(true)
    setError('')
    setMessage('')
    setRetryCommand(command)
    try {
      const response = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(command) })
      const body = await response.json()
      if (!response.ok) {
        if (response.status < 500) setRetryCommand(null)
        if (response.status === 409) await mutate()
        throw new Error(typeof body.error === 'string' ? body.error : 'Não foi possível salvar a especialidade.')
      }
      if (body.ok !== true) throw new Error('Não foi possível confirmar a gravação. Tente novamente.')
      setRetryCommand(null)
      setMessage(command.kind === 'REJECT' ? 'Especialidade rejeitada.' : command.kind === 'APPROVE' ? 'Especialidade aprovada.' : 'Especialidade encaminhada para aprovação.')
      if (command.kind === 'GRANT' || command.kind === 'PURCHASE') setName('')
      if (data) await mutate({ ...data, specialties: body.specialties, revision: body.revision, availableXp: body.availableXp }, { revalidate: false })
      onChange?.()
      await mutate().catch(() => setError('A especialidade foi salva, mas não foi possível atualizar a lista. Carregue novamente.'))
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Falha de conexão. Tente novamente com a mesma solicitação.')
    } finally {
      submitting.current = false
      setBusy(false)
    }
  }

  function submit(kind: SpecialtyCommand['kind'], specialtyId?: string) {
    if (!data || disabled) return
    if (kind === 'REJECT' && !window.confirm('Rejeitar esta especialidade? O servidor devolverá o XP da compra, quando aplicável.')) return
    void execute({ kind, ...(specialtyId ? { specialtyId } : { skillId: selectedSkill, name: name.trim(), ...(kind === 'GRANT' ? { grantId } : {}) }), expectedRevision: data.revision, idempotencyKey: crypto.randomUUID(), reason: reason.trim() })
  }

  return (
    <section className="border border-border bg-card p-5 sm:p-6" aria-labelledby={`${fieldId}-title`} aria-busy={busy || isLoading}>
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 id={`${fieldId}-title`} className="font-serif text-xl uppercase tracking-wide">Especialidades</h2>
        {data && <p className="text-sm text-muted-foreground">XP disponível: {data.availableXp} · Concessões: {data.grants.length}</p>}
      </div>
      {isLoading && <p role="status" className="text-sm text-muted-foreground">Carregando especialidades…</p>}
      {loadError && <div role="alert" className="flex flex-col gap-3 text-sm"><p>Não foi possível atualizar as especialidades.</p><button type="button" className="button-ghost min-h-10" disabled={busy} onClick={() => void mutate().catch(() => undefined)}>Carregar novamente</button></div>}
      {data && <div className="flex flex-col gap-5">
        {data.specialties.length === 0 ? <p className="empty-state text-sm">Nenhuma especialidade cadastrada nesta ficha.</p> : <ul className="flex flex-col gap-3">
          {data.specialties.map(specialty => <li key={specialty.id} className="flex flex-col gap-3 border-b border-border pb-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0"><p className="break-words text-sm">{skillNames[specialty.skillId] ?? specialty.skillId}: {specialty.name}</p><p className="mt-1 text-xs text-muted-foreground">{originNames[specialty.origin]} · {specialty.costXp > 0 ? `${specialty.costXp} XP` : 'Gratuita'} · {specialty.status === 'APPROVED' ? 'Aprovada' : 'Aguardando aprovação'}</p></div>
            {data.canApprove && specialty.status === 'PENDING' && <div className="flex flex-wrap gap-2"><button type="button" className="button-ghost min-h-10" disabled={disabled || !reason.trim()} onClick={() => submit('APPROVE', specialty.id)}>Aprovar</button><button type="button" className="button-ghost min-h-10" disabled={disabled || !reason.trim()} onClick={() => submit('REJECT', specialty.id)}>Rejeitar</button></div>}
          </li>)}
        </ul>}
        <p className="text-sm text-muted-foreground">Uma especialidade aprovada e aplicável concede +1 dado. Apenas uma especialidade por rolagem.</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm" htmlFor={`${fieldId}-grant`}>Concessão gratuita<select id={`${fieldId}-grant`} className="select w-full min-h-10" disabled={disabled} value={grant ? grantId : ''} onChange={event => setGrantId(event.target.value)}><option value="">Selecionar concessão ou comprar com XP</option>{data.grants.map(entry => <option key={entry.id} value={entry.id}>{originNames[entry.origin]}{entry.skillId ? `: ${skillNames[entry.skillId] ?? entry.skillId}` : ''}</option>)}</select></label>
          <label className="flex flex-col gap-2 text-sm" htmlFor={`${fieldId}-skill`}>Habilidade<select id={`${fieldId}-skill`} className="select w-full min-h-10" disabled={disabled || eligibleSkills.length === 0} value={selectedSkill} onChange={event => setSkillId(event.target.value)}>{eligibleSkills.length === 0 && <option value="">Nenhuma habilidade disponível</option>}{eligibleSkills.map(([id, dots]) => <option key={id} value={id}>{skillNames[id] ?? id} ({dots})</option>)}</select></label>
          <label className="flex flex-col gap-2 text-sm sm:col-span-2" htmlFor={`${fieldId}-name`}>Nome da especialidade<input id={`${fieldId}-name`} className="input w-full min-h-10" disabled={disabled} value={name} maxLength={100} onChange={event => setName(event.target.value)} placeholder="Ex.: História medieval" /></label>
          {grant?.options && <p className="text-sm text-muted-foreground sm:col-span-2">Opções da predação: {grant.options.filter(option => option.skillId === selectedSkill).map(option => option.name).join(', ')}.</p>}
          <label className="flex flex-col gap-2 text-sm sm:col-span-2" htmlFor={`${fieldId}-reason`}>Motivo da solicitação ou decisão<textarea id={`${fieldId}-reason`} className="input w-full" rows={2} maxLength={500} disabled={disabled} value={reason} onChange={event => setReason(event.target.value)} placeholder="Informe o motivo para o histórico da ficha." /></label>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row"><button type="button" className="button-primary min-h-10" disabled={disabled || !grant || !selectedSkill || !name.trim() || !reason.trim()} onClick={() => submit('GRANT')}>Usar concessão gratuita</button><button type="button" className="button-ghost min-h-10" disabled={disabled || Boolean(grant) || data.availableXp < 3 || !selectedSkill || !name.trim() || !reason.trim()} onClick={() => submit('PURCHASE')}>Comprar por 3 XP</button></div>
        <p className="text-xs text-muted-foreground">Escolhas personalizadas aguardam aprovação do Narrador. A compra reserva 3 XP até a decisão.</p>
      </div>}
      {message && <p role="status" className="mt-4 text-sm">{message}</p>}
      {error && <p role="alert" className="mt-4 text-sm text-primary">{error}</p>}
      {retryCommand && !busy && <button type="button" className="button-ghost mt-3 min-h-10" onClick={() => void execute(retryCommand)}>Tentar novamente a mesma solicitação</button>}
      {busy && <p role="status" className="mt-4 text-sm text-muted-foreground">Salvando especialidade…</p>}
    </section>
  )
}
