'use client'

import { ArchiveHeader } from '@/components/archive-header'
import { parseCampaignInvitationLink } from '@/lib/campaign-invitation-link'
import { useEffect, useRef, useState } from 'react'

export type AcceptedCampaignInvitation = { campaignId: string }
type CampaignRules = { id: string; name: string; clans: { code: string; name: string; allowed: boolean }[]; predatorTypes: { code: string; name: string; allowed: boolean }[]; exceptions: { code: string; name: string }[]; restrictions: string[] }

export function CampaignCreationGate({ onReady, compact = false }: Readonly<{ compact?: boolean; onReady: (invitation: AcceptedCampaignInvitation | null) => void | Promise<void> }>) {
  const invitationDialog = useRef<HTMLDialogElement>(null)
  const [planned, setPlanned] = useState(false)
  const [link, setLink] = useState('')
  const [rules, setRules] = useState<CampaignRules | null>(null)
  const [invitation, setInvitation] = useState<AcceptedCampaignInvitation | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    const url = new URL(window.location.href)
    if (url.searchParams.has('campaignId')) {
      setLink(url.toString())
      setPlanned(true)
    }
  }, [])

  useEffect(() => {
    if (planned) invitationDialog.current?.showModal()
    else invitationDialog.current?.close()
  }, [planned])

  async function consult() {
    setLoading(true)
    setError(null)
    setRules(null)
    setInvitation(null)
    try {
      const { campaignId } = parseCampaignInvitationLink(link)
      const response = await fetch('/api/campaign-invitations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ campaignId }), cache: 'no-store' })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error ?? 'Mesa não encontrada.')
      setRules(body)
      setInvitation({ campaignId: body.id })
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : 'Não foi possível consultar a mesa.')
    } finally { setLoading(false) }
  }

  async function accept() {
    if (!invitation || loading) return
    setLoading(true)
    setError(null)
    try { await onReady(invitation) }
    catch (error_) { setError(error_ instanceof Error ? error_.message : 'Não foi possível vincular à mesa.') }
    finally { setLoading(false) }
  }

  const Container = compact ? 'div' : 'main'
  return <Container className={compact ? 'mt-4' : 'min-h-screen bg-background text-foreground'}>{!compact && <ArchiveHeader title="Nova ficha" />}<section className={compact ? 'flex flex-col gap-4' : 'archive-content flex flex-col gap-8'}>{!compact && <><p className="eyebrow">Antes de começar</p><h1 className="font-serif text-4xl uppercase sm:text-5xl">Você já tem uma mesa para se juntar?</h1><p className="text-sm text-muted-foreground">Sem mesa, siga com uma ficha independente. Informe o ID compartilhado pelo Narrador para se juntar à mesa.</p></>}<div className="flex flex-wrap gap-3">{!compact && <button type="button" className="button-ghost" disabled={loading} onClick={() => void onReady(null)}>Não, criar ficha independente</button>}<button type="button" className="button-primary" disabled={loading} onClick={() => setPlanned(true)}>{compact ? 'Vincular à mesa' : 'Sim, tenho o ID da mesa'}</button></div><dialog ref={invitationDialog} onCancel={() => setPlanned(false)} onClose={() => setPlanned(false)} aria-labelledby="invitation-dialog-title" className="archive-dialog m-auto max-h-[90dvh] gap-5 w-[min(48rem,95vw)] overflow-y-auto border border-border bg-card p-6 text-foreground backdrop:bg-background/80"><div className="mb-5 flex items-center justify-between gap-4"><h2 id="invitation-dialog-title" className="font-serif text-2xl">Vincular à mesa</h2><button type="button" className="button-ghost" onClick={() => setPlanned(false)}>Fechar</button></div><label className="sheet-field"><span>ID ou link da mesa</span><input value={link} disabled={loading} onChange={event => { setLink(event.target.value); setRules(null); setInvitation(null) }} /></label><button type="button" className="button-ghost self-start" disabled={loading || !link.trim()} onClick={() => void consult()}>{loading ? 'Consultando...' : 'Consultar regras da mesa'}</button>{error && <p role="alert" className="text-sm text-primary">{error}</p>}{rules && <><h2 className="font-serif text-2xl">{rules.name}</h2><p className="text-sm text-muted-foreground">Ao informar o ID, você aceita participar da mesa e o Narrador consente com seu ingresso. A ficha e seus pertences ainda seguem a revisão da mesa; sessões exigem convocação.</p>{[{ title: 'Clãs', values: rules.clans }, { title: 'Predações', values: rules.predatorTypes }].map(group => <section key={group.title}><h3 className="font-semibold">{group.title}</h3><ul className="mt-2 grid gap-2 text-sm sm:grid-cols-2">{group.values.map(value => <li key={value.code}>{value.name} — {value.allowed ? 'Permitido' : 'Não permitido'}</li>)}</ul></section>)}{rules.restrictions.length > 0 && <><h3 className="font-semibold">Restrições aplicáveis</h3><ul className="text-sm">{rules.restrictions.map(restriction => <li key={restriction}>{restriction}</li>)}</ul></>}{rules.exceptions.length > 0 && <><h3 className="font-semibold">Exceções predefinidas</h3><ul className="text-sm">{rules.exceptions.map(rule => <li key={rule.code}>{rule.name}</li>)}</ul></>}<button type="button" className="button-primary self-start" disabled={loading || !invitation} onClick={() => void accept()}>{compact ? 'Vincular ficha à mesa' : 'Entrar na mesa e iniciar ficha'}</button></>}</dialog></section></Container>
}
