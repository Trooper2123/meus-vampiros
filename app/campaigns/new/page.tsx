'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Check, Copy, Plus } from 'lucide-react'

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

export default function NewCampaignPage() {
  const router = useRouter()
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
    setCreatedId(campaign.id)
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="noise" aria-hidden="true" />

      <header className="sheet-header">
        <div>
          <p className="eyebrow">Crônicas / nova entrada</p>
          <h1 className="mt-2 font-serif text-2xl uppercase tracking-[0.12em]">Nova campanha</h1>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/campaigns" className="button-ghost inline-flex items-center gap-2">
            <ArrowLeft className="size-4" /> Suas mesas
          </Link>
        </div>
      </header>

      <div className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-8 lg:py-14">
        <div className="mb-10 border-b border-border pb-8">
          <p className="eyebrow">Painel do Narrador</p>
          <h2 className="mt-3 font-serif text-4xl uppercase tracking-[0.08em] sm:text-5xl">Criar mesa</h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            Preencha os dados da sua nova campanha. Após criar, compartilhe o ID da mesa com seus jogadores para que eles possam se vincular.
          </p>
        </div>

        {createdId ? (
          <section className="login-panel text-center">
            <Check className="mx-auto size-10 text-primary" aria-hidden="true" />
            <p className="eyebrow mt-6">Mesa criada com sucesso</p>
            <h3 className="mt-3 font-serif text-3xl uppercase tracking-[0.08em]">{name}</h3>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
              Compartilhe o identificador abaixo com seus jogadores para que eles possam vincular seus personagens à mesa.
            </p>
            <div className="mt-6 flex justify-center">
              <CopyId id={createdId} />
            </div>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/campaigns" className="button-primary inline-flex items-center gap-2">
                Ver minhas mesas <ArrowRight className="size-4" />
              </Link>
              <button
                type="button"
                onClick={() => { setCreatedId(null); setName(''); setTheme(''); setPrincipios(''); setLastSessionAt(''); setStatus('Ativa') }}
                className="button-ghost inline-flex items-center gap-2"
              >
                <Plus className="size-4" /> Criar outra
              </button>
            </div>
          </section>
        ) : (
          <form onSubmit={handleSubmit} className="new-campaign-form">
            <div className="sheet-grid sheet-grid-2">
              <label className="sheet-field">
                <span>Nome da campanha</span>
                <input
                  required
                  id="campaign-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex.: Sombras de Chicago"
                />
              </label>
              <label className="sheet-field">
                <span>Tema principal</span>
                <input
                  id="campaign-theme"
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  placeholder="Ex.: Política e traição"
                />
              </label>
              <label className="sheet-field span-2">
                <span>Princípios da crônica</span>
                <textarea
                  id="campaign-principios"
                  rows={4}
                  value={principios}
                  onChange={(e) => setPrincipios(e.target.value)}
                  placeholder="Leis, limites e pactos da mesa"
                />
              </label>
              <label className="sheet-field">
                <span>Status</span>
                <select
                  id="campaign-status"
                  className="select"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="Ativa">Ativa</option>
                  <option value="Pausada">Pausada</option>
                  <option value="Encerrada">Encerrada</option>
                </select>
              </label>
              <label className="sheet-field">
                <span>Último encontro</span>
                <input
                  id="campaign-last-session"
                  type="date"
                  value={lastSessionAt}
                  onChange={(e) => setLastSessionAt(e.target.value)}
                />
              </label>
            </div>

            {error && <p className="mt-4 text-sm" style={{ color: '#e17b78' }}>{error}</p>}

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="submit"
                id="btn-criar-mesa"
                disabled={submitting}
                className="button-primary inline-flex items-center gap-2"
              >
                <Plus className="size-4" /> {submitting ? 'Criando...' : 'Criar mesa'}
              </button>
              <Link href="/campaigns" className="button-ghost inline-flex items-center gap-2">
                Cancelar
              </Link>
            </div>
          </form>
        )}
      </div>
    </main>
  )
}
