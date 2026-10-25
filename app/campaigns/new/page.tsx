'use client'

import { ArchiveHeader } from '@/components/archive-header'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Check, Copy, Plus } from 'lucide-react'
import { SchedulingCalendarIntroModal } from '@/components/campaign-calendar/scheduling-calendar-intro-modal'
import { CAMPAIGN_EXCEPTIONS } from '@/lib/campaign-exception-options'
import { PREDATOR_SOURCE_LABELS, type PredatorTypeSource } from '@/lib/vtm-v5/predator-types/types'

function CopyId({ id }: Readonly<{ id: string }>) {
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
  const [allowExceptions, setAllowExceptions] = useState(false)
  const [exceptionCodes, setExceptionCodes] = useState<string[]>([])
  const [userIsMaster, setUserIsMaster] = useState<boolean | null>(null)
  const [hasCampaigns, setHasCampaigns] = useState(false)
  const [enableSchedulingCalendar, setEnableSchedulingCalendar] = useState(true)
  const [showSchedulingIntro, setShowSchedulingIntro] = useState(false)
  const [clans, setClans] = useState<{ code: string; name: string }[]>([])
  const [predatorTypes, setPredatorTypes] = useState<{ code: string; name: string; source: PredatorTypeSource }[]>([])
  const [enabledClanCodes, setEnabledClanCodes] = useState<string[]>([])
  const [enabledPredatorCodes, setEnabledPredatorCodes] = useState<string[]>([])

  useEffect(() => {
    let mounted = true
    const checkAccess = async () => {
      try {
        const response = await fetch('/api/campaigns')
        const data = await response.json()
        if (!response.ok) { throw new Error(data.error ?? 'NÃ£o foi possÃ­vel consultar as regras da mesa.') }
        if (!mounted) { return }
        setUserIsMaster(data.canCreate === true)
        setHasCampaigns(data.campaigns.length > 0)
        setClans(data.clans ?? [])
        setPredatorTypes(data.predatorTypes ?? [])
        setEnabledClanCodes((data.clans ?? []).map((entry: { code: string }) => entry.code))
        setEnabledPredatorCodes((data.predatorTypes ?? []).map((entry: { code: string }) => entry.code))
      } catch (error_) { if (mounted) { setError(error_ instanceof Error ? error_.message : 'NÃ£o foi possÃ­vel consultar as regras da mesa.') } }
    }
    void checkAccess()
    return () => { mounted = false }
  }, [])

  function handleCancel() {
    if (userIsMaster === null) { return }
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
      setError(body.error ?? 'NÃ£o foi possÃ­vel criar a mesa.')
      return
    }

    const { campaign } = await response.json()
    setCreatedId(campaign.id)
    if (enableSchedulingCalendar && localStorage.getItem('scheduling-calendar-intro-seen') !== 'true') {
      setShowSchedulingIntro(true)
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="noise" aria-hidden="true" />

      <ArchiveHeader title="Nova campanha" showCampaigns={hasCampaigns} />

      <div className="archive-content">
        <div className="archive-page-heading">
          <p className="eyebrow">Painel do Narrador</p>
          <h1 className="mt-3 font-serif text-4xl uppercase tracking-[0.08em] sm:text-5xl">Criar mesa</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            Defina sua crÃ´nica, os recursos disponÃ­veis e as restriÃ§Ãµes antes de convidar os participantes.
          </p>
        </div>

        {createdId ? (
          <section className="login-panel text-center">
            <Check className="mx-auto size-10 text-primary" aria-hidden="true" />
            <p className="eyebrow mt-6">Mesa criada com sucesso</p>
            <h3 className="mt-3 font-serif text-3xl uppercase tracking-[0.08em]">{name}</h3>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
              Compartilhe o identificador abaixo com seus jogadores para vincularem seus personagens na mesa.
            </p>
            <div className="mt-6 flex flex-col items-center gap-5">
              <CopyId id={createdId} />
            </div>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/campaigns" className="button-primary inline-flex items-center gap-2">
                Ver minhas mesas <ArrowRight className="size-4" />
              </Link>
              <button
                type="button"
                onClick={() => { setCreatedId(null); setAllowExceptions(false); setExceptionCodes([]); setName(''); setTheme(''); setPrincipios(''); setLastSessionAt(''); setStatus('Ativa') }}
                className="button-ghost inline-flex items-center gap-2"
              >
                <Plus className="size-4" /> Criar outra
              </button>
            </div>
          </section>
        ) : (
          <form onSubmit={handleSubmit} className="new-campaign-form archive-campaign-form">
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
                  placeholder="Ex.: PolÃ­tica e traiÃ§Ã£o"
                />
              </label>
              <label className="sheet-field span-2">
                <span>PrincÃ­pios da crÃ´nica</span>
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
                <span>Ãšltimo encontro</span>
                <input
                  id="campaign-last-session"
                  type="date"
                  value={lastSessionAt}
                  onChange={(e) => setLastSessionAt(e.target.value)}
                />
              </label>
              <fieldset className="span-2 border border-border bg-card p-4"><legend>Quais clÃ£s serÃ£o permitidos?</legend><div className="mt-3 grid gap-2 sm:grid-cols-2">{clans.map(clan => <label key={clan.code} className="flex items-center gap-2 text-sm"><input type="checkbox" disabled={submitting} checked={enabledClanCodes.includes(clan.code)} onChange={event => setEnabledClanCodes(values => event.target.checked ? [...values, clan.code] : values.filter(code => code !== clan.code))} />{clan.name}</label>)}</div></fieldset>
              <fieldset className="span-2 border border-border bg-card p-4"><legend>Quais predaÃ§Ãµes serÃ£o permitidas?</legend><p className="mt-2 text-sm text-muted-foreground">ApÃ³s criar a campanha, os painÃ©is mostram somente os tipos usados pelas fichas vinculadas.</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{predatorTypes.map(predator => <label key={predator.code} className="flex items-center gap-2 text-sm"><input type="checkbox" disabled={submitting} checked={enabledPredatorCodes.includes(predator.code)} onChange={event => setEnabledPredatorCodes(values => event.target.checked ? [...values, predator.code] : values.filter(code => code !== predator.code))} />{predator.name}{predator.source !== 'COREBOOK' ? ' (' + PREDATOR_SOURCE_LABELS[predator.source] + ')' : ''}</label>)}</div></fieldset>
              <fieldset className="span-2 border border-border bg-card p-4"><legend>ExceÃ§Ãµes predefinidas de predaÃ§Ã£o</legend><label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={allowExceptions} disabled={submitting} onChange={event => { setAllowExceptions(event.target.checked); setExceptionCodes([]) }} />Permitir exceÃ§Ãµes de predaÃ§Ã£o nesta mesa</label>{allowExceptions && <div className="mt-3 flex flex-col gap-3">{CAMPAIGN_EXCEPTIONS.map(rule => <label key={rule.code} className="flex items-center gap-2 text-sm"><input type="checkbox" aria-labelledby={`exception-${rule.code}`} checked={exceptionCodes.includes(rule.code)} disabled={submitting} onChange={event => setExceptionCodes(values => event.target.checked ? [...values, rule.code] : values.filter(code => code !== rule.code))} /><span id={`exception-${rule.code}`}>{rule.name}</span></label>)}</div>}<p className="mt-3 text-xs text-muted-foreground">Definidas somente ao criar a mesa. NÃ£o habilitam predaÃ§Ãµes bloqueadas, nÃ£o concedem pontos e nÃ£o dispensam as demais regras.</p></fieldset>
              <label className="span-2 flex cursor-pointer items-start gap-3 border border-border bg-card p-4">
                <input
                  type="checkbox"
                  checked={enableSchedulingCalendar}
                  onChange={(event) => setEnableSchedulingCalendar(event.target.checked)}
                  className="mt-1 size-4 accent-primary"
                />
                <span><strong className="block text-sm">Habilitar calendÃ¡rio de marcaÃ§Ã£o</strong><span className="mt-1 block text-xs leading-5 text-muted-foreground">Permite que os participantes informem disponibilidade para os prÃ³ximos encontros.</span></span>
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
