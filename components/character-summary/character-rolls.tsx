'use client'

import { useId, useRef, useState } from 'react'
import useSWR from 'swr'
import type { Specialty } from '@/lib/vtm-v5/specialties'

type RollData = { attributes: Record<string, number>; skills: Record<string, number>; specialties: Specialty[]; canUseSpecialties: boolean; canRollSecret: boolean; revision: number; status: string }
type RollCommand = { attribute: string; skillId: string; difficulty: number; specialtyId?: string; visibility: 'PUBLIC' | 'SECRET'; reason: string; expectedRevision: number; idempotencyKey: string }
type RollResponse = { ok: boolean; pool: number; specialtyBonus: number; visibility: 'PUBLIC' | 'SECRET'; revision: number; result: { normalDice: number[]; hungerDice: number[]; difficulty: number; successes: number; success: boolean; outcome: 'SUCCESS' | 'CRITICAL' | 'MESSY_CRITICAL' | 'FAILURE' | 'BESTIAL_FAILURE' } }
const attributeNames: Record<string, string> = { forca: 'Força', destreza: 'Destreza', vigor: 'Vigor', carisma: 'Carisma', manipulacao: 'Manipulação', compostura: 'Compostura', inteligencia: 'Inteligência', raciocinio: 'Raciocínio', determinacao: 'Determinação' }
const skillNames: Record<string, string> = { 'armas-brancas': 'Armas brancas', 'armas-de-fogo': 'Armas de fogo', atletismo: 'Atletismo', briga: 'Briga', conducao: 'Condução', furtividade: 'Furtividade', ladroagem: 'Ladroagem', oficios: 'Ofícios', sobrevivencia: 'Sobrevivência', 'empatia-com-animais': 'Empatia com animais', etiqueta: 'Etiqueta', intimidacao: 'Intimidação', lideranca: 'Liderança', manha: 'Manha', performance: 'Performance', persuasao: 'Persuasão', sagacidade: 'Sagacidade', subterfugio: 'Subterfúgio', ciencia: 'Ciência', academicos: 'Erudição', financas: 'Finanças', investigacao: 'Investigação', medicina: 'Medicina', ocultismo: 'Ocultismo', percepcao: 'Percepção', politica: 'Política', tecnologia: 'Tecnologia' }
const outcomeNames: Record<RollResponse['result']['outcome'], string> = { SUCCESS: 'Sucesso', CRITICAL: 'Sucesso crítico', MESSY_CRITICAL: 'Crítico bagunçado', FAILURE: 'Falha', BESTIAL_FAILURE: 'Falha bestial' }

async function fetchRollData(url: string): Promise<RollData> {
  const response = await fetch(url)
  const body = await response.json()
  if (!response.ok) throw new Error(typeof body.error === 'string' ? body.error : 'Não foi possível carregar a rolagem.')
  return body
}

export function CharacterRolls({ characterId }: { characterId: string }) {
  return <RollPanel key={characterId} characterId={characterId} />
}

function RollPanel({ characterId }: { characterId: string }) {
  const fieldId = useId()
  const endpoint = `/api/characters/${characterId}/rolls`
  const { data, error: loadError, isLoading, mutate } = useSWR<RollData>(endpoint, fetchRollData)
  const [attribute, setAttribute] = useState('')
  const [skillId, setSkillId] = useState('')
  const [specialtyId, setSpecialtyId] = useState('')
  const [difficulty, setDifficulty] = useState('1')
  const [visibility, setVisibility] = useState<'PUBLIC' | 'SECRET'>('PUBLIC')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [retryCommand, setRetryCommand] = useState<RollCommand | null>(null)
  const [result, setResult] = useState<RollResponse | null>(null)
  const submitting = useRef(false)
  const attributes = Object.entries(data?.attributes ?? {})
  const skills = Object.entries(data?.skills ?? {})
  const selectedAttribute = attributes.some(([key]) => key === attribute) ? attribute : attributes[0]?.[0] ?? ''
  const selectedSkill = skills.some(([key]) => key === skillId) ? skillId : skills[0]?.[0] ?? ''
  const specialties = data?.canUseSpecialties ? data.specialties.filter(entry => entry.status === 'APPROVED' && entry.skillId === selectedSkill) : []
  const selectedSpecialty = specialties.find(entry => entry.id === specialtyId)
  const disabled = busy || retryCommand !== null
  const validDifficulty = Number.isInteger(Number(difficulty)) && Number(difficulty) >= 1 && Number(difficulty) <= 50

  async function execute(command: RollCommand) {
    if (submitting.current) return
    submitting.current = true
    setBusy(true)
    setError('')
    setRetryCommand(command)
    try {
      const response = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(command) })
      const body = await response.json()
      if (!response.ok) {
        if (response.status < 500) setRetryCommand(null)
        if (response.status === 409) await mutate()
        throw new Error(typeof body.error === 'string' ? body.error : 'Não foi possível realizar a rolagem.')
      }
      if (body.ok !== true) throw new Error('Não foi possível confirmar a rolagem. Tente novamente a mesma solicitação.')
      setResult(body as RollResponse)
      setRetryCommand(null)
      await mutate().catch(() => setError('A rolagem foi registrada, mas os dados da ficha precisam ser carregados novamente.'))
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Falha de conexão. Tente novamente a mesma solicitação.')
    } finally {
      submitting.current = false
      setBusy(false)
    }
  }

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!data || disabled || data.status !== 'APPROVED' || !selectedAttribute || !selectedSkill || !validDifficulty) return
    void execute({ attribute: selectedAttribute, skillId: selectedSkill, difficulty: Number(difficulty), ...(selectedSpecialty ? { specialtyId: selectedSpecialty.id } : {}), visibility: data.canRollSecret ? visibility : 'PUBLIC', reason: `Teste de ${attributeNames[selectedAttribute] ?? selectedAttribute} + ${skillNames[selectedSkill] ?? selectedSkill}.`, expectedRevision: data.revision, idempotencyKey: crypto.randomUUID() })
  }

  return <section className="border border-border bg-card p-5 sm:p-6" aria-labelledby={`${fieldId}-title`} aria-busy={busy || isLoading}>
    <p className="eyebrow">Teste de habilidade</p>
    <h2 id={`${fieldId}-title`} className="mt-2 font-serif text-xl">Rolagem de dados</h2>
    <p className="mt-2 text-sm text-muted-foreground">Selecione atributo, habilidade e dificuldade. O resultado é calculado e registrado no servidor.</p>
    {isLoading && <p role="status" className="mt-4 text-sm">Carregando dados da rolagem…</p>}
    {loadError && <div role="alert" className="mt-4 flex flex-col gap-3 text-sm"><p>Não foi possível carregar os dados da rolagem.</p><button type="button" className="button-ghost min-h-10" disabled={busy} onClick={() => void mutate().catch(() => undefined)}>Carregar novamente</button></div>}
    {data && <form onSubmit={submit} className="mt-5 flex flex-col gap-4">
      {data.status !== 'APPROVED' && <p role="status" className="text-sm text-muted-foreground">A ficha precisa estar aprovada para realizar rolagens.</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm" htmlFor={`${fieldId}-attribute`}>Atributo<select id={`${fieldId}-attribute`} className="select min-h-10 w-full" disabled={disabled} value={selectedAttribute} onChange={event => setAttribute(event.target.value)}>{attributes.length === 0 && <option value="">Nenhum atributo disponível</option>}{attributes.map(([key, dots]) => <option key={key} value={key}>{attributeNames[key] ?? key} ({dots})</option>)}</select></label>
        <label className="flex flex-col gap-2 text-sm" htmlFor={`${fieldId}-skill`}>Habilidade<select id={`${fieldId}-skill`} className="select min-h-10 w-full" disabled={disabled} value={selectedSkill} onChange={event => { setSkillId(event.target.value); setSpecialtyId('') }}>{skills.length === 0 && <option value="">Nenhuma habilidade disponível</option>}{skills.map(([key, dots]) => <option key={key} value={key}>{skillNames[key] ?? key} ({dots})</option>)}</select></label>
        <label className="flex flex-col gap-2 text-sm" htmlFor={`${fieldId}-difficulty`}>Dificuldade<input id={`${fieldId}-difficulty`} className="input min-h-10 w-full" type="number" min={1} max={50} step={1} required value={difficulty} disabled={disabled} onChange={event => setDifficulty(event.target.value)} /></label>
        {data.canUseSpecialties && <label className="flex flex-col gap-2 text-sm" htmlFor={`${fieldId}-specialty`}>Especialidade aplicável<select id={`${fieldId}-specialty`} className="select min-h-10 w-full" disabled={disabled} value={selectedSpecialty?.id ?? ''} onChange={event => setSpecialtyId(event.target.value)}><option value="">Não aplicar especialidade</option>{specialties.map(entry => <option key={entry.id} value={entry.id}>{entry.name} (+1 dado)</option>)}</select></label>}
        {data.canRollSecret && <label className="flex flex-col gap-2 text-sm" htmlFor={`${fieldId}-visibility`}>Visibilidade<select id={`${fieldId}-visibility`} className="select min-h-10 w-full" disabled={disabled} value={visibility} onChange={event => setVisibility(event.target.value as 'PUBLIC' | 'SECRET')}><option value="PUBLIC">Pública</option><option value="SECRET">Secreta — somente Narrador</option></select></label>}
      </div>
      <p className="text-xs text-muted-foreground">{data.canUseSpecialties ? 'Escolha uma especialidade aplicável: o bônus é de no máximo +1 dado.' : 'A aplicação de uma especialidade exige confirmação do Narrador e concede no máximo +1 dado.'}</p>
      <button type="submit" className="button-primary min-h-10 sm:self-start" disabled={disabled || Boolean(loadError) || data.status !== 'APPROVED' || !selectedAttribute || !selectedSkill || !validDifficulty}>{busy ? 'Rolando…' : 'Rolar dados'}</button>
    </form>}
    {error && <p role="alert" className="mt-4 text-sm text-primary">{error}</p>}
    {retryCommand && !busy && <button type="button" className="button-ghost mt-3 min-h-10" onClick={() => void execute(retryCommand)}>Tentar novamente a mesma rolagem</button>}
    {busy && <p role="status" className="mt-4 text-sm text-muted-foreground">Registrando rolagem…</p>}
    {result && <div className="mt-5 border-t border-border pt-5" role="status" aria-live="polite"><h3 className="font-serif text-xl">{outcomeNames[result.result.outcome]}</h3><p className="mt-2 text-sm">{result.result.successes} sucesso(s) · Dificuldade {result.result.difficulty} · {result.pool} dado(s){result.specialtyBonus > 0 ? ' · Especialidade +1' : ''}</p><p className="mt-2 text-xs text-muted-foreground">{result.visibility === 'SECRET' ? 'Rolagem secreta — somente Narrador' : 'Rolagem pública'}</p><dl className="mt-4 grid gap-3 sm:grid-cols-2"><div><dt className="text-sm">Dados normais</dt><dd className="mt-1 font-mono text-sm">{result.result.normalDice.join(' · ') || 'Nenhum'}</dd></div><div><dt className="text-sm">Dados de Fome</dt><dd className="mt-1 font-mono text-sm">{result.result.hungerDice.join(' · ') || 'Nenhum'}</dd></div></dl></div>}
  </section>
}
