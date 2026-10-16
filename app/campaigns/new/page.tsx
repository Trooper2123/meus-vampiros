'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Check, Copy, Plus } from 'lucide-react'
import { SchedulingCalendarIntroModal } from '@/components/campaign-calendar/scheduling-calendar-intro-modal'
import { CAMPAIGN_EXCEPTIONS } from '@/lib/campaign-exception-options'

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
  const [inviteToken, setInviteToken] = useState<string | null>(null)
  const [allowExceptions, setAllowExceptions] = useState(false)
  const [exceptionCodes, setExceptionCodes] = useState<string[]>([])
  const [userIsMaster, setUserIsMaster] = useState<boolean | null>(null)
  const [hasCampaigns, setHasCampaigns] = useState(false)
  const [enableSchedulingCalendar, setEnableSchedulingCalendar] = useState(true)
  const [showSchedulingIntro, setShowSchedulingIntro] = useState(false)
  const [clans, setClans] = useState<{ code: string; name: string }[]>([])
  const [predatorTypes, setPredatorTypes] = useState<{ code: string; name: string; source: string }[]>([])
  const [enabledClanCodes, setEnabledClanCodes] = useState<string[]>([])
  const [enabledPredatorCodes, setEnabledPredatorCodes] = useState<string[]>([])

  useEffect(() => {
    let mounted = true
    const checkAccess = async () => {
      try {
        const response = await fetch('/api/campaigns')
        const data = await response.json()
        if (!response.ok) throw new Error(data.error ?? 'Não foi possível consultar as regras da mesa.')
        if (!mounted) return
        setUserIsMaster(data.canCreate === true)
        setHasCampaigns(data.campaigns.length > 0)
        setClans(data.clans ?? [])
        setPredatorTypes(data.predatorTypes ?? [])
        setEnabledClanCodes((data.clans ?? []).map((entry: { code: string }) => entry.code))
        setEnabledPredatorCodes((data.predatorTypes ?? []).filter((entry: { source: string }) => entry.source === 'COREBOOK').map((entry: { code: string }) => entry.code))
      } catch (failure) { if (mounted) setError(failure instanceof Error ? failure.message : 'Não foi possível consultar as regras da mesa.') }
    }
    checkAccess()
    return () => { mounted = false }
  }, [])

  function handleCancel() {
    if (userIsMaster === null) return
    if (userIsMaster) {
      if (hasCampaigns) {
        router.push('/campaigns')
      } else {
        router.push('/master')
      }
    } else {
      router.push('/characters')
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)

    const response = await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, theme, principios, status, lastSessionAt: lastSessionAt || null, enableSchedulingCalendar, enabledClanCodes, enabledPredatorCodes, exceptionCodes: allowExceptions ? exceptionCodes : [] }),
    })

    setSubmitting(false)

    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      setError(body.error ?? 'Não foi possível criar a mesa.')
      return
    }

    const { campaign, inviteToken: token } = await response.json()
    setInviteToken(token ?? null)
    setCreatedId(campaign.id)
    if (enableSchedulingCalendar && localStorage.getItem('scheduling-calendar-intro-seen') !== 'true') {
      setShowSchedulingIntro(true)
    }
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
              {inviteToken && <div className="mt-5"><p className="mb-3 text-sm text-muted-foreground">Convite do Narrador: quem receber este link pode ler as regras e ingressar ao aceitar. Compartilhe somente com seus jogadores; copie agora, pois o token não será exibido novamente.</p><CopyId id={`${window.location.origin}/create-characters?campaignId=${createdId}#invite=${inviteToken}`} /></div>}
            </div>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/campaigns" className="button-primary inline-flex items-center gap-2">
                Ver minhas mesas <ArrowRight className="size-4" />
              </Link>
              <button
                type="button"
                onClick={() => { setCreatedId(null); setInviteToken(null); setAllowExceptions(false); setExceptionCodes([]); setName(''); setTheme(''); setPrincipios(''); setLastSessionAt(''); setStatus('Ativa') }}
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
              <fieldset className="span-2 border border-border bg-card p-4"><legend>Quais clãs serão permitidos?</legend><div className="mt-3 grid gap-2 sm:grid-cols-2">{clans.map(clan => <label key={clan.code} className="flex items-center gap-2 text-sm"><input type="checkbox" disabled={submitting} checked={enabledClanCodes.includes(clan.code)} onChange={event => setEnabledClanCodes(values => event.target.checked ? [...values, clan.code] : values.filter(code => code !== clan.code))} />{clan.name}</label>)}</div></fieldset>
              <fieldset className="span-2 border border-border bg-card p-4"><legend>Quais predações serão permitidas?</legend><p className="mt-2 text-sm text-muted-foreground">Após criar a campanha, os painéis mostram somente os tipos usados pelas fichas vinculadas.</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{predatorTypes.map(predator => <label key={predator.code} className="flex items-center gap-2 text-sm"><input type="checkbox" disabled={submitting} checked={enabledPredatorCodes.includes(predator.code)} onChange={event => setEnabledPredatorCodes(values => event.target.checked ? [...values, predator.code] : values.filter(code => code !== predator.code))} />{predator.name}{predator.source === 'PLAYERS_GUIDE' ? ' (Players Guide)' : ''}</label>)}</div></fieldset>
              <fieldset className="span-2 border border-border bg-card p-4"><legend>Exceções predefinidas de predação</legend><label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={allowExceptions} disabled={submitting} onChange={event => { setAllowExceptions(event.target.checked); setExceptionCodes([]) }} />Permitir exceções de predação nesta mesa</label>{allowExceptions && <div className="mt-3 flex flex-col gap-3">{CAMPAIGN_EXCEPTIONS.map(rule => <label key={rule.code} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={exceptionCodes.includes(rule.code)} disabled={submitting} onChange={event => setExceptionCodes(values => event.target.checked ? [...values, rule.code] : values.filter(code => code !== rule.code))} />{rule.name}</label>)}</div>}<p className="mt-3 text-xs text-muted-foreground">Definidas somente ao criar a mesa. Não habilitam predações bloqueadas, não concedem pontos e não dispensam as demais regras.</p></fieldset>
              <label className="span-2 flex cursor-pointer items-start gap-3 border border-border bg-card p-4">
                <input
                  type="checkbox"
                  checked={enableSchedulingCalendar}
                  onChange={(event) => setEnableSchedulingCalendar(event.target.checked)}
                  className="mt-1 size-4 accent-primary"
                />
                <span><strong className="block text-sm">Habilitar calendário de marcação</strong><span className="mt-1 block text-xs leading-5 text-muted-foreground">Permite que os participantes informem disponibilidade para os próximos encontros.</span></span>
              </label>
            </div>

            {error && <p className="mt-4 text-sm" style={{ color: '#e17b78' }}>{error}</p>}

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="submit"
                id="btn-criar-mesa"
                disabled={submitting || userIsMaster !== true}
                className="button-primary inline-flex items-center gap-2"
              >
                <Plus className="size-4" /> {submitting ? 'Criando...' : 'Criar mesa'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="button-ghost inline-flex items-center gap-2"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>
      {showSchedulingIntro && <SchedulingCalendarIntroModal onClose={() => { localStorage.setItem('scheduling-calendar-intro-seen', 'true'); setShowSchedulingIntro(false) }} />}
    </main>
  )
}
