'use client'

import { useEffect, useId, useRef, useState } from 'react'
import useSWR from 'swr'
import { calculateSpecialtyGrants, eligibleSpecialtySkills, type Specialty, type SpecialtyGrant } from '@/lib/vtm-v5/specialties'
import { SPECIALTY_SKILL_NAMES, validateSkillValues, type SkillValidationIssue } from '@/lib/vtm-v5/skills'

type SpecialtyData = {
  specialties: Specialty[]
  grants: SpecialtyGrant[]
  skills: Record<string, number>
  availableXp: number
  revision: number
  canApprove: boolean
  skillValidation: { valid: boolean; issues: SkillValidationIssue[] }
  eligibility: { purchase: ReturnType<typeof eligibleSpecialtySkills>; grants: Record<string, ReturnType<typeof eligibleSpecialtySkills>> }
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

const skillNames = SPECIALTY_SKILL_NAMES
const originNames: Record<Specialty['origin'], string> = { SKILL: 'Primeiro ponto na habilidade', CREATION: 'Concessão de criação', PREDATOR: 'Tipo de predação', XP: 'Compra com XP', CUSTOM: 'Personalizada' }

async function fetchSpecialties(url: string): Promise<SpecialtyData> {
  const response = await fetch(url, { cache: 'no-store' })
  const body = await response.json()
  if (!response.ok) throw new Error(typeof body.error === 'string' ? body.error : 'Não foi possível carregar as especialidades.')
  return body
}

type SpecialtyPanelProps = { characterId: string; onChange?: () => void; draftSkills?: Record<string, number>; characterRevision?: number; onBeforeSubmit?: () => Promise<string | null> }

export function CharacterSpecialties(props: SpecialtyPanelProps) {
  return <SpecialtyPanel key={props.characterId} {...props} />
}

function SpecialtyPanel({ characterId, onChange, draftSkills, characterRevision, onBeforeSubmit }: SpecialtyPanelProps) {
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
  const preparing = useRef(false)
  const validation = validateSkillValues(draftSkills ?? data?.skills ?? {})
  const previewRules = { skills: validation.skills, creation: true }
  const grants = draftSkills && data ? [...calculateSpecialtyGrants(previewRules).filter(entry => !data.specialties.some(specialty => specialty.grantId === entry.id)), ...data.grants.filter(entry => entry.origin === 'PREDATOR')] : data?.grants ?? []
  const grant = grants.find(entry => entry.id === grantId)
  const options = draftSkills ? eligibleSpecialtySkills(previewRules, data?.specialties ?? [], grant) : grant ? data?.eligibility.grants[grant.id] ?? [] : data?.eligibility.purchase ?? []
  const eligibleSkills = options.map(option => [option.skillId, option.dots] as const)
  const selectedSkill = eligibleSkills.some(([id]) => id === skillId) ? skillId : eligibleSkills[0]?.[0] ?? ''
  const disabled = busy || retryCommand !== null
  const hasUnsavedSkills = Boolean(draftSkills && data && (!data.skillValidation.valid || JSON.stringify(validation.skills) !== JSON.stringify(validateSkillValues(data.skills).skills)))

  useEffect(() => {
    if (characterRevision !== undefined && data?.revision !== undefined && characterRevision !== data.revision) void mutate().catch(() => setError('Não foi possível atualizar as habilidades salvas.'))
  }, [characterRevision, data?.revision, mutate])

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

  async function submit(kind: SpecialtyCommand['kind'], specialtyId?: string) {
    if (!data || disabled || preparing.current) return
    if (kind === 'REJECT' && !window.confirm('Rejeitar esta especialidade? O servidor devolverá o XP da compra, quando aplicável.')) return
    preparing.current = true
    setBusy(true)
    setError('')
    try {
      let current = data
      if (kind === 'GRANT' || kind === 'PURCHASE') {
        if (!validation.valid) throw new Error('Revise os pontos das habilidades antes de continuar.')
        if (hasUnsavedSkills && (!onBeforeSubmit || !await onBeforeSubmit())) throw new Error('Não foi possível salvar as habilidades. A especialidade não foi enviada.')
        current = await fetchSpecialties(endpoint)
        await mutate(current, { revalidate: false })
        const allowed = kind === 'GRANT' ? current.eligibility.grants[grantId] ?? [] : current.eligibility.purchase
        if (!current.skillValidation.valid || !allowed.some(option => option.skillId === selectedSkill)) throw new Error('Esta habilidade não está disponível para a seleção atual. Revise a ficha.')
      }
      await execute({ kind, ...(specialtyId ? { specialtyId } : { skillId: selectedSkill, name: name.trim(), ...(kind === 'GRANT' ? { grantId } : {}) }), expectedRevision: current.revision, idempotencyKey: crypto.randomUUID(), reason: reason.trim() })
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Não foi possível validar as habilidades.')
    } finally {
      preparing.current = false
      setBusy(false)
    }
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
          <label className="flex flex-col gap-2 text-sm" htmlFor={`${fieldId}-grant`}>Concessão gratuita<select id={`${fieldId}-grant`} className="select w-full min-h-10" disabled={disabled} value={grant ? grantId : ''} onChange={event => setGrantId(event.target.value)}><option value="">Selecionar concessão ou comprar com XP</option>{grants.map(entry => <option key={entry.id} value={entry.id}>{originNames[entry.origin]}{entry.skillId ? `: ${skillNames[entry.skillId] ?? entry.skillId}` : ''}</option>)}</select></label>
          <label className="flex flex-col gap-2 text-sm" htmlFor={`${fieldId}-skill`}>Habilidade<select id={`${fieldId}-skill`} className="select w-full min-h-10" disabled={disabled || eligibleSkills.length === 0} value={selectedSkill} onChange={event => setSkillId(event.target.value)}>{eligibleSkills.length === 0 && <option value="">Nenhuma habilidade disponível</option>}{eligibleSkills.map(([id, dots]) => <option key={id} value={id}>{skillNames[id] ?? id} ({dots})</option>)}</select></label>
          <label className="flex flex-col gap-2 text-sm sm:col-span-2" htmlFor={`${fieldId}-name`}>Nome da especialidade<input id={`${fieldId}-name`} className="input w-full min-h-10" disabled={disabled} value={name} maxLength={100} onChange={event => setName(event.target.value)} placeholder="Ex.: História medieval" /></label>
          {grant?.options && <p className="text-sm text-muted-foreground sm:col-span-2">Opções da predação: {grant.options.filter(option => option.skillId === selectedSkill).map(option => option.name).join(', ')}.</p>}
          <label className="flex flex-col gap-2 text-sm sm:col-span-2" htmlFor={`${fieldId}-reason`}>Motivo da solicitação ou decisão<textarea id={`${fieldId}-reason`} className="input w-full" rows={2} maxLength={500} disabled={disabled} value={reason} onChange={event => setReason(event.target.value)} placeholder="Informe o motivo para o histórico da ficha." /></label>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row"><button type="button" className="button-primary min-h-10" disabled={disabled || !grant || !selectedSkill || !name.trim() || !reason.trim()} onClick={() => submit('GRANT')}>Usar concessão gratuita</button><button type="button" className="button-ghost min-h-10" disabled={disabled || Boolean(grant) || data.availableXp < 3 || !selectedSkill || !name.trim() || !reason.trim()} onClick={() => submit('PURCHASE')}>Comprar por 3 XP</button></div>
        <p className="text-xs text-muted-foreground">Escolhas personalizadas aguardam aprovação do Narrador. A compra reserva 3 XP até a decisão.</p>
        {hasUnsavedSkills && <p role="status" className="text-sm text-muted-foreground">A lista acompanha as habilidades em edição. Elas serão salvas e validadas antes de enviar a especialidade.</p>}
        {(!validation.valid || !data.skillValidation.valid) && <p role="alert" className="text-sm text-primary">Há habilidades desconhecidas, pontos inválidos ou aliases conflitantes. Revise e salve as habilidades da ficha.</p>}
      </div>}
      {message && <p role="status" className="mt-4 text-sm">{message}</p>}
      {error && <p role="alert" className="mt-4 text-sm text-primary">{error}</p>}
      {retryCommand && !busy && <button type="button" className="button-ghost mt-3 min-h-10" onClick={() => void execute(retryCommand)}>Tentar novamente a mesma solicitação</button>}
      {busy && <p role="status" className="mt-4 text-sm text-muted-foreground">Salvando especialidade…</p>}
    </section>
  )
}
