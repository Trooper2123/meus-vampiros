'use client'

import { useEffect, useId, useRef, useState } from 'react'
import useSWR from 'swr'
import { RollHistory } from './roll-history'
import { AnimatedDice } from './animated-dice'
import type { RollMode } from '@/lib/character-roll-history'
import type { Specialty } from '@/lib/vtm-v5/specialties'
import { CLAN_CONDITION_LABELS, type ClanCondition, type ClanRollContext, type ClanModifiers } from '@/lib/vtm-v5/clan-mechanics'

type BackgroundOption = {trait:string;totalDots:number;reservedDots:number;availableDots:number}
type RollData = { backgroundAvailability?: BackgroundOption[]; attributes: Record<string, number>; skills: Record<string, number>; specialties: Specialty[]; canUseSpecialties: boolean; canRollSecret: boolean; independent: boolean; clanCode?: string; clanConditions?: ClanCondition[]; predatorCode?: string; predatorName?: string; predatorRoll?: string; revision: number; status: string }
type RollCommand = { mode?: RollMode; hiddenDifficulty?: boolean; clanContext?: ClanRollContext; backgroundCode?: string; attribute: string; skillId: string; difficulty: number; specialtyId?: string; visibility: 'PUBLIC' | 'SECRET'; reason: string; expectedRevision: number; idempotencyKey: string; sessionId?: string }
type RollResponse = { ok: boolean; pool: number; specialtyBonus: number; clanModifiers?: ClanModifiers; visibility: 'PUBLIC' | 'SECRET'; revision: number; result: { normalDice: number[]; hungerDice: number[]; difficulty: number; successes: number; success: boolean; outcome: 'SUCCESS' | 'CRITICAL' | 'MESSY_CRITICAL' | 'FAILURE' | 'BESTIAL_FAILURE' } }
const attributeNames: Record<string, string> = { forca: 'Força', destreza: 'Destreza', vigor: 'Vigor', carisma: 'Carisma', manipulacao: 'Manipulação', compostura: 'Compostura', inteligencia: 'Inteligência', raciocinio: 'Raciocínio', determinacao: 'Determinação' }
const skillNames: Record<string, string> = { 'armas-brancas': 'Armas brancas', 'armas-de-fogo': 'Armas de fogo', atletismo: 'Atletismo', briga: 'Briga', conducao: 'Condução', furtividade: 'Furtividade', ladroagem: 'Ladroagem', oficios: 'Ofícios', sobrevivencia: 'Sobrevivência', 'empatia-com-animais': 'Empatia com animais', etiqueta: 'Etiqueta', intimidacao: 'Intimidação', lideranca: 'Liderança', manha: 'Manha', performance: 'Performance', persuasao: 'Persuasão', sagacidade: 'Sagacidade', subterfugio: 'Subterfúgio', ciencia: 'Ciência', academicos: 'Erudição', financas: 'Finanças', investigacao: 'Investigação', medicina: 'Medicina', ocultismo: 'Ocultismo', percepcao: 'Percepção', politica: 'Política', tecnologia: 'Tecnologia' }
function rollReason(mode: RollMode, attribute: string, skill: string, predatorName?: string) {
  if (mode === 'TEST' || mode === 'PREDATION') {
    const prefix = mode === 'PREDATION' ? `Predação ${predatorName ?? ''}: ` : 'Teste de '
    return `${prefix}${attributeNames[attribute] ?? attribute} + ${skillNames[skill] ?? skill}.`
  }
  return `Teste de ${({ CHECK: 'check', WILLPOWER: 'Força de Vontade', HUMANITY: 'Humanidade', TAKING_HALF: 'Taking Half', AUTOMATIC: 'vitória automática' } as const)[mode]}.`
}

async function fetchRollData(url: string): Promise<RollData> {
  const response = await fetch(url)
  const body = await response.json()
  if (!response.ok) throw new Error(typeof body.error === 'string' ? body.error : 'Não foi possível carregar a rolagem.')
  return body
}

export function CharacterRolls({ characterId, sessionId, prefill }: Readonly<{ characterId: string; sessionId?: string; prefill?: { attribute?: string; skill?: string } }>) {
  return <RollPanel key={`${characterId}:${sessionId ?? ''}`} characterId={characterId} sessionId={sessionId} prefill={prefill} />
}

function RollPanel({ characterId, sessionId, prefill }: Readonly<{ characterId: string; sessionId?: string; prefill?: { attribute?: string; skill?: string } }>) {
  const fieldId = useId()
  const endpoint = `/api/characters/${characterId}/rolls`
  const { data, error: loadError, isLoading, mutate } = useSWR<RollData>(endpoint, fetchRollData)
  const [attribute, setAttribute] = useState('')
  const [skillId, setSkillId] = useState('')
  useEffect(() => { if (prefill?.attribute) { setAttribute(prefill.attribute) } if (prefill?.skill) { setSkillId(prefill.skill) } }, [prefill])
  const [specialtyId, setSpecialtyId] = useState('')
  const [background, setBackground] = useState('')
  const [difficulty, setDifficulty] = useState('1')
  const [mode, setMode] = useState<RollMode>('TEST')
  const [hiddenDifficulty, setHiddenDifficulty] = useState(false)
  const [communication, setCommunication] = useState(false)
  const [pursuingCompulsion, setPursuingCompulsion] = useState(false)
  const [visibility, setVisibility] = useState<'PUBLIC' | 'SECRET'>('PUBLIC')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [animateDice, setAnimateDice] = useState(true)
  useEffect(() => {
    try { setAnimateDice(window.localStorage.getItem('meus-vampiros:animate-dice') !== 'false') } catch { /* Armazenamento indisponível: usar padrão */ }
  }, [])
  function toggleDiceAnimation(checked: boolean) {
    setAnimateDice(checked)
    try { window.localStorage.setItem('meus-vampiros:animate-dice', String(checked)) } catch { /* Preferência válida nesta sessão */ }
  }
  const [retryCommand, setRetryCommand] = useState<RollCommand | null>(null)
  const [result, setResult] = useState<RollResponse | null>(null)
  const submitting = useRef(false)
  const attributes = Object.entries(data?.attributes ?? {})
  const skills = Object.entries(data?.skills ?? {}).filter(([, dots]) => dots > 0)
  const selectedAttribute = attributes.some(([key]) => key === attribute) ? attribute : attributes[0]?.[0] ?? ''
  const selectedSkill = skills.some(([key]) => key === skillId) ? skillId : skills[0]?.[0] ?? ''
  const specialties = data?.canUseSpecialties ? data.specialties.filter(entry => entry.status === 'APPROVED' && entry.skillId === selectedSkill) : []
  const selectedSpecialty = specialties.find(entry => entry.id === specialtyId)
  const disabled = busy || retryCommand !== null
  const usesTraits = ['TEST', 'PREDATION', 'TAKING_HALF', 'AUTOMATIC'].includes(mode)
  const canUseCommunication = data?.canRollSecret && data.clanCode === 'LASOMBRA' && mode === 'TEST' && selectedSkill === 'tecnologia'
  const canPursueCompulsion = data?.canRollSecret && mode !== 'CHECK' && data.clanConditions?.includes('COMPULSION_PENALTY') && !['BANU_HAQIM', 'LASOMBRA'].includes(data.clanCode ?? '')
  const selectedBackground = data?.backgroundAvailability?.find(item => item.trait === background && item.availableDots > 0)
  const canUseBackground = ['TEST','TAKING_HALF','AUTOMATIC'].includes(mode)
  const validDifficulty = mode === 'CHECK' || Number.isInteger(Number(difficulty)) && Number(difficulty) >= 1 && Number(difficulty) <= 50

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
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : 'Falha de conexão. Tente novamente a mesma solicitação.')
    } finally {
      submitting.current = false
      setBusy(false)
    }
  }

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!data || disabled || (data.status !== 'APPROVED' && !(data.independent && data.status === 'DRAFT')) || !selectedAttribute || (!selectedSkill && !['CHECK', 'WILLPOWER', 'HUMANITY'].includes(mode)) || mode === 'PREDATION' && !data.predatorCode || !validDifficulty) return
    const clanContext = { ...(canUseCommunication && communication ? { communication: true } : {}), ...(canPursueCompulsion && pursuingCompulsion ? { pursuingCompulsion: true } : {}) }
    void execute({ mode, ...(data.canRollSecret ? { hiddenDifficulty } : {}), ...(Object.keys(clanContext).length ? { clanContext } : {}), attribute: selectedAttribute, skillId: selectedSkill, difficulty: mode === 'CHECK' ? 1 : Number(difficulty), ...(selectedSpecialty ? { specialtyId: selectedSpecialty.id } : {}), ...(canUseBackground && selectedBackground ? { backgroundCode: selectedBackground.trait } : {}), visibility: data.canRollSecret ? visibility : 'PUBLIC', reason: rollReason(mode, selectedAttribute, selectedSkill, data.predatorName), expectedRevision: data.revision, idempotencyKey: crypto.randomUUID(), ...(sessionId ? { sessionId } : {}) })
  }

  return <section className="border border-border bg-card p-5 sm:p-6" aria-labelledby={`${fieldId}-title`} aria-busy={busy || isLoading}>
    <p className="eyebrow">Teste de habilidade</p>
    <h2 id={`${fieldId}-title`} className="mt-2 font-serif text-xl">Rolagem de dados</h2>
    <p className="mt-2 text-sm text-muted-foreground">Selecione atributo, habilidade e dificuldade. O resultado é calculado e registrado no servidor.</p>
    {isLoading && <output className="block mt-4 text-sm">Carregando dados da rolagem…</output>}
    {loadError && <div role="alert" className="mt-4 flex flex-col gap-3 text-sm"><p>Não foi possível carregar os dados da rolagem.</p><button type="button" className="button-ghost min-h-10" disabled={busy} onClick={() => void mutate().catch(() => undefined)}>Carregar novamente</button></div>}
    {data && <form onSubmit={submit} className="mt-5 flex flex-col gap-4">
      {data.status !== 'APPROVED' && !(data.independent && data.status === 'DRAFT') && <output className="block text-sm text-muted-foreground">A ficha precisa estar aprovada para realizar rolagens.</output>}
      <label className="sheet-field"><span>Tipo de teste</span><select className="select" value={mode} disabled={disabled} onChange={event => { setMode(event.target.value as RollMode); setSpecialtyId('') }}><option value="TEST">Atributo + habilidade</option>{data.predatorCode && <option value="PREDATION">Predação{data.predatorName ? ` — ${data.predatorName}` : ''}</option>}<option value="CHECK">Check (1d10, sem Fome ou rerrolagem)</option><option value="WILLPOWER">Força de Vontade (sem Fome)</option><option value="HUMANITY">Humanidade (sem Fome)</option>{data.canRollSecret && <><option value="TAKING_HALF">Taking Half (opção oficial conduzida pelo Narrador)</option><option value="AUTOMATIC">Vitória automática (concessão do Narrador)</option></>}</select></label>
      {mode === 'PREDATION' && <p className="text-sm text-muted-foreground">{data.predatorRoll ? `Rolagem indicada: ${data.predatorRoll}. ` : ''}Selecione os traços da ficha aplicáveis à cena; Fome e modificadores válidos são calculados normalmente.</p>}
      {data.canRollSecret && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={hiddenDifficulty} disabled={disabled} onChange={event => setHiddenDifficulty(event.target.checked)} />Reservar dificuldade e resolução ao Narrador</label>}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm" htmlFor={`${fieldId}-attribute`}>Atributo<select id={`${fieldId}-attribute`} className="select min-h-10 w-full" disabled={disabled || !usesTraits} value={selectedAttribute} onChange={event => setAttribute(event.target.value)}>{attributes.length === 0 && <option value="">Nenhum atributo disponível</option>}{attributes.map(([key, dots]) => <option key={key} value={key}>{attributeNames[key] ?? key} ({dots})</option>)}</select></label>
        <label className="flex flex-col gap-2 text-sm" htmlFor={`${fieldId}-skill`}>Habilidade<select id={`${fieldId}-skill`} className="select min-h-10 w-full" disabled={disabled || !usesTraits} value={selectedSkill} onChange={event => { setSkillId(event.target.value); setSpecialtyId('') }}>{skills.length === 0 && <option value="">Nenhuma habilidade disponível</option>}{skills.map(([key, dots]) => <option key={key} value={key}>{skillNames[key] ?? key} ({dots})</option>)}</select></label>
        {mode !== 'CHECK' && <label className="flex flex-col gap-2 text-sm" htmlFor={`${fieldId}-difficulty`}>Dificuldade<input id={`${fieldId}-difficulty`} className="input min-h-10 w-full" type="number" min={1} max={50} step={1} required value={difficulty} disabled={disabled} onChange={event => setDifficulty(event.target.value)} /></label>}
        {usesTraits && data.canUseSpecialties && <label className="flex flex-col gap-2 text-sm" htmlFor={`${fieldId}-specialty`}>Especialidade aplicável<select id={`${fieldId}-specialty`} className="select min-h-10 w-full" disabled={disabled} value={selectedSpecialty?.id ?? ''} onChange={event => setSpecialtyId(event.target.value)}><option value="">Não aplicar especialidade</option>{specialties.map(entry => <option key={entry.id} value={entry.id}>{entry.name} (+1 dado)</option>)}</select></label>}
        {Boolean(data.backgroundAvailability?.length) && <label className="flex flex-col gap-2 text-sm" htmlFor={`${fieldId}-background`}>Background aplicável<select id={`${fieldId}-background`} className="select min-h-10 w-full" disabled={disabled || !canUseBackground} value={canUseBackground ? selectedBackground?.trait ?? '' : ''} onChange={event => setBackground(event.target.value)}><option value="">Não utilizar Background</option>{data.backgroundAvailability!.map(item => <option key={item.trait} value={item.trait} disabled={item.availableDots < 1}>{item.trait} (+{item.availableDots} disponíveis de {item.totalDots}; {item.reservedDots} em Stake)</option>)}</select></label>}
        {data.canRollSecret && <label className="flex flex-col gap-2 text-sm" htmlFor={`${fieldId}-visibility`}>Visibilidade<select id={`${fieldId}-visibility`} className="select min-h-10 w-full" disabled={disabled} value={visibility} onChange={event => setVisibility(event.target.value as 'PUBLIC' | 'SECRET')}><option value="PUBLIC">Pública</option><option value="SECRET">Secreta — somente Narrador</option></select></label>}
      </div>
      <p className="text-xs text-muted-foreground">{data.canUseSpecialties ? 'Escolha uma especialidade aplicável: o bônus é de no máximo +1 dado.' : 'A aplicação de uma especialidade exige confirmação do Narrador e concede no máximo +1 dado.'}</p>
      {Boolean(data.clanConditions?.length) && <p className="text-sm text-muted-foreground">Condições confirmadas: {data.clanConditions!.map(condition => CLAN_CONDITION_LABELS[condition]).join(' · ')}. Penalidades calculadas pelo servidor; check de Sangue não recebe modificadores. Exceções narrativas são conduzidas pelo Narrador.</p>}
      {canUseCommunication && <label className="flex items-start gap-2 text-sm"><input type="checkbox" disabled={disabled} checked={communication} onChange={event => setCommunication(event.target.checked)} />Confirmar comunicação tecnológica Lasombra: dificuldade 2 + Gravidade da Perdição, calculada pelo servidor</label>}
      {canPursueCompulsion && <label className="flex items-start gap-2 text-sm"><input type="checkbox" disabled={disabled} checked={pursuingCompulsion} onChange={event => setPursuingCompulsion(event.target.checked)} />Confirmar que esta ação atende ao objetivo da compulsão, dispensando sua penalidade nesta rolagem</label>}
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={animateDice} onChange={event => toggleDiceAnimation(event.target.checked)} />Animar rolagem de dados</label>
      <button type="submit" className="button-primary min-h-10 sm:self-start" disabled={disabled || Boolean(loadError) || (data.status !== 'APPROVED' && !(data.independent && data.status === 'DRAFT')) || !selectedAttribute || (!selectedSkill && !['CHECK', 'WILLPOWER', 'HUMANITY'].includes(mode)) || !validDifficulty}>{busy ? 'Rolando…' : 'Rolar dados'}</button>
    </form>}
    {error && <p role="alert" className="mt-4 text-sm text-primary">{error}</p>}
    {retryCommand && !busy && <button type="button" className="button-ghost mt-3 min-h-10" onClick={() => void execute(retryCommand)}>Tentar novamente a mesma rolagem</button>}
    {busy && <output className="block mt-4 text-sm text-muted-foreground">Registrando rolagem…</output>}
    {result?.clanModifiers && <p className="mt-4 text-sm">{result.clanModifiers.labels.join(' · ')} · Penalidade de clã: −{result.clanModifiers.dicePenalty} dado(s).</p>}
    {result && <>
      <AnimatedDice key={`${result.revision}:${animateDice}`} animate={animateDice} normalDice={result.result.normalDice} hungerDice={result.result.hungerDice} outcome={result.result.outcome} successes={result.result.successes} difficulty={result.result.difficulty} visibility={result.visibility} />
      <p className="mt-2 text-sm text-muted-foreground">{result.pool} dado(s){result.specialtyBonus > 0 ? ' · Especialidade +1' : ''}</p>
    </>}
    <RollHistory characterId={characterId} />
  </section>
}
