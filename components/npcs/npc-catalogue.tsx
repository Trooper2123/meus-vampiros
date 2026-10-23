'use client'

import { useRef, useState } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { NPC_CREATURES, NPC_ROLES, NPC_THREATS } from '@/lib/npc-options'
import type { NpcData } from '@/lib/npc-domain'
import { NpcEditor, EMPTY_NPC } from './npc-editor'
import { SheetMediaPanel } from '@/components/sheet-media-panel'

export async function npcJson(url: string, body?: object, method = 'POST') {
  const response = await fetch(url, body ? { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), cache: 'no-store' } : { cache: 'no-store' })
  const result = await response.json()
  if (!response.ok) throw Error(result.error ?? 'Não foi possível carregar o NPC.')
  return result
}

type Catalogue = { npcs: { id: string; name: string; sheetType: NpcData['sheetType']; creatureType: keyof typeof NPC_CREATURES; role: keyof typeof NPC_ROLES; threatLevel: number | null; status: string; revision: number }[]; total: number; page: number; campaigns: { id: string; name: string }[]; domitors: { id: string; name: string; campaign_id: string | null }[] }
const SHEET_TYPE_LABELS = { SIMPLE: 'Simples', INTERMEDIATE: 'Intermediária', FULL: 'Completa' } as const
const SHEET_TYPE_DESCRIPTIONS = {
  SIMPLE: 'Figurantes e encontros rápidos. Apenas ameaça, criatura e papel.',
  INTERMEDIATE: 'NPCs recorrentes com pools padrão, recursos e poderes especiais.',
  FULL: 'Ficha mecânica completa com atributos e habilidades reais. Abre o editor em nova aba.',
} as const

// Modal de criação com seleção de modalidade como primeiro passo
export function NewNpcModal({ campaignId }: Readonly<{ campaignId?: string }>) {
  const dialog = useRef<HTMLDialogElement>(null)
  const router = useRouter()
  const { data: catalog } = useSWR<{ templates: { id: string; name: string; originalName: string | null; official: boolean; source: string; data: NpcData }[] }>('/api/npc-templates', npcJson)
  const { data: context } = useSWR<Catalogue>('/api/npcs', npcJson)
  const [step, setStep] = useState<'type' | 'form'>('type')
  const [sheetType, setSheetType] = useState<NpcData['sheetType']>('SIMPLE')
  const [selected, setSelected] = useState('')
  const [campaign, setCampaign] = useState(campaignId ?? '')
  const [initial, setInitial] = useState<NpcData>(() => structuredClone(EMPTY_NPC))
  const [generation, setGeneration] = useState(0)
  const template = catalog?.templates.find(t => t.id === selected)

  function open() { setStep('type'); setSheetType('SIMPLE'); setSelected(''); setInitial(structuredClone(EMPTY_NPC)); setGeneration(0); dialog.current?.showModal() }
  function close() { dialog.current?.close() }
  function chooseType(type: NpcData['sheetType']) { setSheetType(type); setInitial(current => ({ ...current, sheetType: type })); setStep('form') }

  return <>
    <button type="button" className="button-primary" aria-haspopup="dialog" onClick={open}>Criar NPC</button>
    <dialog ref={dialog} aria-labelledby="npc-create-dialog-title" onCancel={close} className="m-auto max-h-[90dvh] w-[min(56rem,95vw)] overflow-y-auto border border-border bg-card p-5 text-foreground backdrop:bg-background/80">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <p className="eyebrow">Personagem do Narrador</p>
          <h2 id="npc-create-dialog-title" className="mt-2 font-serif text-2xl">
            {step === 'type' ? 'Que tipo de ficha será criada?' : `Nova ficha ${SHEET_TYPE_LABELS[sheetType]}`}
          </h2>
        </div>
        <button type="button" className="button-ghost" onClick={close}>Fechar</button>
      </div>

      {step === 'type' && (
        <div className="flex flex-col gap-4">
          {(['SIMPLE', 'INTERMEDIATE', 'FULL'] as const).map(type => (
            <button key={type} type="button" className="flex flex-col gap-1 border border-border bg-background p-4 text-left hover:border-primary transition-colors" onClick={() => chooseType(type)}>
              <span className="font-serif text-xl">{SHEET_TYPE_LABELS[type]}</span>
              <span className="text-sm text-muted-foreground">{SHEET_TYPE_DESCRIPTIONS[type]}</span>
            </button>
          ))}
        </div>
      )}

      {step === 'form' && (
        <div className="flex flex-col gap-5">
          <button type="button" className="button-ghost self-start" onClick={() => setStep('type')}>← Voltar ao tipo</button>
          {sheetType === 'FULL' && (
            <p className="border border-border bg-background p-4 text-sm text-muted-foreground">
              A ficha mecânica completa será aberta no editor em nova aba após criar o NPC. Preencha o nome e as informações básicas aqui.
            </p>
          )}
          <label className="sheet-field">
            <span>Modelo inicial</span>
            <select className="select" value={selected} onChange={e => {
              setSelected(e.target.value)
              const model = catalog?.templates.find(t => t.id === e.target.value)
              const base = structuredClone(model?.data ?? EMPTY_NPC)
              base.sheetType = sheetType
              setInitial(base); setGeneration(n => n + 1)
            }}>
              <option value="">Criar do zero</option>
              {catalog?.templates.filter(t => t.data.sheetType === sheetType || sheetType === 'FULL').map(t => (
                <option key={t.id} value={t.id}>{t.name} · {t.official ? 'Bloco oficial' : 'Personalizado'}</option>
              ))}
            </select>
          </label>
          {template && (
            <div className="border border-border p-4">
              <p className="font-serif text-xl">{template.name}{template.originalName && <> · <span lang="en">{template.originalName}</span></>}</p>
              <p className="mt-2 text-xs text-muted-foreground">{template.source}</p>
              <p className="mt-2 text-sm">O modelo é preservado; este formulário cria uma ficha independente.</p>
            </div>
          )}
          {!campaignId && (
            <label className="sheet-field">
              <span>Mesa inicial (opcional)</span>
              <select className="select" value={campaign} onChange={e => setCampaign(e.target.value)}>
                <option value="">Somente no catálogo</option>
                {context?.campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
          )}
          <NpcEditor
            key={generation}
            initial={{ ...initial, sheetType }}
            fixedSheetType
            domitors={context?.domitors.filter(d => !campaign || d.campaign_id === campaign)}
            submitLabel={sheetType === 'FULL' ? 'Criar e abrir editor de ficha' : 'Criar NPC'}
            onSave={async data => {
              const result = await npcJson('/api/npcs', { data, campaignId: campaign || null, templateId: selected || null, idempotencyKey: crypto.randomUUID() })
              if (sheetType === 'FULL') {
                window.open(`/npcs/${result.id}`, '_blank', 'noopener')
                close()
              } else {
                router.push(`/npcs/${result.id}`)
              }
            }}
          />
        </div>
      )}
    </dialog>
  </>
}

// Mantém NewNpcForm como alias para compatibilidade com /campaigns/[id]/npcs/new
export function NewNpcForm({ campaignId }: Readonly<{ campaignId?: string }>) {
  const router = useRouter()
  const { data: catalog } = useSWR<{ templates: { id: string; name: string; originalName: string | null; official: boolean; source: string; data: NpcData }[] }>('/api/npc-templates', npcJson)
  const { data: context } = useSWR<Catalogue>('/api/npcs', npcJson)
  const [sheetType, setSheetType] = useState<NpcData['sheetType']>('SIMPLE')
  const [selected, setSelected] = useState('')
  const [campaign] = useState(campaignId ?? '')
  const [initial, setInitial] = useState<NpcData>(() => structuredClone(EMPTY_NPC))
  const [generation, setGeneration] = useState(0)
  const template = catalog?.templates.find(t => t.id === selected)

  if (!campaignId) {
    // Sem campaignId a rota /npcs usa o modal
    return <NewNpcModal />
  }

  // Com campaignId (rota de campanha) usa formulário inline sem modal
  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">Escolha o tipo de ficha para este NPC:</p>
        <div className="flex flex-wrap gap-3">
          {(['SIMPLE', 'INTERMEDIATE', 'FULL'] as const).map(type => (
            <button key={type} type="button" className={sheetType === type ? 'button-primary' : 'button-ghost'} onClick={() => { setSheetType(type); setInitial(current => ({ ...current, sheetType: type })); setGeneration(n => n + 1) }}>
              {SHEET_TYPE_LABELS[type]}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">{SHEET_TYPE_DESCRIPTIONS[sheetType]}</p>
      </div>
      <label className="sheet-field">
        <span>Modelo inicial</span>
        <select className="select" value={selected} onChange={e => {
          setSelected(e.target.value)
          const model = catalog?.templates.find(t => t.id === e.target.value)
          const base = structuredClone(model?.data ?? EMPTY_NPC)
          base.sheetType = sheetType
          setInitial(base); setGeneration(n => n + 1)
        }}>
          <option value="">Criar do zero</option>
          {catalog?.templates.map(t => <option key={t.id} value={t.id}>{t.name} · {t.official ? 'Bloco oficial' : 'Personalizado'}</option>)}
        </select>
      </label>
      {template && (
        <div className="border border-border p-4">
          <p className="font-serif text-xl">{template.name}{template.originalName && <> · <span lang="en">{template.originalName}</span></>}</p>
          <p className="mt-2 text-xs text-muted-foreground">{template.source}</p>
          <p className="mt-2 text-sm">O modelo é preservado; este formulário cria uma ficha independente.</p>
        </div>
      )}
      <NpcEditor
        key={generation}
        initial={{ ...initial, sheetType }}
        fixedSheetType
        domitors={context?.domitors.filter(d => !campaign || d.campaign_id === campaign)}
        submitLabel={sheetType === 'FULL' ? 'Criar e abrir editor de ficha' : 'Criar NPC'}
        onSave={async data => {
          const result = await npcJson('/api/npcs', { data, campaignId: campaign || null, templateId: selected || null, idempotencyKey: crypto.randomUUID() })
          if (sheetType === 'FULL') {
            window.open(`/npcs/${result.id}`, '_blank', 'noopener')
            router.push(`/npcs/${result.id}`)
          } else {
            router.push(`/npcs/${result.id}`)
          }
        }}
      />
    </section>
  )
}

export function NpcCatalogue({ campaignId }: Readonly<{ campaignId?: string }>) {
  const [filters, setFilters] = useState({ query: '', creatureType: '', role: '', sheetType: '', threatLevel: '', status: 'ACTIVE', page: 1 })
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const params = new URLSearchParams({ ...filters, page: String(filters.page), ...(campaignId ? { campaignId } : {}) } as Record<string, string>)
  const { data, error, mutate } = useSWR<Catalogue>(`/api/npcs?${params}`, npcJson, { revalidateOnFocus: false })
  function filter(key: string, value: string) { setFilters(current => ({ ...current, [key]: value, page: 1 })) }
  async function change(id: string, revision: number, action: string) {
    setBusy(true); setMessage('')
    try { await npcJson(`/api/npcs/${id}`, { action, expectedRevision: revision, idempotencyKey: crypto.randomUUID() }, 'PATCH'); await mutate(); setMessage(action === 'SAVE_TEMPLATE' ? 'Modelo salvo.' : 'NPC atualizado.') }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível atualizar.') }
    finally { setBusy(false) }
  }
  return (
    <div className="flex flex-col gap-6">
      {/* Botão de criação via modal */}
      <div className="flex items-center gap-4">
        <NewNpcModal campaignId={campaignId} />
      </div>

      {/* Filtros */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="sheet-field"><span>Pesquisar NPCs</span><input maxLength={120} value={filters.query} onChange={e => filter('query', e.target.value)} /></label>
        <label className="sheet-field"><span>Criatura</span><select className="select" value={filters.creatureType} onChange={e => filter('creatureType', e.target.value)}><option value="">Todas</option>{Object.entries(NPC_CREATURES).map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></label>
        <label className="sheet-field"><span>Papel</span><select className="select" value={filters.role} onChange={e => filter('role', e.target.value)}><option value="">Todos</option>{Object.entries(NPC_ROLES).map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></label>
        <label className="sheet-field"><span>Modalidade</span><select className="select" value={filters.sheetType} onChange={e => filter('sheetType', e.target.value)}><option value="">Todas</option><option value="SIMPLE">Simples</option><option value="INTERMEDIATE">Intermediária</option><option value="FULL">Completa</option></select></label>
        <label className="sheet-field"><span>Ameaça narrativa</span><select className="select" value={filters.threatLevel} onChange={e => filter('threatLevel', e.target.value)}><option value="">Todas</option>{NPC_THREATS.map((name, i) => <option key={name} value={i + 1}>{i + 1} · {name}</option>)}</select></label>
        <label className="sheet-field"><span>Status</span><select className="select" value={filters.status} onChange={e => filter('status', e.target.value)}><option value="ACTIVE">Ativos</option><option value="ARCHIVED">Arquivados</option><option value="ALL">Todos</option></select></label>
      </div>

      {error && <p role="alert" className="text-sm text-primary">{error.message}</p>}
      {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}

      {/* Cards */}
      <div className="grid gap-4 lg:grid-cols-2">
        {data?.npcs.map(npc => (
          <article key={npc.id} className="character-card flex flex-col gap-3">
            <div className="flex gap-4">
              {/* Retrato compacto */}
              <div className="shrink-0">
                <SheetMediaPanel compact subjectType="NPC" subjectId={npc.id} />
              </div>
              <div className="flex flex-col gap-1 min-w-0">
                <h2 className="font-serif text-2xl">{npc.name}</h2>
                <p className="text-sm text-muted-foreground">{NPC_CREATURES[npc.creatureType]} · {NPC_ROLES[npc.role]}</p>
                <p className="text-sm text-muted-foreground">{SHEET_TYPE_LABELS[npc.sheetType]} · {npc.status === 'ACTIVE' ? 'Ativo' : 'Arquivado'}</p>
                {npc.threatLevel && <p className="text-sm">Ameaça {npc.threatLevel} · {NPC_THREATS[npc.threatLevel - 1]}</p>}
              </div>
            </div>
            <div className="flex flex-wrap gap-3 border-t border-border pt-4">
              <Link href={`/npcs/${npc.id}`} className="button-primary">Visualizar e editar</Link>
              <button className="button-ghost" disabled={busy} onClick={() => void change(npc.id, npc.revision, 'SAVE_TEMPLATE')}>Salvar como modelo</button>
              <button className="button-ghost" disabled={busy} onClick={() => void change(npc.id, npc.revision, npc.status === 'ACTIVE' ? 'ARCHIVE' : 'RESTORE')}>{npc.status === 'ACTIVE' ? 'Arquivar' : 'Restaurar'}</button>
            </div>
          </article>
        ))}
      </div>
      {data?.npcs.length === 0 && <p className="empty-state">Nenhum NPC encontrado. Crie uma ficha ou ajuste os filtros.</p>}
      <div className="flex flex-wrap items-center gap-4">
        <button className="button-ghost" disabled={filters.page === 1} onClick={() => setFilters({ ...filters, page: filters.page - 1 })}>Anterior</button>
        <p className="text-sm">Página {filters.page} · {data?.total ?? 0} NPCs</p>
        <button className="button-ghost" disabled={filters.page * 30 >= (data?.total ?? 0)} onClick={() => setFilters({ ...filters, page: filters.page + 1 })}>Próxima</button>
      </div>
    </div>
  )
}
