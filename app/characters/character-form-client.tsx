'use client'

import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { AlertTriangle, ArrowLeft, Check, FileText, Link2, Plus, Save, Send, ShieldCheck, Skull, Unlink } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import useSWR from 'swr'
import styles from '../create-characters/skills.module.css'
import { PLAYER_CHARACTER_TYPES, type CharacterStatus, type CharacterType, type CreationType, type ValidationReport } from '@/lib/vtm-v5/types'
import { ATTRIBUTE_DISTRIBUTION, CREATION_ADJUSTMENTS, GHOUL_TEMPLATE, HUMAN_NPC_TEMPLATES, SKILL_DISTRIBUTIONS } from '@/lib/vtm-v5/presets'
import { fitsDistribution, matchesDistribution, remainingPoints } from '@/lib/vtm-v5/creation-guidance'

const fetcher = (url: string) => fetch(url).then((response) => response.json())

const tabs = [
  { id: 'identidade', label: 'Identidade', eyebrow: 'I / o nome antes da noite' },
  { id: 'atributos', label: 'Atributos', eyebrow: 'II / corpo, presença e mente' },
  { id: 'habilidades', label: 'Habilidades', eyebrow: 'III / aquilo que foi aprendido' },
  { id: 'disciplinas', label: 'Disciplinas', eyebrow: 'IV / dons do sangue' },
  { id: 'recursos', label: 'Recursos e convicções', eyebrow: 'V / o que ainda resta' },
  { id: 'vantagens', label: 'Vantagens e Defeitos', eyebrow: 'VII / o que soma e o que custa' },
  { id: 'historico', label: 'Histórico e notas', eyebrow: 'VI / aquilo que não deve ser esquecido' },
] as const

type TabId = (typeof tabs)[number]['id']
type QuickSkillMode = keyof typeof SKILL_DISTRIBUTIONS

const disciplineOptions = ['Animalismo', 'Auspícios', 'Rapidez', 'Dominação', 'Feitiçaria de Sangue', 'Fortitude', 'Oblívio', 'Ofuscação', 'Potência', 'Presença', 'Proteanismo']
const physicalSkills = ['Armas brancas', 'Armas de fogo', 'Atletismo', 'Briga', 'Condução', 'Furtividade', 'Ladroagem', 'Ofícios', 'Sobrevivência'] as const
const socialSkills = ['Empatia com animais', 'Etiqueta', 'Intimidação', 'Liderança', 'Manha', 'Performance', 'Persuasão', 'Sagacidade', 'Subterfúgio'] as const
const mentalSkills = ['Ciência', 'Erudição', 'Finanças', 'Investigação', 'Medicina', 'Ocultismo', 'Percepção', 'Política', 'Tecnologia'] as const

const characterTypeLabels: Record<CharacterType, string> = {
  PLAYER_VAMPIRE: 'Vampiro jogador',
  HUMAN_NPC: 'NPC humano',
  VAMPIRE_NPC: 'NPC vampiro',
  RETAINER: 'Retentor ou carniçal',
}

const creationTypeLabels: Record<CreationType, string> = {
  FLEDGLING: 'Novato',
  NEONATE: 'Neófito',
  ANCILLA: 'Ancilla',
  THIN_BLOOD: 'Sangue-fraco',
}

const characterStatusLabels: Record<CharacterStatus, string> = {
  DRAFT: 'Rascunho',
  PENDING_REVIEW: 'Em revisão',
  APPROVED: 'Aprovada',
  ARCHIVED: 'Arquivada',
  DISABLED: 'Desativada',
}

const humanNpcTemplateLabels: Record<keyof typeof HUMAN_NPC_TEMPLATES, string> = {
  INVESTIGATIVE_POLICE: 'Policial investigativo',
  GANGSTER: 'Criminoso',
  CLERGY: 'Clero',
  FAITH_HUNTER: 'Caçador pela fé',
  INQUISITOR: 'Inquisidor',
  DELTA_INQUISITOR: 'Inquisidor de elite',
}

const skillModeLabels: Record<QuickSkillMode, string> = {
  JACK_OF_ALL_TRADES: 'Generalista',
  BALANCED: 'Equilibrado',
  SPECIALIST: 'Especialista',
}

type DisciplinePower = {
  name: string
  effect: string
  cost: string
  prerequisite: string
  amalgam: string
  duration: string
  dicePool: string
  opposingPool: string
  additionalNotes: string
  source: string
}

const createEmptyPower = (): DisciplinePower => ({
  name: '', effect: '', cost: '', prerequisite: '', amalgam: '', duration: '', dicePool: '', opposingPool: '', additionalNotes: '', source: ''
})

const skillGroups = [
  { title: 'Físicas', skills: physicalSkills },
  { title: 'Sociais', skills: socialSkills },
  { title: 'Intelectuais', skills: mentalSkills },
] as const

type TraitItem = { name: string; level: number; description: string; expanded?: boolean }
const createInitialTraits = (): TraitItem[] => Array.from({ length: 5 }, () => ({ name: '', level: 0, description: '', expanded: false }))

type PossessionItem = {
  id?: string
  label: string
  description?: string
  origin?: 'player' | 'master'
  status: 'pendente' | 'aprovado' | 'reprovado'
  masterComment?: string
}

const resourceDefinitions = [
  { label: 'Humanidade', name: 'humanidade', total: 10 },
  { label: 'Força de vontade', name: 'vontade', total: 10 },
  { label: 'Vitalidade', name: 'vitalidade', total: 10 },
  { label: 'Fome', name: 'fome', total: 5 },
] as const

const dots = (total: number, value: number, onChange: (value: number) => void, name?: string, allowZero = false) => (
  <div className="dot-track" role="group" aria-label={`Nível ${value} de ${total}`}>
    {name && <input type="hidden" name={name} value={value} />}
    {Array.from({ length: total }, (_, index) => {
      const point = index + 1
      return <button key={point} type="button" className={`dot ${point <= value ? 'is-filled' : ''}`} aria-label={`Definir nível ${point}`} aria-pressed={point <= value} onClick={() => onChange(allowZero && point === value ? 0 : point)} />
    })}
  </div>
)

function Field({ label, name, placeholder, className = '', value, onChange }: { label: string; name: string; placeholder?: string; className?: string; value?: string; onChange?: (e: any) => void }) {
  return <label className={`sheet-field ${className}`}><span>{label}</span><input name={name} placeholder={placeholder} value={value ?? undefined} onChange={onChange} /></label>
}

function SheetSection({ title, eyebrow, children }: { title: string; eyebrow?: string; children: React.ReactNode }) {
  return <section className="sheet-section"><div className="sheet-section-heading"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h2>{title}</h2></div><span className="section-mark" aria-hidden="true">✦</span></div>{children}</section>
}

function CreationHint({ children, complete = false }: { children: React.ReactNode; complete?: boolean }) {
  return <div className="mb-5 border border-border bg-background/40 p-3 text-xs leading-5" role="status"><p className={complete ? 'text-foreground' : 'text-muted-foreground'}>{children}</p></div>
}

function CampaignLink({ characterId, onCampaignChange }: { characterId: string | null; onCampaignChange?: (campaignId: string | null) => void }) {
  const { data, mutate } = useSWR<{ character?: { campaignId: string | null }; campaign?: { id: string; name: string; theme: string | null; principios: string | null } | null }>(
    characterId ? `/api/characters?id=${characterId}` : null,
    fetcher
  )
  const [campaignInput, setCampaignInput] = useState('')
  const [linking, setLinking] = useState(false)
  const [linkError, setLinkError] = useState<string | null>(null)
  const linkedCampaign = data?.campaign ?? null

  async function linkCampaign(nextCampaignId: string | null) {
    if (!characterId) {
      setLinkError('Salve a ficha antes de vincular a uma mesa.')
      return
    }
    setLinking(true)
    setLinkError(null)
    const response = await fetch('/api/characters', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: characterId, campaignId: nextCampaignId }),
    })
    setLinking(false)
    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      setLinkError(body.error ?? 'Não foi possível vincular a mesa.')
      return
    }
    setCampaignInput('')
    await mutate()
    onCampaignChange?.(nextCampaignId)
  }

  return <div className="identity-subsection">
    <div className="blood-heading"><h3>Mesa vinculada</h3></div>
    {linkedCampaign ? <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border border-border bg-card p-4">
      <div><p className="eyebrow">Campanha</p><p className="mt-1 font-serif text-lg">{linkedCampaign.name}</p><p className="mt-1 text-sm text-muted-foreground">{linkedCampaign.theme ?? 'Tema não definido'}</p></div>
      <button type="button" onClick={() => linkCampaign(null)} disabled={linking} className="button-ghost inline-flex items-center gap-2"><Unlink className="size-4" /> Desvincular</button>
    </div> : <div className="mt-4 flex flex-wrap items-end gap-3">
      <label className="sheet-field" style={{ flex: '1 1 260px' }}><span>ID da mesa</span><input value={campaignInput} onChange={(event) => setCampaignInput(event.target.value)} placeholder="Cole o identificador enviado pelo mestre" /></label>
      <button type="button" onClick={() => linkCampaign(campaignInput.trim() || null)} disabled={linking || !campaignInput.trim()} className="button-primary inline-flex items-center gap-2"><Link2 className="size-4" /> {linking ? 'Vinculando...' : 'Vincular'}</button>
    </div>}
    {linkError && <p className="mt-3 text-sm" style={{ color: '#e17b78' }}>{linkError}</p>}
    {!characterId && <p className="mt-3 text-xs text-muted-foreground">Salve a ficha uma vez para poder vincular a uma mesa.</p>}
  </div>
}

export default function CharacterFormClient({
  initialCharacterId = null,
  mode = 'create',
  allowedCharacterTypes = PLAYER_CHARACTER_TYPES,
}: {
  initialCharacterId?: string | null
  mode?: 'create' | 'edit'
  allowedCharacterTypes?: readonly CharacterType[]
}) {
  const searchParams = useSearchParams()
  const idFromUrl = initialCharacterId ?? (searchParams?.get('id') ?? null)
  const [activeTab, setActiveTab] = useState<TabId>('identidade')
  const [attributes, setAttributes] = useState({ forca: 1, destreza: 1, vigor: 1, carisma: 1, manipulacao: 1, compostura: 1, inteligencia: 1, raciocinio: 1, determinacao: 1 })
  const [bloodPotency, setBloodPotency] = useState(0)
  const [skills, setSkills] = useState<Record<string, number>>({})
  const [disciplines, setDisciplines] = useState([
    { id: 'disciplina-1', name: '', level: 0, powers: [createEmptyPower(), createEmptyPower(), createEmptyPower(), createEmptyPower(), createEmptyPower()] },
    { id: 'disciplina-2', name: '', level: 0, powers: [createEmptyPower(), createEmptyPower(), createEmptyPower(), createEmptyPower(), createEmptyPower()] },
    { id: 'disciplina-3', name: '', level: 0, powers: [createEmptyPower(), createEmptyPower(), createEmptyPower(), createEmptyPower(), createEmptyPower()] },
  ])
  const [resources, setResources] = useState({ humanidade: 0, vontade: 0, vitalidade: 0, fome: 1 })
  const [convictions, setConvictions] = useState([
    { pilar: '', crenca: '' },
    { pilar: '', crenca: '' },
    { pilar: '', crenca: '' },
  ])
  const [merits, setMerits] = useState<TraitItem[]>(createInitialTraits)
  const [flaws, setFlaws] = useState<TraitItem[]>(createInitialTraits)
  const [possessions, setPossessions] = useState<PossessionItem[]>([
    { label: 'Carro Sedan 1998', description: 'Veículo com vidros insulfilmados para deslocamento noturno', status: 'aprovado', masterComment: 'Aprovado pelo narrador.' },
  ])
  const [gmItems, setGmItems] = useState<PossessionItem[]>([
    { label: 'Chave do Refúgio da Capela', description: 'Concedido pelo Regente Tremere', origin: 'master', status: 'aprovado', masterComment: 'Item de história concedido na sessão 1.' },
  ])
  const [newPossessionLabel, setNewPossessionLabel] = useState('')
  const [newPossessionDesc, setNewPossessionDesc] = useState('')
  const router = useRouter()

  const [nome, setNome] = useState('')
  const [conceito, setConceito] = useState('')
  const [cla, setCla] = useState('')
  const [predador, setPredador] = useState('')
  const [geracao, setGeracao] = useState('')
  const [sire, setSire] = useState('')
  const [idadeVerdadeira, setIdadeVerdadeira] = useState('')
  const [idadeAparente, setIdadeAparente] = useState('')
  const [dadosVida, setDadosVida] = useState('')
  const [dadosMorte, setDadosMorte] = useState('')
  const [historico, setHistorico] = useState('')
  const [notas, setNotas] = useState('')
  const [characterType, setCharacterType] = useState<CharacterType>('PLAYER_VAMPIRE')
  const [creationType, setCreationType] = useState<CreationType>('FLEDGLING')
  const [skillMode, setSkillMode] = useState<QuickSkillMode>('BALANCED')
  const [characterStatus, setCharacterStatus] = useState<CharacterStatus>('DRAFT')
  const [validationReport, setValidationReport] = useState<ValidationReport | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [validating, setValidating] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [npcMode, setNpcMode] = useState<'SIMPLE' | 'POOLS' | 'COMPLETE'>('SIMPLE')
  const [npcDifficulty, setNpcDifficulty] = useState(3)
  const [npcPools, setNpcPools] = useState({ physicalPool: 3, socialPool: 3, mentalPool: 3 })
  const [npcTemplate, setNpcTemplate] = useState<keyof typeof HUMAN_NPC_TEMPLATES>('GANGSTER')
  const [retainer, setRetainer] = useState({ controlMethod: 'VITAE', isGhoul: true, domitorCharacterId: '', storedVitaeJustification: '', disciplineLevel: 1, bondStrength: 1 })

  const handleAddPossession = async () => {
    if (!newPossessionLabel.trim()) return
    const label = newPossessionLabel.trim()
    const description = newPossessionDesc.trim() || undefined
    setNewPossessionLabel('')
    setNewPossessionDesc('')

    if (characterId) {
      const response = await fetch('/api/possessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId, label, description, origin: 'player' }),
      })
      if (response.ok) {
        void mutatePossessions()
        return
      }
    }

    setPossessions((current) => [
      ...current,
      { label, description, origin: 'player', status: 'pendente' },
    ])
  }
  const [totalXp, setTotalXp] = useState('')
  const [spentXp, setSpentXp] = useState('')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [characterId, setCharacterId] = useState<string | null>(idFromUrl)
  const [confirmingDiscipline, setConfirmingDiscipline] = useState<{ index: number; name: string } | null>(null)
  const { data: characterData, mutate: mutateCharacter } = useSWR<{ character?: { id: string; name: string; status: CharacterStatus; characterType: CharacterType; data: Record<string, unknown> }; campaign?: { principios: string | null } | null }>(characterId ? `/api/characters?id=${characterId}` : null, fetcher)
  const { data: possessionsData, mutate: mutatePossessions } = useSWR<{ possessions: PossessionItem[] }>(characterId ? `/api/possessions?characterId=${characterId}` : null, fetcher)

  useEffect(() => {
    if (characterData?.character?.data && idFromUrl) {
      const data = characterData.character.data
      setCharacterType(characterData.character.characterType ?? 'PLAYER_VAMPIRE')
      setCreationType((data.creationType as CreationType) ?? 'FLEDGLING')
      setSkillMode((data.skillMode as QuickSkillMode) ?? 'BALANCED')
      setCharacterStatus(characterData.character.status ?? 'DRAFT')
      if (data.npc && typeof data.npc === 'object') {
        const npc = data.npc as Record<string, unknown>
        setNpcMode((npc.mode as 'SIMPLE' | 'POOLS' | 'COMPLETE') ?? 'SIMPLE')
        setNpcDifficulty(Number(npc.difficulty) || 3)
        setNpcPools({ physicalPool: Number(npc.physicalPool) || 3, socialPool: Number(npc.socialPool) || 3, mentalPool: Number(npc.mentalPool) || 3 })
      }
      if (data.retainer && typeof data.retainer === 'object') {
        const savedRetainer = data.retainer as Record<string, unknown>
        setRetainer({
          controlMethod: String(savedRetainer.controlMethod ?? 'VITAE'),
          isGhoul: savedRetainer.isGhoul !== false,
          domitorCharacterId: String(savedRetainer.domitorCharacterId ?? ''),
          storedVitaeJustification: String(savedRetainer.storedVitaeJustification ?? ''),
          disciplineLevel: Number(savedRetainer.disciplineLevel) || 1,
          bondStrength: Number(savedRetainer.bondStrength) || 1,
        })
      }
      // Carregar identidade
      setAttributes({
        forca: Number(data['forca']) || 1,
        destreza: Number(data['destreza']) || 1,
        vigor: Number(data['vigor']) || 1,
        carisma: Number(data['carisma']) || 1,
        manipulacao: Number(data['manipulacao']) || 1,
        compostura: Number(data['compostura']) || 1,
        inteligencia: Number(data['inteligencia']) || 1,
        raciocinio: Number(data['raciocinio']) || 1,
        determinacao: Number(data['determinacao']) || 1,
      })
      setBloodPotency(Number(data['potencia-de-sangue']) || 0)
      // Carregar habilidades
      const loadedSkills: Record<string, number> = {}
      for (const key in data) {
        if (key.startsWith('habilidade-')) {
          const skillName = key.replace('habilidade-', '')
          loadedSkills[skillName] = Number(data[key]) || 0
        }
      }
      setSkills(loadedSkills)
      // Carregar disciplinas
      if (Array.isArray(data['disciplinas'])) {
        const loadedDisciplines = (data['disciplinas'] as Array<{ id?: string; name?: string; level?: number; powers?: any[] }>).map(d => ({
          id: d.id || `disciplina-${Date.now()}`,
          name: d.name || '',
          level: Number(d.level) || 0,
          powers: Array.isArray(d.powers) ? d.powers : []
        }))
        setDisciplines(loadedDisciplines)
      }
      // Carregar recursos
      setResources({
        humanidade: Number(data['humanidade']) || 0,
        vontade: Number(data['vontade']) || 0,
        vitalidade: Number(data['vitalidade']) || 0,
        fome: Number(data['fome']) || 1,
      })
      // Carregar convicções
      const loadedConvictions = [
        { pilar: String(data['convicoes-pilar-1'] || ''), crenca: String(data['convicoes-crenca-1'] || '') },
        { pilar: String(data['convicoes-pilar-2'] || ''), crenca: String(data['convicoes-crenca-2'] || '') },
        { pilar: String(data['convicoes-pilar-3'] || ''), crenca: String(data['convicoes-crenca-3'] || '') },
      ]
      setConvictions(loadedConvictions)
      // Carregar vantagens e defeitos
      if (Array.isArray(data['vantagens'])) {
        setMerits((data['vantagens'] as Array<{ name?: string; level?: number; description?: string }>).map((m) => ({
          name: m.name || '',
          level: Number(m.level) || 0,
          description: m.description || '',
          expanded: false
        })))
      }
      if (Array.isArray(data['defeitos'])) {
        setFlaws((data['defeitos'] as Array<{ name?: string; level?: number; description?: string }>).map((f) => ({
          name: f.name || '',
          level: Number(f.level) || 0,
          description: f.description || '',
          expanded: false
        })))
      }
      // Carregar XP
      setTotalXp(String(data['experiencia-total'] || ''))
      setSpentXp(String(data['experiencia-gasta'] || ''))

      // Preencher campos controlados do formulário
      setNome(String(data['nome'] ?? ''))
      setConceito(String(data['conceito'] ?? ''))
      setCla(String(data['cla'] ?? ''))
      setPredador(String(data['predador'] ?? ''))
      setGeracao(String(data['geracao'] ?? ''))
      setSire(String(data['sire'] ?? ''))

      setIdadeVerdadeira(String(data['idade-verdadeira'] ?? ''))
      setIdadeAparente(String(data['idade-aparente'] ?? ''))
      setDadosVida(String(data['dados-de-vida'] ?? ''))
      setDadosMorte(String(data['dados-da-morte'] ?? ''))

      setHistorico(String(data['historico'] ?? ''))
      setNotas(String(data['notas'] ?? ''))
    }
  }, [characterData, idFromUrl])

  useEffect(() => {
    if (possessionsData?.possessions) {
      setPossessions(possessionsData.possessions.filter((p) => p.origin !== 'master'))
      setGmItems(possessionsData.possessions.filter((p) => p.origin === 'master'))
    }
  }, [possessionsData])
  const formRef = useRef<HTMLFormElement>(null)
  const setAttribute = (name: keyof typeof attributes, value: number) => setAttributes((current) => {
    const next = { ...current, [name]: value }
    return fitsDistribution(Object.values(next), ATTRIBUTE_DISTRIBUTION) ? next : current
  })
  const availableXp = Math.max(0, (Number.parseInt(totalXp, 10) || 0) - (Number.parseInt(spentXp, 10) || 0))
  const addDiscipline = () => setDisciplines((current) => current.length >= 7 ? current : [...current, { id: `disciplina-${Date.now()}`, name: '', level: 0, powers: [createEmptyPower(), createEmptyPower(), createEmptyPower(), createEmptyPower(), createEmptyPower()] }])
  const usedDisciplineNames = new Set(disciplines.map((d) => d.name).filter(Boolean))
  const availableDisciplines = disciplineOptions.filter((name) => !usedDisciplineNames.has(name) || name === '')
  const attributeValues = Object.values(attributes)
  const attributePointsRemaining = remainingPoints(attributeValues, ATTRIBUTE_DISTRIBUTION)
  const attributesComplete = matchesDistribution(attributeValues, ATTRIBUTE_DISTRIBUTION)
  const selectedSkillDistribution = SKILL_DISTRIBUTIONS[skillMode]
  const skillValues = Object.values(skills)
  const skillPointsRemaining = remainingPoints(skillValues, selectedSkillDistribution)
  const skillsComplete = matchesDistribution(skillValues, selectedSkillDistribution)
  const disciplineDots = disciplines.reduce((total, discipline) => total + discipline.level, 0)
  const disciplinePointsRemaining = Math.max(0, 3 - disciplineDots)
  const creationAdjustment = CREATION_ADJUSTMENTS[creationType]
  const advantageLimit = 7 + creationAdjustment.advantageDots
  const flawMinimum = 2 + creationAdjustment.flawDots
  const advantageDots = merits.reduce((total, merit) => total + merit.level, 0)
  const flawDots = flaws.reduce((total, flaw) => total + flaw.level, 0)

  const setSkill = (name: string, value: number) => setSkills((current) => {
    const next = { ...current, [name]: value }
    return value <= (current[name] ?? 0) || fitsDistribution(Object.values(next), selectedSkillDistribution) ? next : current
  })

  const handleDisciplineLevelChange = (index: number, nextLevel: number) => {
    setDisciplines((current) => current.map((d, i) => {
      if (i !== index) return d
      const otherDots = current.reduce((total, discipline, disciplineIndex) => total + (disciplineIndex === index ? 0 : discipline.level), 0)
      if (characterType === 'PLAYER_VAMPIRE' && creationType !== 'THIN_BLOOD' && nextLevel > d.level && (otherDots + nextLevel > 3 || nextLevel > 2)) return d
      const trimmedPowers = [...(d.powers || [])].map(p => typeof p === 'string' ? { ...createEmptyPower(), name: p } : p)
      const adjustedPowers = trimmedPowers.slice(0, Math.max(nextLevel, 0))
      while (adjustedPowers.length < 5) adjustedPowers.push(createEmptyPower())
      return { ...d, level: nextLevel, powers: adjustedPowers }
    }))
  }

  async function saveDraft(message = 'Alterações salvas automaticamente.', redirectUrl?: string) {
    void message
    if (mode === 'edit' && (!characterId || !characterData?.character)) return null
    setSaving(true)
    const formData = formRef.current ? Object.fromEntries(new FormData(formRef.current).entries()) : {}
    
    // Constrói o objeto data com todos os valores do estado e do formulário
    const data = {
      characterType,
      creationType,
      skillMode,
      npc: { mode: npcMode, difficulty: npcDifficulty, ...npcPools },
      retainer: { ...retainer, domitorCharacterId: retainer.domitorCharacterId || null },
      // Identidade
      nome: nome || '',
      conceito: conceito || '',
      cla: cla || '',
      predador: predador || '',
      geracao: geracao || '',
      sire: sire || '',
      'potencia-de-sangue': String(bloodPotency || 0),
      'surto-de-sangue': formData['surto-de-sangue'] || '',
      'quantidade-recuperada': formData['quantidade-recuperada'] || '',
      'bonus-de-poder': formData['bonus-de-poder'] || '',
      'rerrolagem-de-sangue': formData['rerrolagem-de-sangue'] || '',
      'penalidade-de-alimentacao': formData['penalidade-de-alimentacao'] || '',
      'gravidade-da-perdicao': formData['gravidade-da-perdicao'] || '',
      'experiencia-total': totalXp,
      'experiencia-gasta': spentXp,
      'idade-verdadeira': idadeVerdadeira || '',
      'idade-aparente': idadeAparente || '',
      'dados-de-vida': dadosVida || '',
      'dados-da-morte': dadosMorte || '',
      
      // Atributos
      forca: String(attributes.forca || 1),
      destreza: String(attributes.destreza || 1),
      vigor: String(attributes.vigor || 1),
      carisma: String(attributes.carisma || 1),
      manipulacao: String(attributes.manipulacao || 1),
      compostura: String(attributes.compostura || 1),
      inteligencia: String(attributes.inteligencia || 1),
      raciocinio: String(attributes.raciocinio || 1),
      determinacao: String(attributes.determinacao || 1),
      
      // Habilidades
      ...Object.fromEntries(Object.entries(skills).map(([key, value]) => [`habilidade-${key}`, String(value)])),
      
      // Disciplinas
      disciplinas: disciplines.map(d => ({
        id: d.id,
        name: d.name,
        level: d.level,
        powers: d.powers.map(p => (typeof p === 'string' ? { ...createEmptyPower(), name: p } : p))
      })),
      
      // Recursos
      humanidade: String(resources.humanidade || 0),
      vontade: String(resources.vontade || 0),
      vitalidade: String(resources.vitalidade || 0),
      fome: String(resources.fome || 0),
      'convicoes-pilar-1': convictions[0]?.pilar || '',
      'convicoes-crenca-1': convictions[0]?.crenca || '',
      'convicoes-pilar-2': convictions[1]?.pilar || '',
      'convicoes-crenca-2': convictions[1]?.crenca || '',
      'convicoes-pilar-3': convictions[2]?.pilar || '',
      'convicoes-crenca-3': convictions[2]?.crenca || '',
      
      // Vantagens e Defeitos
      vantagens: merits.map(m => ({ name: m.name, level: m.level, description: m.description })),
      defeitos: flaws.map(f => ({ name: f.name, level: f.level, description: f.description })),
      pertences: possessions.map(p => ({ label: p.label, description: p.description, status: p.status })),
      
      // Histórico
      historico: formData['historico'] || '',
      notas: formData['notas'] || '',
    }
    
    const response = await fetch('/api/characters', {
      method: mode === 'edit' || characterId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: characterId,
        name: nome.trim() || characterData?.character?.name || 'Personagem sem nome',
        data,
      }),
    })
    if (!response.ok && response.status !== 401) {
      setSaving(false)
      return null
    }
    let savedCharacterId = characterId
    if (!characterId && response.ok) {
      const result = await response.json()
      savedCharacterId = result.id ?? null
      setCharacterId(savedCharacterId)
    }
    await new Promise((resolve) => window.setTimeout(resolve, 350))
    setSaving(false)
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2400)
    if (redirectUrl) {
      router.push(redirectUrl)
    }
    return savedCharacterId
  }

  async function validateSavedCharacter(id: string) {
    setValidating(true)
    setValidationError(null)
    const response = await fetch(`/api/characters/${id}/validate`, { method: 'POST' })
    const result = await response.json().catch(() => null)
    setValidating(false)
    if (!response.ok || !result) {
      setValidationError(result?.error ?? 'Não foi possível validar a ficha.')
      return null
    }
    setValidationReport(result as ValidationReport)
    return result as ValidationReport
  }

  async function handleValidate() {
    const id = await saveDraft('Rascunho salvo antes da validação.')
    if (id) await validateSavedCharacter(id)
  }

  async function handleSubmitForReview() {
    setSubmitting(true)
    setValidationError(null)
    const id = await saveDraft('Rascunho salvo antes do envio.')
    if (!id) {
      setSubmitting(false)
      return
    }
    const response = await fetch(`/api/characters/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'PENDING_REVIEW' }),
    })
    const result = await response.json().catch(() => null)
    setSubmitting(false)
    if (result?.report) setValidationReport(result.report as ValidationReport)
    if (!response.ok) {
      setValidationError(result?.error ?? 'Não foi possível enviar a ficha para revisão.')
      return
    }
    setCharacterStatus('PENDING_REVIEW')
  }

  async function changeTab(tab: TabId) {
    if (tab === activeTab || saving) return
    const didSave = await saveDraft()
    if (didSave) setActiveTab(tab)
  }

  return <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
    <div className="noise" aria-hidden="true" />
    <header className="sheet-header"><div className="flex items-center gap-4"><Link href="/characters" className="button-ghost inline-flex items-center gap-2" aria-label="Voltar para o arquivo"><ArrowLeft className="size-4" /> Arquivo</Link><div className="hidden border-l border-border pl-4 sm:block"><p className="eyebrow">Arquivos da Noite</p><p className="mt-1 text-xs text-muted-foreground">{mode === 'edit' ? 'Editar personagem' : 'Novo registro de criatura'}</p></div></div><div className="sigil" aria-hidden="true">AN</div></header>
    <div className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 lg:py-14">
      <div className="mb-8 flex flex-col justify-between gap-6 border-b border-border pb-8 sm:flex-row sm:items-end"><div><p className="eyebrow">Ficha nº 000 / em elaboração</p><h1 className="mt-3 font-serif text-4xl uppercase tracking-[0.08em] sm:text-6xl">{mode === 'edit' ? 'Editar personagem' : 'Criar personagem'}</h1><p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">Registre a identidade, os dons e as fraquezas da criatura que será confiada aos arquivos.</p></div><div className="flex items-center gap-3 text-xs text-muted-foreground"><span className="status active"><span className="status-dot" /> {characterStatusLabels[characterStatus]}</span><span>{saving ? 'Salvando...' : 'Pronto para editar'}</span></div></div>
      <form ref={formRef} onSubmit={(event) => { event.preventDefault(); void saveDraft('Ficha salva como rascunho.') }}>
        <div className="mb-6 border-b border-border" role="tablist" aria-label="Seções da ficha de personagem"><div className="flex gap-1 overflow-x-auto pb-px">{tabs.map((tab) => <button key={tab.id} type="button" role="tab" aria-selected={activeTab === tab.id} aria-controls={`panel-${tab.id}`} id={`tab-${tab.id}`} onClick={() => void changeTab(tab.id)} className={`whitespace-nowrap border-b-2 px-3 py-3 text-left font-mono text-[10px] uppercase tracking-[0.12em] transition-colors sm:px-4 ${activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'}`}>{tab.label}</button>)}</div></div>
        <div role="tabpanel" id={`panel-${activeTab}`} aria-labelledby={`tab-${activeTab}`}>
          {activeTab === 'disciplinas' && characterType === 'PLAYER_VAMPIRE' && <CreationHint complete={creationType !== 'THIN_BLOOD' && disciplinePointsRemaining === 0}>{creationType === 'THIN_BLOOD' ? 'Sangue-fraco não usa disciplinas comuns na criação. Consulte o Mestre sobre Alquimia Sangue-Fraco e méritos específicos.' : `Escolha duas disciplinas: uma com 2 pontos e outra com 1. Cada ponto exige um poder preenchido. ${disciplinePointsRemaining === 0 ? 'Distribuição concluída.' : `Restam ${disciplinePointsRemaining} pontos.`}`}</CreationHint>}
          {activeTab === 'recursos' && characterType === 'PLAYER_VAMPIRE' && <CreationHint>Comece com Humanidade 7 — ou 6 para Ancilla. Informe de uma a três convicções; cada crença precisa de um Pilar mortal diferente.</CreationHint>}
          {activeTab === 'vantagens' && characterType === 'PLAYER_VAMPIRE' && <CreationHint complete={advantageDots <= advantageLimit && flawDots >= flawMinimum}>Use até {advantageLimit} pontos de vantagens e pelo menos {flawMinimum} pontos de defeitos{creationType === 'ANCILLA' ? ' para Ancilla' : ''}. Vantagens: {advantageDots}/{advantageLimit}. Defeitos: {flawDots}/{flawMinimum} mínimos.</CreationHint>}
          {activeTab === 'identidade' && <section className="mb-6 border border-border bg-card p-5" aria-labelledby="tipo-ficha-titulo"><p id="tipo-ficha-titulo" className="eyebrow">Classificação da ficha</p><div className="sheet-grid sheet-grid-2 mt-4"><label className="sheet-field"><span>Tipo de ficha</span><select className="select" value={characterType} onChange={(event) => setCharacterType(event.target.value as CharacterType)}>{allowedCharacterTypes.map((value) => <option key={value} value={value}>{characterTypeLabels[value]}</option>)}</select></label><label className="sheet-field"><span>Perfil de criação</span><select className="select" value={creationType} onChange={(event) => setCreationType(event.target.value as CreationType)}>{Object.entries(creationTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div></section>}
          {activeTab === 'identidade' && characterType === 'HUMAN_NPC' && <section className="mb-6 border border-border bg-card p-5" aria-labelledby="npc-humano-titulo"><p className="eyebrow">Criação rápida</p><h2 id="npc-humano-titulo" className="mt-2 font-serif text-xl">NPC humano</h2><div className="sheet-grid sheet-grid-2 mt-4"><label className="sheet-field"><span>Modo</span><select className="select" value={npcMode} onChange={(event) => setNpcMode(event.target.value as typeof npcMode)}><option value="SIMPLE">Dificuldade simples</option><option value="POOLS">Paradas principais</option><option value="COMPLETE">Ficha completa</option></select></label>{npcMode === 'SIMPLE' && <label className="sheet-field"><span>Dificuldade (1 a 5)</span><input className="input" type="number" min="1" max="5" value={npcDifficulty} onChange={(event) => setNpcDifficulty(Number(event.target.value))} /></label>}</div>{npcMode !== 'SIMPLE' && <><div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"><label className="sheet-field flex-1"><span>Template</span><select className="select" value={npcTemplate} onChange={(event) => setNpcTemplate(event.target.value as keyof typeof HUMAN_NPC_TEMPLATES)}>{Object.entries(humanNpcTemplateLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><button type="button" className="button-ghost" onClick={() => { const preset = HUMAN_NPC_TEMPLATES[npcTemplate]; setNpcPools({ physicalPool: preset.physicalPool, socialPool: preset.socialPool, mentalPool: preset.mentalPool }); setResources((current) => ({ ...current, vitalidade: preset.health, vontade: preset.willpower })) }}>Aplicar template</button></div><div className="sheet-grid sheet-grid-3 mt-4">{([['physicalPool', 'Parada física'], ['socialPool', 'Parada social'], ['mentalPool', 'Parada mental']] as const).map(([key, label]) => <label key={key} className="sheet-field"><span>{label}</span><input className="input" type="number" min="1" value={npcPools[key]} onChange={(event) => setNpcPools((current) => ({ ...current, [key]: Number(event.target.value) }))} /></label>)}</div></>}</section>}
          {activeTab === 'identidade' && characterType === 'VAMPIRE_NPC' && <section className="mb-6 border border-border bg-card p-5" aria-labelledby="npc-vampiro-titulo"><p className="eyebrow">Criação rápida</p><h2 id="npc-vampiro-titulo" className="mt-2 font-serif text-xl">NPC vampiro</h2><p className="mt-2 text-sm text-muted-foreground">Use as paradas principais abaixo e complete clã, geração, Potência de Sangue e Humanidade na ficha.</p><div className="sheet-grid sheet-grid-3 mt-4">{([['physicalPool', 'Parada física'], ['socialPool', 'Parada social'], ['mentalPool', 'Parada mental']] as const).map(([key, label]) => <label key={key} className="sheet-field"><span>{label}</span><input className="input" type="number" min="1" value={npcPools[key]} onChange={(event) => setNpcPools((current) => ({ ...current, [key]: Number(event.target.value) }))} /></label>)}</div></section>}
          {activeTab === 'identidade' && characterType === 'RETAINER' && <section className="mb-6 border border-border bg-card p-5" aria-labelledby="retentor-titulo"><p className="eyebrow">Criação rápida</p><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><h2 id="retentor-titulo" className="mt-2 font-serif text-xl">Retentor ou carniçal</h2><button type="button" className="button-ghost" onClick={() => { setRetainer((current) => ({ ...current, isGhoul: true, disciplineLevel: GHOUL_TEMPLATE.disciplineLevel })); setNpcPools({ physicalPool: GHOUL_TEMPLATE.physicalPool, socialPool: GHOUL_TEMPLATE.socialPool, mentalPool: GHOUL_TEMPLATE.mentalPool }); setResources((current) => ({ ...current, vitalidade: GHOUL_TEMPLATE.health, vontade: GHOUL_TEMPLATE.willpower })) }}>Aplicar template de carniçal</button></div><div className="sheet-grid sheet-grid-2 mt-4"><label className="sheet-field"><span>Método de controle</span><select className="select" value={retainer.controlMethod} onChange={(event) => setRetainer((current) => ({ ...current, controlMethod: event.target.value }))}><option value="VITAE">Vitae</option><option value="PAYMENT">Pagamento</option><option value="LOYALTY">Lealdade</option><option value="COERCION">Coerção</option></select></label><label className="sheet-field"><span>Força do Laço de Sangue</span><input className="input" type="number" min="1" max="6" value={retainer.bondStrength} onChange={(event) => setRetainer((current) => ({ ...current, bondStrength: Number(event.target.value) }))} /></label><label className="sheet-field"><span>ID do domitor</span><input className="input" value={retainer.domitorCharacterId} onChange={(event) => setRetainer((current) => ({ ...current, domitorCharacterId: event.target.value }))} placeholder="UUID da ficha do domitor" /></label><label className="sheet-field"><span>Justificativa de vitae armazenada</span><input className="input" value={retainer.storedVitaeJustification} onChange={(event) => setRetainer((current) => ({ ...current, storedVitaeJustification: event.target.value }))} placeholder="Informe quando não houver domitor" /></label></div></section>}
          {activeTab === 'identidade' && <SheetSection title="Identidade" eyebrow="I / o nome antes da noite"><div className="sheet-grid sheet-grid-4"><Field label="Nome do personagem" name="nome" placeholder="Nome conhecido" className="span-2" value={nome} onChange={(e) => setNome(e.target.value)} /><Field label="Conceito" name="conceito" placeholder="O que define esta criatura?" className="span-2" value={conceito} onChange={(e) => setConceito(e.target.value)} /><Field label="Clã" name="cla" placeholder="Selecione" value={cla} onChange={(e) => setCla(e.target.value)} /><Field label="Predador" name="predador" placeholder="Instinto dominante" value={predador} onChange={(e) => setPredador(e.target.value)} /><Field label="Geração" name="geracao" placeholder="—" value={geracao} onChange={(e) => setGeracao(e.target.value)} /><Field label="Sire" name="sire" placeholder="Nome do criador" value={sire} onChange={(e) => setSire(e.target.value)} /></div><div className="identity-subsection"><div className="blood-heading"><h3>Potência de Sangue</h3>{dots(10, bloodPotency, setBloodPotency, 'potencia-de-sangue')}</div><div className="blood-grid">{[['Surto de Sangue', 'surto-de-sangue'], ['Quantidade Recuperada', 'quantidade-recuperada'], ['Bônus de Poder', 'bonus-de-poder'], ['Rerrolagem de Sangue', 'rerrolagem-de-sangue'], ['Penalidade de Alimentação', 'penalidade-de-alimentacao'], ['Gravidade da Perdição', 'gravidade-da-perdicao']].map(([label, name]) => <Field key={name} label={label} name={name} />)}</div><div className="experience-lines"><label className="sheet-field"><span>Experiência Total</span><input name="experiencia-total" type="number" min="0" value={totalXp} onChange={(event) => setTotalXp(event.target.value)} /></label><label className="sheet-field"><span>Experiência Gasta</span><input name="experiencia-gasta" type="number" min="0" value={spentXp} onChange={(event) => setSpentXp(event.target.value)} /></label><label className="sheet-field"><span>XP Disponível</span><input name="experiencia-disponivel" value={availableXp} readOnly aria-readonly="true" /></label></div><div className="sheet-grid sheet-grid-2 mt-4"><Field label="Idade Verdadeira" name="idade-verdadeira" value={idadeVerdadeira} onChange={(e) => setIdadeVerdadeira(e.target.value)} /><Field label="Idade Aparente" name="idade-aparente" value={idadeAparente} onChange={(e) => setIdadeAparente(e.target.value)} /></div><div className="sheet-grid sheet-grid-2 mt-6"><label className="sheet-field"><span>Dados de Vida</span><textarea name="dados-de-vida" rows={4} placeholder="Data de nascimento e a descrição do seu último dia de vida." value={dadosVida} onChange={(e) => setDadosVida(e.target.value)} /></label><label className="sheet-field"><span>Dados da Morte</span><textarea name="dados-da-morte" rows={4} placeholder="Data do Abraço e como você se tornou uma criatura da noite." value={dadosMorte} onChange={(e) => setDadosMorte(e.target.value)} /></label></div><CampaignLink characterId={characterId} onCampaignChange={() => void mutateCharacter()} /></div></SheetSection>}
          {activeTab === 'atributos' && <SheetSection title="Atributos" eyebrow="II / corpo, presença e mente"><CreationHint complete={attributesComplete}>Cada atributo começa com 1 ponto. Distribuição obrigatória: um atributo em 4, três em 3, quatro em 2 e um em 1. {attributesComplete ? 'Distribuição concluída.' : `Restam ${attributePointsRemaining} pontos; escolhas acima do limite são bloqueadas.`}</CreationHint><div className="attribute-columns">{[{ title: 'Físicos', items: [['forca', 'Força'], ['destreza', 'Destreza'], ['vigor', 'Vigor']] }, { title: 'Sociais', items: [['carisma', 'Carisma'], ['manipulacao', 'Manipulação'], ['compostura', 'Compostura']] }, { title: 'Mentais', items: [['inteligencia', 'Inteligência'], ['raciocinio', 'Raciocínio'], ['determinacao', 'Determinação']] }].map((group) => <div key={group.title} className="attribute-group"><h3>{group.title}</h3>{group.items.map(([key, label]) => <div className="attribute-row" key={key}><span>{label}</span>{dots(5, attributes[key as keyof typeof attributes], (value) => setAttribute(key as keyof typeof attributes, value))}</div>)}</div>)}</div></SheetSection>}
          {activeTab === 'habilidades' && <SheetSection title="Habilidades" eyebrow="III / aquilo que foi aprendido"><div className="mb-5 grid gap-3 sm:grid-cols-[minmax(0,240px)_1fr]"><label className="sheet-field"><span>Perfil de distribuição</span><select className="select" value={skillMode} onChange={(event) => setSkillMode(event.target.value as QuickSkillMode)}>{Object.entries(skillModeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><CreationHint complete={skillsComplete}>{skillMode === 'JACK_OF_ALL_TRADES' ? 'Generalista: uma habilidade em 3, oito em 2 e dez em 1.' : skillMode === 'BALANCED' ? 'Equilibrado: três habilidades em 3, cinco em 2 e sete em 1.' : 'Especialista: uma habilidade em 4, três em 3, três em 2 e três em 1.'} {skillsComplete ? 'Distribuição concluída.' : `Restam ${skillPointsRemaining} pontos; níveis fora do perfil são bloqueados.`}</CreationHint></div><div className={`skills-columns ${styles.skillColumns}`}>{skillGroups.map((group) => <div key={group.title} className={styles.skillGroup}><h3>{group.title}</h3><div className="skill-list">{group.skills.map((skill) => <label key={skill} className={`skill-row ${styles.skillRow}`}><span>{skill}</span>{dots(5, skills[skill] ?? 0, (value) => setSkill(skill, value), `habilidade-${skill.toLowerCase().replaceAll(' ', '-')}`)}</label>)}</div></div>)}</div></SheetSection>}
          {activeTab === 'disciplinas' && <SheetSection title="Disciplinas" eyebrow="IV / dons do sangue"><p className="mb-5 text-xs text-muted-foreground">Selecione a disciplina no menu e distribua os níveis clicando nas bolinhas. Adicione novas disciplinas com o botão abaixo.</p><div className="discipline-list">{disciplines.map((discipline, index) => { const usablePowerSlots = Math.max(discipline.level, 0); const isConfirmingThis = confirmingDiscipline?.index === index; const currentName = discipline.name || (isConfirmingThis ? confirmingDiscipline.name : ''); return <div key={discipline.id} className="discipline-card mb-10"><div className="discipline-card-header mb-4"><label className="sheet-field relative" style={{ flex: '1 1 220px' }}><span>Disciplina</span>{currentName ? <div className="input" style={{ display: 'flex', alignItems: 'center' }}><input type="hidden" name={`disciplina-${index}-nome`} value={currentName} />{currentName}</div> : <select name={`disciplina-${index}-nome`} value={discipline.name} className="select-placeholder" onChange={(event) => { const val = event.target.value; if (val) { setConfirmingDiscipline({ index, name: val }) } }}><option value="">Selecione...</option>{availableDisciplines.map((name) => <option key={name} value={name}>{name}</option>)}</select>}{isConfirmingThis && <div className="absolute left-0 top-0 z-20 flex w-full flex-col gap-3 border border-primary bg-[#131316] p-3 shadow-2xl" style={{ marginTop: '-4px' }}><p className="text-xs leading-relaxed text-[#f3c7b7]">Confirmar <strong>{confirmingDiscipline.name}</strong>?<br/>Ação irreversível.</p><div className="flex justify-end gap-2"><button type="button" onClick={() => setConfirmingDiscipline(null)} className="button-ghost" style={{ minHeight: '32px', padding: '0 12px', fontSize: '10px' }}>Cancelar</button><button type="button" onClick={() => { setDisciplines((current) => current.map((d, i) => i === index ? { ...d, name: confirmingDiscipline.name } : d)); setConfirmingDiscipline(null) }} className="button-primary" style={{ minHeight: '32px', padding: '0 12px', fontSize: '10px' }}>Confirmar</button></div></div>}</label>{dots(5, discipline.level, (value) => handleDisciplineLevelChange(index, value), `disciplina-${index}-nivel`)}</div>{usablePowerSlots === 0 ? <p className="mt-4 text-xs text-muted-foreground">Atribua pelo menos 1 ponto à disciplina para liberar os poderes.</p> : <div className="power-list w-full overflow-x-auto"><table className="w-full min-w-[900px] border-collapse text-left text-sm"><thead className="border-b border-border bg-muted/20 text-xs text-muted-foreground"><tr><th className="p-2 font-medium">Nível</th><th className="p-2 font-medium">Name</th><th className="p-2 font-medium">Effect</th><th className="p-2 font-medium">Cost</th><th className="p-2 font-medium">Prerequisite</th><th className="p-2 font-medium">Amalgam</th><th className="p-2 font-medium">Duration</th><th className="p-2 font-medium">Dice pool</th><th className="p-2 font-medium">Opposing pool</th><th className="p-2 font-medium">Additional Notes</th><th className="p-2 font-medium">Source</th></tr></thead><tbody className="divide-y divide-border border-b border-border">{Array.from({ length: usablePowerSlots }, (_, powerIndex) => { const p = typeof discipline.powers[powerIndex] === 'string' ? { ...createEmptyPower(), name: discipline.powers[powerIndex] } : (discipline.powers[powerIndex] as DisciplinePower) || createEmptyPower(); const updateField = (field: keyof DisciplinePower, val: string) => setDisciplines((current) => current.map((d, i) => i === index ? { ...d, powers: d.powers.map((pow, pi) => pi === powerIndex ? { ...(typeof pow === 'string' ? { ...createEmptyPower(), name: pow } : pow), [field]: val } : pow) } : d)); return <tr key={powerIndex} className="hover:bg-muted/5"><td className="p-2 font-bold text-muted-foreground">Nível {powerIndex + 1}</td><td className="p-1"><input className="w-full bg-transparent p-1 text-sm outline-none placeholder:text-muted-foreground/50 focus:bg-muted/20" name={`disciplina-${index}-poder-${powerIndex}-name`} value={p.name} onChange={(e) => updateField('name', e.target.value)} placeholder="Nome" /></td><td className="p-1"><input className="w-full bg-transparent p-1 text-sm outline-none placeholder:text-muted-foreground/50 focus:bg-muted/20" name={`disciplina-${index}-poder-${powerIndex}-effect`} value={p.effect} onChange={(e) => updateField('effect', e.target.value)} placeholder="Efeito" /></td><td className="p-1"><input className="w-full bg-transparent p-1 text-sm outline-none placeholder:text-muted-foreground/50 focus:bg-muted/20" name={`disciplina-${index}-poder-${powerIndex}-cost`} value={p.cost} onChange={(e) => updateField('cost', e.target.value)} placeholder="Custo" /></td><td className="p-1"><input className="w-full bg-transparent p-1 text-sm outline-none placeholder:text-muted-foreground/50 focus:bg-muted/20" name={`disciplina-${index}-poder-${powerIndex}-prereq`} value={p.prerequisite} onChange={(e) => updateField('prerequisite', e.target.value)} placeholder="Pré-requisito" /></td><td className="p-1"><input className="w-full bg-transparent p-1 text-sm outline-none placeholder:text-muted-foreground/50 focus:bg-muted/20" name={`disciplina-${index}-poder-${powerIndex}-amalgam`} value={p.amalgam} onChange={(e) => updateField('amalgam', e.target.value)} placeholder="Amálgama" /></td><td className="p-1"><input className="w-full bg-transparent p-1 text-sm outline-none placeholder:text-muted-foreground/50 focus:bg-muted/20" name={`disciplina-${index}-poder-${powerIndex}-duration`} value={p.duration} onChange={(e) => updateField('duration', e.target.value)} placeholder="Duração" /></td><td className="p-1"><input className="w-full bg-transparent p-1 text-sm outline-none placeholder:text-muted-foreground/50 focus:bg-muted/20" name={`disciplina-${index}-poder-${powerIndex}-dicepool`} value={p.dicePool} onChange={(e) => updateField('dicePool', e.target.value)} placeholder="Parada" /></td><td className="p-1"><input className="w-full bg-transparent p-1 text-sm outline-none placeholder:text-muted-foreground/50 focus:bg-muted/20" name={`disciplina-${index}-poder-${powerIndex}-opposing`} value={p.opposingPool} onChange={(e) => updateField('opposingPool', e.target.value)} placeholder="Parada oposta" /></td><td className="p-1"><input className="w-full bg-transparent p-1 text-sm outline-none placeholder:text-muted-foreground/50 focus:bg-muted/20" name={`disciplina-${index}-poder-${powerIndex}-notes`} value={p.additionalNotes} onChange={(e) => updateField('additionalNotes', e.target.value)} placeholder="Notas" /></td><td className="p-1"><input className="w-full bg-transparent p-1 text-sm outline-none placeholder:text-muted-foreground/50 focus:bg-muted/20" name={`disciplina-${index}-poder-${powerIndex}-source`} value={p.source} onChange={(e) => updateField('source', e.target.value)} placeholder="Fonte" /></td></tr>; })}</tbody></table></div>}</div>; })}</div><button type="button" onClick={addDiscipline} disabled={disciplines.length >= 7} className="button-ghost mt-4 inline-flex items-center gap-2"><Plus className="size-4" /> Adicionar disciplina</button></SheetSection>}
          {activeTab === 'recursos' && <SheetSection title="Recursos e convicções" eyebrow="V / o que ainda resta"><div className="sheet-grid sheet-grid-2">{resourceDefinitions.map((resource) => <div className="sheet-field" key={resource.name}><span>{resource.label}</span>{dots(resource.total, resources[resource.name], (value) => setResources((current) => ({ ...current, [resource.name]: value })), resource.name, true)}</div>)}</div><div className="mt-6 border-t border-border pt-6"><div className="blood-heading mb-4"><h3>Convicções e Pilares</h3></div><div className="sheet-grid sheet-grid-2">{[0, 1, 2].flatMap((index) => [<label key={`pilar-${index}`} className="sheet-field"><span>Pilar {index + 1}</span><input name={`convicoes-pilar-${index + 1}`} value={convictions[index]?.pilar ?? ''} onChange={(event) => { const val = event.target.value; setConvictions((current) => current.map((c, i) => i === index ? { ...c, pilar: val } : c)) }} placeholder={`Nome/descrição do Pilar ${index + 1}`} /></label>, <label key={`crenca-${index}`} className="sheet-field"><span>Crença Ligada {index + 1}</span><input name={`convicoes-crenca-${index + 1}`} value={convictions[index]?.crenca ?? ''} onChange={(event) => { const val = event.target.value; setConvictions((current) => current.map((c, i) => i === index ? { ...c, crenca: val } : c)) }} placeholder={`Crença associada ao Pilar ${index + 1}`} /></label>])}</div></div><div className="mt-6 border-t border-border pt-6"><label className="sheet-field"><span>Princípios da crônica</span><textarea value={characterData?.campaign?.principios ?? ''} readOnly rows={4} placeholder="Os princípios da mesa vinculada aparecerão aqui." /></label></div>{(!characterId || characterData) && !characterData?.campaign?.principios && <p className="mt-3 text-xs text-muted-foreground">Este personagem não está vinculado a uma mesa com princípios cadastrados.</p>}</SheetSection>}
          {activeTab === 'vantagens' && <SheetSection title="Vantagens e Defeitos" eyebrow="VII / o que soma e o que custa"><p className="mb-5 text-xs text-muted-foreground">Defina as vantagens e defeitos do personagem. Clique no ícone de texto para expandir a descrição.</p><div className="sheet-grid sheet-grid-2 gap-6"><div className="flex flex-col gap-3"><div className="blood-heading pb-2"><h3>Vantagens</h3></div>{merits.map((item, index) => <div key={index} className="flex flex-col gap-2 border border-border bg-[#101013] p-3"><div className="flex flex-wrap items-center justify-between gap-3"><input name={`vantagem-${index}-nome`} value={item.name} onChange={(e) => { const val = e.target.value; setMerits((current) => current.map((m, i) => i === index ? { ...m, name: val } : m)) }} placeholder={`Vantagem ${index + 1}`} className="input flex-1 min-w-[140px]" />{dots(5, item.level, (val) => setMerits((current) => current.map((m, i) => i === index ? { ...m, level: val } : m)), `vantagem-${index}-nivel`, true)}<button type="button" onClick={() => setMerits((current) => current.map((m, i) => i === index ? { ...m, expanded: !m.expanded } : m))} className={`button-ghost flex items-center justify-center ${item.description || item.expanded ? 'border-primary text-primary' : ''}`} style={{ minHeight: '38px', minWidth: '38px', padding: '0' }} title="Expandir/recolher descrição"><FileText className="size-4" /></button></div>{item.expanded && <div className="mt-2 border-t border-border pt-2"><label className="sheet-field"><span>Descrição</span><textarea name={`vantagem-${index}-descricao`} rows={2} value={item.description} onChange={(e) => { const val = e.target.value; setMerits((current) => current.map((m, i) => i === index ? { ...m, description: val } : m)) }} placeholder="Descrição da vantagem..." /></label></div>}</div>)}</div><div className="flex flex-col gap-3"><div className="blood-heading pb-2"><h3>Defeitos</h3></div>{flaws.map((item, index) => <div key={index} className="flex flex-col gap-2 border border-border bg-[#101013] p-3"><div className="flex flex-wrap items-center justify-between gap-3"><input name={`defeito-${index}-nome`} value={item.name} onChange={(e) => { const val = e.target.value; setFlaws((current) => current.map((f, i) => i === index ? { ...f, name: val } : f)) }} placeholder={`Defeito ${index + 1}`} className="input flex-1 min-w-[140px]" />{dots(5, item.level, (val) => setFlaws((current) => current.map((f, i) => i === index ? { ...f, level: val } : f)), `defeito-${index}-nivel`, true)}<button type="button" onClick={() => setFlaws((current) => current.map((f, i) => i === index ? { ...f, expanded: !f.expanded } : f))} className={`button-ghost flex items-center justify-center ${item.description || item.expanded ? 'border-primary text-primary' : ''}`} style={{ minHeight: '38px', minWidth: '38px', padding: '0' }} title="Expandir/recolher descrição"><FileText className="size-4" /></button></div>{item.expanded && <div className="mt-2 border-t border-border pt-2"><label className="sheet-field"><span>Descrição</span><textarea name={`defeito-${index}-descricao`} rows={2} value={item.description} onChange={(e) => { const val = e.target.value; setFlaws((current) => current.map((f, i) => i === index ? { ...f, description: val } : f)) }} placeholder="Descrição do defeito..." /></label></div>}</div>)}</div></div><div className="mt-10 border-t border-border pt-8"><div className="blood-heading mb-4"><h3>Pertences e Posses</h3></div><p className="mb-6 text-xs text-muted-foreground">Cadastre itens e equipamentos. Pertences submetidos aguardam aprovação do mestre. Itens concedidos pelo mestre são somente leitura.</p><div className="sheet-grid sheet-grid-2 gap-6"><div className="flex flex-col gap-4"><h4 className="font-mono text-xs uppercase tracking-wider text-[#d47776]">Seus Pertences</h4><div className="flex flex-col gap-3 border border-border bg-[#101013] p-4"><p className="text-[10px] font-mono font-semibold uppercase tracking-wider text-muted-foreground">Adicionar Novo Pertence</p><label className="sheet-field"><span>Item / Equipamento</span><input value={newPossessionLabel} onChange={(e) => setNewPossessionLabel(e.target.value)} placeholder="Ex.: Carro Sedan, Armamento, Celular Seguro" /></label><label className="sheet-field"><span>Descrição (opcional)</span><input value={newPossessionDesc} onChange={(e) => setNewPossessionDesc(e.target.value)} placeholder="Detalhes do item ou localização" /></label><button type="button" onClick={handleAddPossession} disabled={!newPossessionLabel.trim()} className="button-ghost mt-1 inline-flex items-center gap-2 self-start"><Plus className="size-4" /> Adicionar pertence</button></div><div className="mt-2 flex flex-col gap-3">{possessions.length === 0 ? <p className="text-xs italic text-muted-foreground">Nenhum pertence cadastrado.</p> : possessions.map((item, index) => <div key={index} className="flex flex-col gap-2 border border-border bg-[#151519] p-3.5"><input type="hidden" name={`pertence-${index}-label`} value={item.label} /><input type="hidden" name={`pertence-${index}-description`} value={item.description ?? ''} /><input type="hidden" name={`pertence-${index}-status`} value={item.status} /><div className="flex items-center justify-between gap-3"><span className="text-sm font-semibold">{item.label}</span>{item.status === 'aprovado' && <span className="status active"><span className="status-dot" /> Aprovado</span>}{item.status === 'reprovado' && <span className="status risk"><span className="status-dot" /> Reprovado</span>}{item.status === 'pendente' && <span className="status" style={{ borderColor: '#8a7332', color: '#e5c069' }}><span className="status-dot" /> Pendente</span>}</div>{item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}{item.masterComment && <div className="mt-1 border-t border-border/50 pt-2 text-xs text-[#d77a75]"><span className="font-semibold">Comentário do Mestre:</span> {item.masterComment}</div>}</div>)}</div></div><div className="flex flex-col gap-4"><h4 className="font-mono text-xs uppercase tracking-wider text-[#9ac59b]">Concedidos pelo Mestre</h4><div className="flex flex-col gap-3">{gmItems.length === 0 ? <div className="border border-dashed border-border p-4 text-center"><p className="text-xs italic text-muted-foreground">Nenhum item foi concedido pelo mestre ainda.</p></div> : gmItems.map((item, index) => <div key={index} className="flex flex-col gap-2 border border-[#456649]/40 bg-[#142016]/40 p-3.5"><input type="hidden" name={`gm-item-${index}-label`} value={item.label} /><input type="hidden" name={`gm-item-${index}-description`} value={item.description ?? ''} /><div className="flex items-center justify-between gap-3"><span className="text-sm font-semibold text-[#b5d9b7]">{item.label}</span><span className="status active"><span className="status-dot" /> Concedido pelo Mestre</span></div>{item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}{item.masterComment && <div className="mt-1 border-t border-[#456649]/30 pt-2 text-xs text-[#9ac59b]"><span className="font-semibold">Nota do Mestre:</span> {item.masterComment}</div>}</div>)}</div></div></div></div></SheetSection>}
          {activeTab === 'historico' && <SheetSection title="Histórico e notas" eyebrow="VI / aquilo que não deve ser esquecido"><div className="sheet-grid sheet-grid-2"><label className="sheet-field"><span>Histórico</span><textarea name="historico" rows={8} placeholder="A vida antes do Abraço, aliados e inimigos..." value={historico} onChange={(e) => setHistorico(e.target.value)} /></label><label className="sheet-field"><span>Notas do narrador</span><textarea name="notas" rows={8} placeholder="Segredos, ganchos e presságios..." value={notas} onChange={(e) => setNotas(e.target.value)} /></label></div></SheetSection>}
        </div>
        {(validationReport || validationError) && <section className="mt-6 border border-border bg-card p-5" aria-labelledby="relatorio-validacao-titulo" role={validationError || validationReport?.errors.length ? 'alert' : 'status'}><div className="flex items-start gap-3">{validationReport?.valid ? <ShieldCheck className="mt-0.5 size-5 text-muted-foreground" aria-hidden="true" /> : <AlertTriangle className="mt-0.5 size-5 text-primary" aria-hidden="true" />}<div className="min-w-0 flex-1"><p className="eyebrow">Validação mecânica</p><h2 id="relatorio-validacao-titulo" className="mt-2 font-serif text-xl">{validationError ?? (validationReport?.valid ? 'Ficha pronta para revisão' : 'Ajustes necessários')}</h2>{validationReport && <><dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-5"><div><dt className="text-muted-foreground">Vitalidade</dt><dd>{validationReport.derived.health ?? '—'}</dd></div><div><dt className="text-muted-foreground">Força de vontade</dt><dd>{validationReport.derived.willpower ?? '—'}</dd></div><div><dt className="text-muted-foreground">Humanidade</dt><dd>{validationReport.derived.humanity ?? '—'}</dd></div><div><dt className="text-muted-foreground">XP inicial</dt><dd>{validationReport.derived.initialXp}</dd></div><div><dt className="text-muted-foreground">Potência de Sangue</dt><dd>{validationReport.derived.bloodPotency ?? '—'}</dd></div></dl>{validationReport.errors.length > 0 && <ul className="mt-4 flex flex-col gap-2 text-sm">{validationReport.errors.map((issue) => <li key={`${issue.code}-${issue.field}`}><strong>{issue.field}:</strong> {issue.message}</li>)}</ul>}{validationReport.warnings.length > 0 && <div className="mt-4"><p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Avisos</p><ul className="mt-2 flex flex-col gap-2 text-sm text-muted-foreground">{validationReport.warnings.map((issue) => <li key={`${issue.code}-${issue.field}`}>{issue.message}</li>)}</ul></div>}</>}</div></div></section>}
        <div className="mt-6 flex flex-col justify-between gap-4 border-t border-border pt-6 sm:flex-row sm:items-center">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {activeTab !== 'identidade' ? (
              <button type="button" onClick={() => changeTab(tabs[tabs.findIndex((t) => t.id === activeTab) - 1].id)} className="button-ghost inline-flex items-center justify-center gap-2">
                <ArrowLeft className="size-4" /> Voltar
              </button>
            ) : (
              <Link href="/characters" className="button-ghost inline-flex items-center justify-center gap-2">
                <ArrowLeft className="size-4" /> Cancelar e retornar
              </Link>
            )}
          </div>
          <div className="flex items-center gap-3">
            {activeTab !== 'historico' ? (
              <button type="button" onClick={() => changeTab(tabs[tabs.findIndex((t) => t.id === activeTab) + 1].id)} className="button-primary inline-flex items-center justify-center gap-2">
                Avançar <ArrowLeft className="size-4 rotate-180" />
              </button>
            ) : (
              <><button type="submit" disabled={saving || submitting} className="button-ghost inline-flex items-center justify-center gap-2"><Save className="size-4" aria-hidden="true" /> Salvar rascunho</button><button type="button" onClick={() => void handleValidate()} disabled={saving || validating || submitting} className="button-ghost inline-flex items-center justify-center gap-2"><ShieldCheck className="size-4" aria-hidden="true" /> {validating ? 'Validando...' : 'Validar ficha'}</button><button type="button" onClick={() => void handleSubmitForReview()} disabled={saving || validating || submitting || characterStatus !== 'DRAFT'} className="button-primary inline-flex items-center justify-center gap-2"><Send className="size-4" aria-hidden="true" /> {submitting ? 'Enviando...' : 'Enviar para revisão'}</button></>
            )}
          </div>
        </div>
      </form>
    </div>
    {saved && <div className="sheet-save-note" role="status"><Check className="size-4" /> {saving ? 'Salvando alterações...' : 'Alterações salvas automaticamente.'}</div>}
    <div className="sheet-watermark" aria-hidden="true"><Skull className="size-56" /></div>
  </main>
}
