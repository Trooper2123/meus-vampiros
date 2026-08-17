'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Check, Copy, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'

export type CampaignSummary = {
  id: string
  name: string
  theme: string | null
  status: string
  lastSessionAt: string | null
  playerCount: number
}

const fetcher = (url: string) => fetch(url).then((response) => response.json())

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
    <div className="campaign-table mt-6">
      <div className="campaign-table-row campaign-table-head">
        <span>Status</span><span>Campanha</span><span>Tema principal</span><span>Jogadores</span><span>Último encontro</span><span>ID da mesa</span>
      </div>
      {campaigns.map((campaign) => (
        <div className="campaign-table-row" key={campaign.id}>
          <span><span className={`status ${campaign.status === 'Ativa' ? 'active' : 'risk'}`}><span className="status-dot" /> {campaign.status}</span></span>
          <span>{campaign.name}</span>
          <span>{campaign.theme ?? 'Não definido'}</span>
          <span>{campaign.playerCount}</span>
          <span>{formatDate(campaign.lastSessionAt)}</span>
          <span><CopyId id={campaign.id} /></span>
        </div>
      ))}
    </div>
  )
}
