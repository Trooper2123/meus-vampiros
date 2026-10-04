'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Check, Copy, Plus, CalendarDays, Users } from 'lucide-react'
import Link from 'next/link'
import { DateAvailabilityCalendar } from '@/components/date-availability-calendar'

export type CampaignSummary = {
  id: string
  name: string
  theme: string | null
  principios: string | null
  status: string
  lastSessionAt: string | null
  playerCount: number
}

type ReminderData = { entries?: { date: string; status: string; suggested: boolean }[] }

const fetcher = (url: string) => fetch(url).then((response) => response.json())

function MasterReminderItem({ campaign }: { campaign: CampaignSummary }) {
  const { data } = useSWR<ReminderData>(`/api/campaign-availability?campaignId=${campaign.id}`, fetcher)
  const suggested = (data?.entries ?? []).filter((entry) => entry.suggested).sort((a, b) => a.date.localeCompare(b.date))[0]
  if (!suggested) return null
  const confirmed = (data?.entries ?? []).filter((entry) => entry.date === suggested.date && entry.status === 'disponível').length
  return <Link href={`/campaigns/${campaign.id}`} className="border border-border p-4 transition-colors hover:border-primary"><p className="font-semibold">{campaign.name}</p><p className="mt-2 font-mono text-xs uppercase text-primary">{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(new Date(`${suggested.date}T12:00:00`))}</p><p className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground"><Users className="size-3.5" aria-hidden="true" /> {confirmed} confirmação{confirmed === 1 ? '' : 'ões'}</p></Link>
}

function MasterReminders({ campaigns }: { campaigns: CampaignSummary[] }) {
  return <section className="border border-border bg-card p-5" aria-labelledby="master-reminders-title"><div className="flex items-center justify-between gap-4 border-b border-border pb-3"><div><p className="eyebrow">Visão rápida</p><h3 id="master-reminders-title" className="mt-1 font-serif text-2xl uppercase tracking-[0.06em]">Próximas mesas</h3></div><CalendarDays className="size-5 text-primary" aria-hidden="true" /></div><div className="grid gap-3 pt-4 sm:grid-cols-2 lg:grid-cols-3">{campaigns.map((campaign) => <MasterReminderItem key={campaign.id} campaign={campaign} />)}</div><p className="pt-4 text-sm text-muted-foreground">As datas sugeridas e confirmações aparecem aqui conforme os jogadores respondem.</p></section>
}

function formatDate(value: string | null) {
  if (!value) return 'Sem registro'
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value))
}

function CopyId({ id }: { id: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      className="copy-id"
      onClick={async () => {
        await navigator.clipboard.writeText(id)
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1800)
      }}
      aria-label="Copiar identificador da mesa"
    >
      <span className="font-mono">{id}</span>
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
    </button>
  )
}

export function NewCampaignForm({ onCreated }: { onCreated: (campaign: CampaignSummary) => void }) {
  const [name, setName] = useState('')
  const [theme, setTheme] = useState('')
  const [principios, setPrincipios] = useState('')
  const [status, setStatus] = useState('Ativa')
  const [lastSessionAt, setLastSessionAt] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdId, setCreatedId] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    const response = await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, theme, principios, status, lastSessionAt: lastSessionAt || null }),
    })
    setSubmitting(false)
    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      setError(body.error ?? 'Não foi possível criar a mesa.')
      return
    }
    const { campaign } = await response.json()
    onCreated(campaign)
    setCreatedId(campaign.id)
    setName('')
    setTheme('')
    setPrincipios('')
    setLastSessionAt('')
    setStatus('Ativa')
  }

  return (
    <form onSubmit={handleSubmit} className="new-campaign-form">
      <div className="sheet-grid sheet-grid-2">
        <label className="sheet-field"><span>Nome da campanha</span><input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Sombras de Chicago" /></label>
        <label className="sheet-field"><span>Tema principal</span><input value={theme} onChange={(event) => setTheme(event.target.value)} placeholder="Ex.: Política e traição" /></label>
        <label className="sheet-field span-2"><span>Princípios da crônica</span><textarea rows={3} value={principios} onChange={(event) => setPrincipios(event.target.value)} placeholder="Leis, limites e pactos da mesa" /></label>
        <label className="sheet-field"><span>Status</span>
          <select className="select" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="Ativa">Ativa</option>
            <option value="Pausada">Pausada</option>
            <option value="Encerrada">Encerrada</option>
          </select>
        </label>
        <label className="sheet-field"><span>Último encontro</span><input type="date" value={lastSessionAt} onChange={(event) => setLastSessionAt(event.target.value)} /></label>
      </div>
      {error && <p className="mt-3 text-sm" style={{ color: '#e17b78' }}>{error}</p>}
      {createdId && <p className="mt-3 text-sm text-muted-foreground">Mesa criada. Compartilhe o identificador com os jogadores: <CopyId id={createdId} /></p>}
      <button type="submit" disabled={submitting} className="button-primary mt-4 inline-flex items-center gap-2">
        <Plus className="size-4" /> {submitting ? 'Criando...' : 'Criar mesa'}
      </button>
    </form>
  )
}

export function MasterPanel({ initialCampaigns }: { initialCampaigns: CampaignSummary[] }) {
  const { data } = useSWR('/api/campaigns', fetcher)
  const campaigns: CampaignSummary[] = data?.campaigns ?? initialCampaigns
  if (campaigns.length === 0) return null

  return (
    <div className="flex flex-col gap-6 mt-6 w-full">
      <MasterReminders campaigns={campaigns} />
      <div className="campaign-table">
        <div className="campaign-table-row campaign-table-head">
          <span>Status</span><span>Campanha</span><span>Tema principal</span><span>Jogadores</span><span>Último encontro</span><span>ID / Ações</span>
        </div>
        {campaigns.map((campaign) => (
          <div key={campaign.id} className="flex flex-col border-b border-border last:border-b-0">
            <div className="campaign-table-row border-b-0">
              <span><span className={`status ${campaign.status === 'Ativa' ? 'active' : 'risk'}`}><span className="status-dot" /> {campaign.status}</span></span>
              <span className="font-semibold">{campaign.name}</span>
              <span>{campaign.theme ?? 'Não definido'}</span>
              <span>{campaign.playerCount}</span>
              <span>{formatDate(campaign.lastSessionAt)}</span>
              <div className="flex items-center gap-2">
                <CopyId id={campaign.id} />
                <Link href={`/campaigns/${campaign.id}`} className="button-ghost text-[10px] px-3 py-1.5 h-auto">
                  Gerenciar mesa
                </Link>
              </div>
            </div>

          </div>
        ))}
      </div>
    </div>
  )
}

type Possession = {
  id: string
  characterId: string
  campaignId: string | null
  label: string
  description: string | null
  origin: 'player' | 'master'
  status: 'pendente' | 'aprovado' | 'reprovado'
  masterComment: string | null
}

type CampaignCharacter = {
  id: string
  name: string
  concept: string | null
  clan: string | null
  generation: string | null
  spentXp?: number | string
  totalXp?: number | string
}

export function CampaignPossessionsManager({ campaignId }: { campaignId: string }) {
  const { data: charData, mutate: mutateCharacters } = useSWR<{ characters: CampaignCharacter[] }>(`/api/characters?campaignId=${campaignId}`, fetcher)
  const { data: possData, mutate: mutatePossessions } = useSWR<{ possessions: Possession[] }>(`/api/possessions?campaignId=${campaignId}`, fetcher)

  const characters = charData?.characters ?? []
  const possessions = possData?.possessions ?? []

  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null)
  const [comments, setComments] = useState<Record<string, string>>({})
  const [newItemLabel, setNewItemLabel] = useState('')
  const [newItemDesc, setNewItemDesc] = useState('')
  const [targetCharId, setTargetCharId] = useState('')
  const [granting, setGranting] = useState(false)
  const [xpToAdd, setXpToAdd] = useState('2')
  const [updatingXp, setUpdatingXp] = useState(false)

  async function handleAddXpToCharacter(character: CampaignCharacter, amount: number) {
    const currentTotal = typeof character.totalXp === 'number' ? character.totalXp : Number.parseInt(String(character.totalXp ?? '0'), 10) || 0
    const nextTotal = currentTotal + amount
    const response = await fetch('/api/characters', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ characterId: character.id, totalXp: nextTotal }),
    })
    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      console.error('Erro ao atribuir XP:', body.error)
      return
    }
    await mutateCharacters(undefined, { revalidate: true })
  }

  async function handleGrantXpToAll(event: React.FormEvent) {
    event.preventDefault()
    const amount = Number.parseInt(xpToAdd, 10)
    if (!amount || amount <= 0 || characters.length === 0) return
    setUpdatingXp(true)
    for (const char of characters) {
      const currentTotal = typeof char.totalXp === 'number' ? char.totalXp : Number.parseInt(String(char.totalXp ?? '0'), 10) || 0
      const nextTotal = currentTotal + amount
      const response = await fetch('/api/characters', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId: char.id, totalXp: nextTotal }),
      })
      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        console.error('Erro ao atribuir XP a', char.name, ':', body.error)
      }
    }
    setUpdatingXp(false)
    await mutateCharacters(undefined, { revalidate: true })
  }

  async function updateStatus(id: string, status: 'aprovado' | 'reprovado') {
    await fetch('/api/possessions', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status, masterComment: comments[id] || null }),
    })
    await mutatePossessions()
  }

  async function grantMasterItem(event: React.FormEvent) {
    event.preventDefault()
    const charId = targetCharId || selectedCharacterId || characters[0]?.id
    if (!newItemLabel.trim() || !charId) return
    setGranting(true)
    await fetch('/api/possessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        characterId: charId,
        campaignId,
        label: newItemLabel.trim(),
        description: newItemDesc.trim() || null,
        origin: 'master',
      }),
    })
    setGranting(false)
    setNewItemLabel('')
    setNewItemDesc('')
    await mutatePossessions()
  }

  const STATUS_ORDER: Record<string, number> = { pendente: 0, aprovado: 1, reprovado: 2 }
  const filteredPossessions = (selectedCharacterId
    ? possessions.filter((p) => p.characterId === selectedCharacterId)
    : possessions
  ).slice().sort((a, b) => (STATUS_ORDER[a.status] ?? 1) - (STATUS_ORDER[b.status] ?? 1))

  return (
    <div className="border border-[#6b3436] bg-[#131316] p-6 flex flex-col gap-6">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div>
          <h3 className="font-serif text-lg uppercase text-[#f3c7b7]">Revisão e Gestão da Mesa</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Gerencie os personagens, atribua experiência (XP) e aprove os pertences da crônica.</p>
        </div>
        <span className="eyebrow text-xs">Painel do Narrador</span>
      </div>

      {/* Atribuir XP a Toda a Mesa */}
      {characters.length > 0 && (
        <form onSubmit={handleGrantXpToAll} className="border border-[#45362a] bg-[#1a1410] p-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-mono font-semibold uppercase text-[#e5a07e]">Atribuir XP Geral da Sessão</p>
            <p className="text-[11px] text-muted-foreground">Conceda experiência simultaneamente para todos os personagens da mesa.</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              max="50"
              value={xpToAdd}
              onChange={(e) => setXpToAdd(e.target.value)}
              className="input w-20 text-center font-mono"
            />
            <button
              type="submit"
              disabled={updatingXp}
              className="button-primary text-xs py-2 px-3 h-auto whitespace-nowrap"
            >
              {updatingXp ? 'Atribuindo...' : `+ Conceder ${xpToAdd || '0'} XP a todos`}
            </button>
          </div>
        </form>
      )}

      {/* Seção de Personagens com XP */}
      <div className="flex flex-col gap-3">
        <h4 className="font-mono text-xs uppercase text-muted-foreground tracking-wider">Personagens Vinculados e Experiência (XP)</h4>
        {characters.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">Nenhum personagem vinculado a esta mesa ainda.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setSelectedCharacterId(null)}
              className={`p-3 text-left border transition-colors ${!selectedCharacterId ? 'border-primary bg-primary/10' : 'border-border bg-[#151519]'}`}
            >
              <p className="text-xs font-semibold uppercase">Todos os Personagens</p>
              <p className="text-[10px] text-muted-foreground mt-1">{possessions.length} pertences totais</p>
            </button>
            {characters.map((char) => {
              const spent = typeof char.spentXp === 'number' ? char.spentXp : Number.parseInt(String(char.spentXp ?? '0'), 10) || 0
              const total = typeof char.totalXp === 'number' ? char.totalXp : Number.parseInt(String(char.totalXp ?? '0'), 10) || 0
              const available = Math.max(0, total - spent)

              return (
                <div
                  key={char.id}
                  className={`p-3 text-left border flex flex-col justify-between transition-colors ${selectedCharacterId === char.id ? 'border-primary bg-primary/10' : 'border-border bg-[#151519]'}`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCharacterId(char.id)
                      setTargetCharId(char.id)
                    }}
                    className="w-full text-left"
                  >
                    <p className="text-xs font-semibold">{char.name}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {char.clan ?? 'Clã não definido'} • {char.concept ?? 'Sem conceito'}
                    </p>
                  </button>

                  <div className="mt-3 pt-2 border-t border-border/60 flex items-center justify-between gap-2 text-[11px]">
                    <div className="flex flex-col">
                      <span className="font-mono text-muted-foreground text-[9px] uppercase">XP Total</span>
                      <span className="font-mono font-semibold text-[#f3c7b7]">{total} XP <span className="text-[9px] text-muted-foreground">({available} livre)</span></span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleAddXpToCharacter(char, 1)}
                        className="button-ghost text-[10px] px-1.5 py-0.5 h-auto border-border hover:border-primary"
                        title="Adicionar +1 XP a este personagem"
                      >
                        +1
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddXpToCharacter(char, 2)}
                        className="button-ghost text-[10px] px-1.5 py-0.5 h-auto border-border hover:border-primary"
                        title="Adicionar +2 XP a este personagem"
                      >
                        +2
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Painel de Revisão de Pertences */}
      <div className="flex flex-col gap-4 border-t border-border pt-4">
        <h4 className="font-mono text-xs uppercase text-[#d47776] tracking-wider">
          Painel de Revisão de Pertences {selectedCharacterId ? `(${characters.find(c => c.id === selectedCharacterId)?.name ?? 'Personagem'})` : '(Todos)'}
        </h4>

        {filteredPossessions.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">Nenhum pertence encontrado nesta categoria.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredPossessions.map((item) => {
              const ownerChar = characters.find((c) => c.id === item.characterId)
              return (
                <div key={item.id} className="border border-border bg-[#151519] p-4 flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <span className="font-semibold text-sm">{item.label}</span>
                      <span className="ml-3 text-xs text-muted-foreground font-mono">
                        [{ownerChar?.name ?? 'Personagem'}] — ({item.origin === 'master' ? 'Concedido pelo Mestre' : 'Solicitado pelo Jogador'})
                      </span>
                    </div>
                    {item.status === 'aprovado' && <span className="status active"><span className="status-dot" /> Aprovado</span>}
                    {item.status === 'reprovado' && <span className="status risk"><span className="status-dot" /> Reprovado</span>}
                    {item.status === 'pendente' && <span className="status" style={{ borderColor: '#8a7332', color: '#e5c069' }}><span className="status-dot" /> Pendente</span>}
                  </div>

                  {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}

                  {item.origin === 'player' && (
                    <div className="mt-2 border-t border-border pt-3 flex flex-col gap-2">
                      <label className="sheet-field">
                        <span>Comentário do Narrador</span>
                        <textarea
                          rows={2}
                          value={comments[item.id] ?? item.masterComment ?? ''}
                          onChange={(e) => setComments({ ...comments, [item.id]: e.target.value })}
                          placeholder="Digite seu comentário de avaliação..."
                        />
                      </label>
                      <div className="flex justify-end gap-2 mt-1">
                        <button
                          type="button"
                          onClick={() => updateStatus(item.id, 'reprovado')}
                          className="action-delete"
                        >
                          Reprovar
                        </button>
                        <button
                          type="button"
                          onClick={() => updateStatus(item.id, 'aprovado')}
                          className="button-primary"
                          style={{ minHeight: '34px' }}
                        >
                          Aprovar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Interface para Criar / Conceder Itens Restritos ao Jogador */}
      <form onSubmit={grantMasterItem} className="border-t border-border pt-4 flex flex-col gap-4">
        <h4 className="font-mono text-xs uppercase text-[#9ac59b] tracking-wider">Conceder Item Restrito a um Personagem</h4>
        <div className="sheet-grid sheet-grid-2">
          <label className="sheet-field">
            <span>Personagem Destinatário</span>
            <select
              required
              className="select"
              value={targetCharId || selectedCharacterId || ''}
              onChange={(e) => setTargetCharId(e.target.value)}
            >
              <option value="">Selecione um personagem...</option>
              {characters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.clan ?? 'Sem clã'})
                </option>
              ))}
            </select>
          </label>
          <label className="sheet-field">
            <span>Nome do Item</span>
            <input
              required
              value={newItemLabel}
              onChange={(e) => setNewItemLabel(e.target.value)}
              placeholder="Ex.: Chave do Refúgio, Grimório Antigo"
            />
          </label>
          <label className="sheet-field span-2">
            <span>Descrição / Notas do Mestre</span>
            <textarea
              rows={2}
              value={newItemDesc}
              onChange={(e) => setNewItemDesc(e.target.value)}
              placeholder="Efeito restrito, contexto de história ou permissões do item"
            />
          </label>
        </div>
        <button type="submit" disabled={granting || characters.length === 0} className="button-primary inline-flex items-center gap-2 self-start mt-2">
          <Plus className="size-4" /> {granting ? 'Concedendo...' : 'Conceder Item Restrito'}
        </button>
      </form>
    </div>
  )
}
