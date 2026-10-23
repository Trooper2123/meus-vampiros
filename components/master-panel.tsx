'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Check, Copy, Plus, Users } from 'lucide-react'
import Link from 'next/link'

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

function MasterReminderItem({ campaign }: Readonly<{ campaign: CampaignSummary }>) {
  const { data } = useSWR<ReminderData>(`/api/campaign-availability?campaignId=${campaign.id}`, fetcher)
  const suggested = (data?.entries ?? []).filter((entry) => entry.suggested).sort((a, b) => a.date.localeCompare(b.date))[0]
  if (!suggested) return <p className="mt-2 text-sm text-muted-foreground">Aguardando sugestÃ£o de data.</p>
  const confirmed = (data?.entries ?? []).filter((entry) => entry.date === suggested.date && entry.status === 'disponÃ­vel').length
  return <Link href={`/campaigns/${campaign.id}`} className="block text-sm hover:text-primary"><p className="mt-2 font-mono text-xs uppercase text-primary">{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(new Date(`${suggested.date}T12:00:00`))}</p><p className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground"><Users className="size-3.5" aria-hidden="true" /> {confirmed} confirmaÃ§Ã£o{confirmed === 1 ? '' : 'Ãµes'}</p></Link>
}


function formatDate(value: string | null) {
  if (!value) return 'Sem registro'
  return new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(value))
}

function CopyCampaignId({ id }: Readonly<{ id: string }>) {
  const [copied, setCopied] = useState(false)
  return <button type="button" className="copy-id" aria-label="Copiar identificador da mesa" onClick={async () => {
    await navigator.clipboard.writeText(id)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }}><span>{copied ? 'ID copiado' : 'Copiar ID'}</span><span className="sr-only">{id}</span>{copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}</button>
}
export function NewCampaignForm({ onCreated }: Readonly<{ onCreated: (campaign: CampaignSummary) => void }>) {
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
      setError(body.error ?? 'NÃ£o foi possÃ­vel criar a mesa.')
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
        <label className="sheet-field"><span>Tema principal</span><input value={theme} onChange={(event) => setTheme(event.target.value)} placeholder="Ex.: PolÃ­tica e traiÃ§Ã£o" /></label>
        <label className="sheet-field span-2"><span>PrincÃ­pios da crÃ´nica</span><textarea rows={3} value={principios} onChange={(event) => setPrincipios(event.target.value)} placeholder="Leis, limites e pactos da mesa" /></label>
        <label className="sheet-field"><span>Status</span>
          <select className="select" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="Ativa">Ativa</option>
            <option value="Pausada">Pausada</option>
            <option value="Encerrada">Encerrada</option>
          </select>
        </label>
        <label className="sheet-field"><span>Ãšltimo encontro</span><input type="date" value={lastSessionAt} onChange={(event) => setLastSessionAt(event.target.value)} /></label>
      </div>
      {error && <p className="mt-3 text-sm text-primary">{error}</p>}
      {createdId && <p className="mt-3 text-sm text-muted-foreground">Mesa criada. Compartilhe o ID da mesa para os jogadores vincularem suas fichas: <CopyCampaignId id={createdId} /></p>}
      <button type="submit" disabled={submitting} className="button-primary mt-4 inline-flex items-center gap-2">
        <Plus className="size-4" /> {submitting ? 'Criando...' : 'Criar mesa'}
      </button>
    </form>
  )
}

export function MasterPanel({ initialCampaigns }: Readonly<{ initialCampaigns: CampaignSummary[] }>) {
  const { data } = useSWR('/api/campaigns', fetcher)
  const campaigns: CampaignSummary[] = data?.campaigns ?? initialCampaigns
  if (campaigns.length === 0) return null

  return <div className="mt-6 flex w-full flex-col gap-6">{campaigns.map(campaign => <section key={campaign.id} className="border border-border bg-card p-6">
    <div className="flex flex-wrap items-start justify-between gap-4"><h3 className="font-serif text-2xl">{campaign.name}</h3><span className={`status ${campaign.status === 'Ativa' ? 'active' : ''}`}><span className="status-dot" />{campaign.status}</span></div>
    {campaign.theme && <p className="mt-3 text-sm text-muted-foreground">{campaign.theme}</p>}
    <div className="mt-5 grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,2fr)]">
      <div><p className="eyebrow">Participantes</p><p className="mt-2 text-sm">{campaign.playerCount} jogadores</p></div>
      <div><p className="eyebrow">Ãšltima sessÃ£o</p><p className="mt-2 text-sm">{formatDate(campaign.lastSessionAt)}</p></div>
      <div><p className="eyebrow">PrÃ³xima sessÃ£o</p><MasterReminderItem campaign={campaign} /></div>
    </div>
    <div className="mt-5 flex flex-wrap items-center gap-3"><Link href={`/campaigns/${campaign.id}`} className="button-primary">Gerenciar mesa</Link><CopyCampaignId id={campaign.id} /></div>
  </section>)}</div>
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

export function CampaignPossessionsManager({ campaignId, sessionId }: Readonly<{ campaignId: string; sessionId?: string }>) {
  const { data: charData, mutate: mutateCharacters } = useSWR<{ characters: CampaignCharacter[] }>(`/api/characters?campaignId=${campaignId}`, fetcher)
  const { data: possData, error: possessionsError, mutate: mutatePossessions } = useSWR<{ possessions: Possession[] }>(`/api/possessions?campaignId=${campaignId}`, async url => {
    const response = await fetch(url)
    if (!response.ok) throw new Error('NÃ£o foi possÃ­vel carregar os pertences.')
    return response.json()
  }, { refreshInterval: 15000 })

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
  const [feedback, setFeedback] = useState('')
  const [xpReason, setXpReason] = useState('ConcessÃ£o do narrador')
  const [xpRetry, setXpRetry] = useState<{ characterIds: string[]; amount: number; reason: string; idempotencyKey: string } | null>(null)
  const [singleXpRetry, setSingleXpRetry] = useState<Record<string, { amount: number; reason: string; idempotencyKey: string }>>({})

  async function handleAddXpToCharacter(character: CampaignCharacter, amount: number) {
    if (updatingXp || !xpReason.trim()) return
    const operation = singleXpRetry[character.id] ?? { amount, reason: xpReason.trim(), idempotencyKey: crypto.randomUUID() }
    setSingleXpRetry((current) => ({ ...current, [character.id]: operation }))
    setUpdatingXp(true)
    try {
      const response = await fetch('/api/characters', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId: character.id, ...operation, ...(sessionId ? { sessionId } : {}) }),
      })
      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        setFeedback(`${character.name}: ${body.error ?? 'Falha na concessÃ£o. Tente novamente para repetir a mesma operaÃ§Ã£o.'}`)
        return
      }
      setSingleXpRetry((current) => { const next = { ...current }; delete next[character.id]; return next })
      setFeedback(`${character.name}: XP concedido.`)
      await mutateCharacters(undefined, { revalidate: true })
    } catch {
      setFeedback(`${character.name}: falha de conexÃ£o. Tente novamente para repetir a mesma operaÃ§Ã£o.`)
    } finally {
      setUpdatingXp(false)
    }
  }

  async function handleGrantXpToAll(event: React.FormEvent) {
    event.preventDefault()
    const amount = Number(xpToAdd)
    if (updatingXp || !Number.isInteger(amount) || amount <= 0 || amount > 10000 || !xpReason.trim() || characters.length === 0) return
    const operation = xpRetry ?? { characterIds: characters.map((character) => character.id), amount, reason: xpReason.trim(), idempotencyKey: crypto.randomUUID() }
    setXpRetry(operation)
    setUpdatingXp(true)
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/xp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...operation, ...(sessionId ? { sessionId } : {}) }),
      })
      const body = await response.json().catch(() => null)
      if (!response.ok) throw new Error(body?.error ?? 'Falha na concessÃ£o de XP.')
      setFeedback((body?.results ?? []).map((result: { characterId: string; ok: boolean; error?: string }) => `${characters.find((character) => character.id === result.characterId)?.name ?? result.characterId}: ${result.ok ? 'XP concedido' : result.error ?? 'falha'}`).join(' Â· '))
      if (body?.complete) setXpRetry(null)
      await mutateCharacters(undefined, { revalidate: true })
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Falha de conexÃ£o. Tente novamente para repetir a mesma operaÃ§Ã£o.')
    } finally {
      setUpdatingXp(false)
    }
  }

  async function updateStatus(id: string, status: 'aprovado' | 'reprovado') {
    try {
      const response = await fetch('/api/possessions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status, masterComment: comments[id] || null }),
      })
      if (!response.ok) { const body = await response.json().catch(() => null); throw new Error(body?.error ?? 'Falha ao revisar o pertence.') }
      await mutatePossessions()
      setFeedback('RevisÃ£o do pertence salva.')
    } catch (error) { setFeedback(error instanceof Error ? error.message : 'Falha de conexÃ£o ao revisar o pertence.') }
  }

  async function grantMasterItem(event: React.FormEvent) {
    event.preventDefault()
    const charId = targetCharId || selectedCharacterId || characters[0]?.id
    if (granting || !newItemLabel.trim() || !charId) return
    setGranting(true)
    try {
      const response = await fetch('/api/possessions', {
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
    if (!response.ok) { const body = await response.json().catch(() => null); throw new Error(body?.error ?? 'Falha ao conceder o pertence.') }
    setNewItemLabel('')
    setNewItemDesc('')
    await mutatePossessions()
    setFeedback('Pertence concedido.')
    } catch (error) { setFeedback(error instanceof Error ? error.message : 'Falha de conexÃ£o. Os campos foram preservados.') }
    finally { setGranting(false) }
  }

  const pendingPossessions = possessions.filter(item => item.status === 'pendente')
  const filteredPossessions = selectedCharacterId ? pendingPossessions.filter(item => item.characterId === selectedCharacterId) : pendingPossessions

  return (
    <div className="border border-[#6b3436] bg-[#131316] p-6 flex flex-col gap-6">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div>
          <h3 className="font-serif text-lg uppercase text-[#f3c7b7]">RevisÃ£o e GestÃ£o da Mesa</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Gerencie os personagens, atribua experiÃªncia (XP) e aprove os pertences da crÃ´nica.</p>
        </div>
        <span className="eyebrow text-xs">Painel do Narrador</span>
      </div>

      {feedback && <output className="block text-sm text-muted-foreground">{feedback}</output>}
      {possessionsError && <p role="alert">{possessionsError.message}</p>}
      <label className="flex flex-col gap-2 text-sm">Motivo da concessÃ£o de XP<input className="input" value={xpReason} maxLength={500} onChange={(event) => setXpReason(event.target.value)} required /></label>
      {xpRetry && <p className="text-xs text-muted-foreground">HÃ¡ uma concessÃ£o incompleta. Reenviar usa a mesma operaÃ§Ã£o, sem duplicar XP.</p>}
      {/* Atribuir XP a Toda a Mesa */}
      {characters.length > 0 && (
        <form onSubmit={handleGrantXpToAll} className="border border-[#45362a] bg-[#1a1410] p-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-mono font-semibold uppercase text-[#e5a07e]">Atribuir XP Geral da SessÃ£o</p>
            <p className="text-[11px] text-muted-foreground">Conceda experiÃªncia simultaneamente para todos os personagens da mesa.</p>
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

      {/* SeÃ§Ã£o de Personagens com XP */}
      <div className="flex flex-col gap-3">
        <h4 className="font-mono text-xs uppercase text-muted-foreground tracking-wider">Personagens Vinculados e ExperiÃªncia (XP)</h4>
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
                      {char.clan ?? 'ClÃ£ nÃ£o definido'} â€¢ {char.concept ?? 'Sem conceito'}
                    </p>
                  </button>
                  <Link href={`/characters/${char.id}/summary`} className="button-ghost mt-2 text-xs">Ver ficha resumida</Link>

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

      {/* Painel de RevisÃ£o de Pertences */}
      {pendingPossessions.length > 0 && <div className="flex flex-col gap-4 border-t border-border pt-4">
        <h4 className="font-mono text-xs uppercase text-[#d47776] tracking-wider">
          Painel de RevisÃ£o de Pertences {selectedCharacterId ? `(${characters.find(c => c.id === selectedCharacterId)?.name ?? 'Personagem'})` : '(Todos)'}
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
                        [{ownerChar?.name ?? 'Personagem'}] â€” ({item.origin === 'master' ? 'Concedido pelo Mestre' : 'Solicitado pelo Jogador'})
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
                        <span>ComentÃ¡rio do Narrador</span>
                        <textarea
                          rows={2}
                          value={comments[item.id] ?? item.masterComment ?? ''}
                          onChange={(e) => setComments({ ...comments, [item.id]: e.target.value })}
                          placeholder="Digite seu comentÃ¡rio de avaliaÃ§Ã£o..."
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
      </div>}
      {/* Interface para Criar / Conceder Itens Restritos ao Jogador */}
      <form onSubmit={grantMasterItem} className="border-t border-border pt-4 flex flex-col gap-4">
        <h4 className="font-mono text-xs uppercase text-[#9ac59b] tracking-wider">Conceder Item Restrito a um Personagem</h4>
        <div className="sheet-grid sheet-grid-2">
          <label className="sheet-field">
            <span>Personagem DestinatÃ¡rio</span>
            <select
              required
              className="select"
              value={targetCharId || selectedCharacterId || ''}
              onChange={(e) => setTargetCharId(e.target.value)}
            >
              <option value="">Selecione um personagem...</option>
              {characters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.clan ?? 'Sem clÃ£'})
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
              placeholder="Ex.: Chave do RefÃºgio, GrimÃ³rio Antigo"
            />
          </label>
          <label className="sheet-field span-2">
            <span>DescriÃ§Ã£o / Notas do Mestre</span>
            <textarea
              rows={2}
              value={newItemDesc}
              onChange={(e) => setNewItemDesc(e.target.value)}
              placeholder="Efeito restrito, contexto de histÃ³ria ou permissÃµes do item"
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
