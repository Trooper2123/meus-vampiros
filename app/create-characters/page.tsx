'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, Check, Link2, Plus, Save, Skull, Unlink } from 'lucide-react'
import { Suspense, useRef, useState } from 'react'
import useSWR from 'swr'
import styles from './skills.module.css'

const fetcher = (url: string) => fetch(url).then((response) => response.json())

const tabs = [
  { id: 'identidade', label: 'Identidade', eyebrow: 'I / o nome antes da noite' },
  { id: 'atributos', label: 'Atributos', eyebrow: 'II / corpo, presença e mente' },
  { id: 'habilidades', label: 'Habilidades', eyebrow: 'III / aquilo que foi aprendido' },
  { id: 'disciplinas', label: 'Disciplinas', eyebrow: 'IV / dons do sangue' },
  { id: 'recursos', label: 'Recursos e convicções', eyebrow: 'V / o que ainda resta' },
  { id: 'historico', label: 'Histórico e notas', eyebrow: 'VI / aquilo que não deve ser esquecido' },
] as const

type TabId = (typeof tabs)[number]['id']

const disciplineOptions = ['Animalismo', 'Auspícios', 'Rapidez', 'Dominação', 'Feitiçaria de Sangue', 'Fortitude', 'Oblívio', 'Ofuscação', 'Potência', 'Presença', 'Proteanismo']
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

function Field({ label, name, placeholder, className = '' }: { label: string; name: string; placeholder?: string; className?: string }) {
  return <label className={`sheet-field ${className}`}><span>{label}</span><input name={name} placeholder={placeholder} /></label>
}

function SheetSection({ title, eyebrow, children }: { title: string; eyebrow?: string; children: React.ReactNode }) {
  return <section className="sheet-section"><div className="sheet-section-heading"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h2>{title}</h2></div><span className="section-mark" aria-hidden="true">✦</span></div>{children}</section>
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

export default function CriarPersonagemPage() {
  return <Suspense fallback={null}>
    <CriarPersonagemForm />
  </Suspense>
}

function CriarPersonagemForm() {
  const searchParams = useSearchParams()
  const idFromUrl = searchParams?.get('id') ?? null
  const [activeTab, setActiveTab] = useState<TabId>('identidade')
  const [attributes, setAttributes] = useState({ forca: 1, destreza: 1, vigor: 1, carisma: 1, manipulacao: 1, compostura: 1, inteligencia: 1, raciocinio: 1, determinacao: 1 })
  const [bloodPotency, setBloodPotency] = useState(0)
  const skillGroups = [
    { title: 'Físicas', skills: ['Armas brancas', 'Armas de fogo', 'Atletismo', 'Briga', 'Condução', 'Furtividade', 'Ladroagem', 'Ofícios', 'Sobrevivência'] },
    { title: 'Sociais', skills: ['Empatia com animais', 'Etiqueta', 'Intimidação', 'Liderança', 'Manha', 'Performance', 'Persuasão', 'Sagacidade', 'Subterfúgio'] },
    { title: 'Intelectuais', skills: ['Ciência', 'Erudição', 'Finanças', 'Investigação', 'Medicina', 'Ocultismo', 'Percepção', 'Política', 'Tecnologia'] },
  ]
  const [skills, setSkills] = useState<Record<string, number>>({})
  const [disciplines, setDisciplines] = useState([
    { id: 'disciplina-1', name: 'Dominação', level: 0, powers: ['', '', '', '', ''], effects: ['', '', '', '', ''] },
    { id: 'disciplina-2', name: 'Potência', level: 0, powers: ['', '', '', '', ''], effects: ['', '', '', '', ''] },
    { id: 'disciplina-3', name: 'Auspícios', level: 0, powers: ['', '', '', '', ''], effects: ['', '', '', '', ''] },
  ])
  const [resources, setResources] = useState({ humanidade: 0, vontade: 0, vitalidade: 0, fome: 1 })
  const [totalXp, setTotalXp] = useState('')
  const [spentXp, setSpentXp] = useState('')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [characterId, setCharacterId] = useState<string | null>(idFromUrl)
  const { data: characterData, mutate: mutateCharacter } = useSWR<{ campaign?: { principios: string | null } | null }>(characterId ? `/api/characters?id=${characterId}` : null, fetcher)
  const formRef = useRef<HTMLFormElement>(null)
  const setAttribute = (name: keyof typeof attributes, value: number) => setAttributes((current) => ({ ...current, [name]: value }))
  const availableXp = Math.max(0, (Number.parseInt(totalXp, 10) || 0) - (Number.parseInt(spentXp, 10) || 0))
  const addDiscipline = () => setDisciplines((current) => current.length >= 7 ? current : [...current, { id: `disciplina-${Date.now()}`, name: '', level: 0, powers: ['', '', '', '', ''], effects: ['', '', '', '', ''] }])

  async function saveDraft(message = 'Alterações salvas automaticamente.') {
    setSaving(true)
    const formData = formRef.current ? Object.fromEntries(new FormData(formRef.current).entries()) : {}
    const response = await fetch('/api/characters', {
      method: characterId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: characterId, name: formData.nome || 'Personagem sem nome', data: formData }),
    })
    if (!response.ok && response.status !== 401) {
      setSaving(false)
      return false
    }
    if (!characterId && response.ok) {
      const result = await response.json()
      setCharacterId(result.id ?? null)
    }
    await new Promise((resolve) => window.setTimeout(resolve, 350))
    setSaving(false)
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2400)
    return true
  }

  async function changeTab(tab: TabId) {
    if (tab === activeTab || saving) return
    const didSave = await saveDraft()
    if (didSave) setActiveTab(tab)
  }

  return <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
    <div className="noise" aria-hidden="true" />
    <header className="sheet-header"><div className="flex items-center gap-4"><Link href="/" className="button-ghost inline-flex items-center gap-2" aria-label="Voltar para o arquivo"><ArrowLeft className="size-4" /> Arquivo</Link><div className="hidden border-l border-border pl-4 sm:block"><p className="eyebrow">Arquivos da Noite</p><p className="mt-1 text-xs text-muted-foreground">Novo registro de criatura</p></div></div><div className="sigil" aria-hidden="true">AN</div></header>
    <div className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 lg:py-14">
      <div className="mb-8 flex flex-col justify-between gap-6 border-b border-border pb-8 sm:flex-row sm:items-end"><div><p className="eyebrow">Ficha nº 000 / em elaboração</p><h1 className="mt-3 font-serif text-4xl uppercase tracking-[0.08em] sm:text-6xl">Criar personagem</h1><p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">Registre a identidade, os dons e as fraquezas da criatura que será confiada aos arquivos.</p></div><div className="flex items-center gap-3 text-xs text-muted-foreground"><span className="status active"><span className="status-dot" /> Rascunho</span><span>{saving ? 'Salvando...' : 'Pronto para editar'}</span></div></div>
      <form ref={formRef} onSubmit={(event) => { event.preventDefault(); void saveDraft('Ficha selada como rascunho.') }}>
        <div className="mb-6 border-b border-border" role="tablist" aria-label="Seções da ficha de personagem"><div className="flex gap-1 overflow-x-auto pb-px">{tabs.map((tab) => <button key={tab.id} type="button" role="tab" aria-selected={activeTab === tab.id} aria-controls={`panel-${tab.id}`} id={`tab-${tab.id}`} onClick={() => void changeTab(tab.id)} className={`whitespace-nowrap border-b-2 px-3 py-3 text-left font-mono text-[10px] uppercase tracking-[0.12em] transition-colors sm:px-4 ${activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'}`}>{tab.label}</button>)}</div></div>
        <div role="tabpanel" id={`panel-${activeTab}`} aria-labelledby={`tab-${activeTab}`}>
          {activeTab === 'identidade' && <SheetSection title="Identidade" eyebrow="I / o nome antes da noite"><div className="sheet-grid sheet-grid-4"><Field label="Nome do personagem" name="nome" placeholder="Nome conhecido" className="span-2" /><Field label="Conceito" name="conceito" placeholder="O que define esta criatura?" className="span-2" /><Field label="Clã" name="cla" placeholder="Selecione" /><Field label="Predador" name="predador" placeholder="Instinto dominante" /><Field label="Geração" name="geracao" placeholder="—" /><Field label="Sire" name="sire" placeholder="Nome do criador" /></div><div className="identity-subsection"><div className="blood-heading"><h3>Potência de Sangue</h3>{dots(10, bloodPotency, setBloodPotency, 'potencia-de-sangue')}</div><div className="blood-grid">{[['Surto de Sangue', 'surto-de-sangue'], ['Quantidade Recuperada', 'quantidade-recuperada'], ['Bônus de Poder', 'bonus-de-poder'], ['Rerrolagem de Sangue', 'rerrolagem-de-sangue'], ['Penalidade de Alimentação', 'penalidade-de-alimentacao'], ['Gravidade da Perdição', 'gravidade-da-perdicao']].map(([label, name]) => <Field key={name} label={label} name={name} />)}</div><div className="experience-lines"><label className="sheet-field"><span>Experiência Total</span><input name="experiencia-total" type="number" min="0" value={totalXp} onChange={(event) => setTotalXp(event.target.value)} /></label><label className="sheet-field"><span>Experiência Gasta</span><input name="experiencia-gasta" type="number" min="0" value={spentXp} onChange={(event) => setSpentXp(event.target.value)} /></label><label className="sheet-field"><span>XP Disponível</span><input name="experiencia-disponivel" value={availableXp} readOnly aria-readonly="true" /></label></div><div className="sheet-grid sheet-grid-2 mt-4"><Field label="Idade Verdadeira" name="idade-verdadeira" /><Field label="Idade Aparente" name="idade-aparente" /></div><div className="sheet-grid sheet-grid-2 mt-6"><label className="sheet-field"><span>Dados de Vida</span><textarea name="dados-de-vida" rows={4} placeholder="Data de nascimento e a descrição do seu último dia de vida." /></label><label className="sheet-field"><span>Dados da Morte</span><textarea name="dados-da-morte" rows={4} placeholder="Data do Abraço e como você se tornou uma criatura da noite." /></label></div><CampaignLink characterId={characterId} onCampaignChange={() => void mutateCharacter()} /></div></SheetSection>}
          {activeTab === 'atributos' && <SheetSection title="Atributos" eyebrow="II / corpo, presença e mente"><p className="mb-5 text-xs text-muted-foreground">Distribua os pontos clicando nas marcas. Cada atributo começa com um ponto.</p><div className="attribute-columns">{[{ title: 'Físicos', items: [['forca', 'Força'], ['destreza', 'Destreza'], ['vigor', 'Vigor']] }, { title: 'Sociais', items: [['carisma', 'Carisma'], ['manipulacao', 'Manipulação'], ['compostura', 'Compostura']] }, { title: 'Mentais', items: [['inteligencia', 'Inteligência'], ['raciocinio', 'Raciocínio'], ['determinacao', 'Determinação']] }].map((group) => <div key={group.title} className="attribute-group"><h3>{group.title}</h3>{group.items.map(([key, label]) => <div className="attribute-row" key={key}><span>{label}</span>{dots(5, attributes[key as keyof typeof attributes], (value) => setAttribute(key as keyof typeof attributes, value))}</div>)}</div>)}</div></SheetSection>}
          {activeTab === 'habilidades' && <SheetSection title="Habilidades" eyebrow="III / aquilo que foi aprendido"><p className="mb-5 text-xs text-muted-foreground">Distribua os níveis clicando nas bolinhas de cada habilidade.</p><div className={styles.skillColumns}>{skillGroups.map((group) => <div key={group.title} className={styles.skillGroup}><h3>{group.title}</h3><div className="skill-list">{group.skills.map((skill) => <label key={skill} className={`skill-row ${styles.skillRow}`}><span>{skill}</span>{dots(5, skills[skill] ?? 0, (value) => setSkills((current) => ({ ...current, [skill]: value })), `habilidade-${skill.toLowerCase().replaceAll(' ', '-')}`)}</label>)}</div></div>)}</div></SheetSection>}
          {activeTab === 'disciplinas' && <SheetSection title="Disciplinas" eyebrow="IV / dons do sangue"><p className="mb-5 text-xs text-muted-foreground">Distribua os níveis clicando nas bolinhas de cada disciplina. Adicione novas disciplinas com o botão abaixo.</p><div className="discipline-list">{disciplines.map((discipline, index) => <div key={discipline.id} className="discipline-card"><div className="discipline-header"><label className="sheet-field"><span>Disciplina</span><input name={`disciplina-${index}-nome`} value={discipline.name} onChange={(event) => setDisciplines((current) => current.map((d, i) => i === index ? { ...d, name: event.target.value } : d))} placeholder="Selecione" /></label>{dots(5, discipline.level, (value) => setDisciplines((current) => current.map((d, i) => i === index ? { ...d, level: value } : d)), `disciplina-${index}-nivel`)}</div><div className="discipline-subsection"><h4>Poderes</h4>{Array.from({ length: 5 }, (_, powerIndex) => <label key={powerIndex} className="sheet-field"><span>Poder {powerIndex + 1}</span><input name={`disciplina-${index}-poder-${powerIndex}`} value={discipline.powers[powerIndex]} onChange={(event) => setDisciplines((current) => current.map((d, i) => i === index ? { ...d, powers: d.powers.map((p, pi) => pi === powerIndex ? event.target.value : p) } : d))} placeholder="Nome do poder" /></label>)}</div><div className="discipline-subsection"><h4>Efeitos</h4>{Array.from({ length: 5 }, (_, effectIndex) => <label key={effectIndex} className="sheet-field"><span>Efeito {effectIndex + 1}</span><input name={`disciplina-${index}-efeito-${effectIndex}`} value={discipline.effects[effectIndex]} onChange={(event) => setDisciplines((current) => current.map((d, i) => i === index ? { ...d, effects: d.effects.map((e, ei) => ei === effectIndex ? event.target.value : e) } : d))} placeholder="Descrição do efeito" /></label>)}</div></div>)}</div><button type="button" onClick={addDiscipline} disabled={disciplines.length >= 7} className="button-ghost mt-4 inline-flex items-center gap-2"><Plus className="size-4" /> Adicionar disciplina</button></SheetSection>}
          {activeTab === 'recursos' && <SheetSection title="Recursos e convicções" eyebrow="V / o que ainda resta"><div className="sheet-grid sheet-grid-2">{resourceDefinitions.map((resource) => <div className="sheet-field" key={resource.name}><span>{resource.label}</span>{dots(resource.total, resources[resource.name], (value) => setResources((current) => ({ ...current, [resource.name]: value })), resource.name, resource.name === 'fome')}</div>)}</div><div className="sheet-grid sheet-grid-2 mt-6"><label className="sheet-field"><span>Convicções</span><textarea name="conviccoes" rows={4} placeholder="O que ainda sustenta sua alma?" /></label><label className="sheet-field"><span>Princípios da crônica</span><textarea value={characterData?.campaign?.principios ?? ''} readOnly rows={4} placeholder="Os princípios da mesa vinculada aparecerão aqui." /></label></div>{(!characterId || characterData) && !characterData?.campaign?.principios && <p className="mt-3 text-xs text-muted-foreground">Este personagem não está vinculado a uma mesa com princípios cadastrados.</p>}</SheetSection>}
          {activeTab === 'historico' && <SheetSection title="Histórico e notas" eyebrow="VI / aquilo que não deve ser esquecido"><div className="sheet-grid sheet-grid-2"><label className="sheet-field"><span>Histórico</span><textarea name="historico" rows={8} placeholder="A vida antes do Abraço, aliados e inimigos..." /></label><label className="sheet-field"><span>Notas do narrador</span><textarea name="notas" rows={8} placeholder="Segredos, ganchos e presságios..." /></label></div></SheetSection>}
        </div>
        <div className="mt-6 flex flex-col justify-between gap-4 border-t border-border pt-6 sm:flex-row sm:items-center"><Link href="/" className="button-ghost inline-flex items-center justify-center gap-2"><ArrowLeft className="size-4" /> Cancelar e retornar</Link><button type="submit" className="button-primary inline-flex items-center justify-center gap-2"><Save className="size-4" /> Selar ficha</button></div>
      </form>
    </div>
    {saved && <div className="sheet-save-note" role="status"><Check className="size-4" /> {saving ? 'Salvando alterações...' : 'Alterações salvas automaticamente.'}</div>}
    <div className="sheet-watermark" aria-hidden="true"><Skull className="size-56" /></div>
  </main>
}
