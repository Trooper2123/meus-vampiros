'use client'

import { ArchiveHeader } from '@/components/archive-header'
import { useEffect, useRef, useState } from 'react'

export type AcceptedCampaignInvitation = { campaignId: string; token: string; accepted: true }
type CampaignRules = { id: string; name: string; clans: { code: string; name: string; allowed: boolean }[]; predatorTypes: { code: string; name: string; allowed: boolean }[]; exceptions: { code: string; name: string }[]; restrictions: string[] }

export function CampaignCreationGate({ onReady, compact = false }: Readonly<{ compact?: boolean; onReady: (invitation: AcceptedCampaignInvitation | null) => void | Promise<void> }>) {
  const invitationDialog = useRef<HTMLDialogElement>(null)
  const [planned, setPlanned] = useState(false)
  const [link, setLink] = useState('')
  const [rules, setRules] = useState<CampaignRules | null>(null)
  const [invitation, setInvitation] = useState<AcceptedCampaignInvitation | null>(null)
  const [accepted, setAccepted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (window.location.hash.startsWith('#invite=')) {
      setLink(window.location.href)
      setPlanned(true)
      window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search)
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
    setAccepted(false)
    try {
      const url = new URL(link)
      const campaignId = url.searchParams.get('campaignId')
      const token = new URLSearchParams(url.hash.slice(1)).get('invite')
      const response = await fetch('/api/campaign-invitations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ campaignId, token }), cache: 'no-store' })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error ?? 'Convite inválido.')
      setRules(body)
      setInvitation({ campaignId: body.id, token: token!, accepted: true })
    } catch (error_) {
      let invitationError
      if (error_ instanceof TypeError) {
        invitationError = 'Informe um link de convite válido.'
      } else if (error_ instanceof Error) {
        invitationError = error_.message
      } else {
        invitationError = 'Não foi possível consultar o convite.'
      }
      setError(invitationError)
    }
    finally { setLoading(false) }
  }

  async function accept() {
    if (!invitation || !accepted || loading) return
    setLoading(true)
    setError(null)
    try { await onReady(invitation) }
    catch (error_) { setError(error_ instanceof Error ? error_.message : 'Não foi possível aceitar o convite.') }
    finally { setLoading(false) }
  }

  const Container = compact ? 'div' : 'main'
  return <Container className={compact ? "mt-4" : "min-h-screen bg-background text-foreground"}>{!compact && <ArchiveHeader title="Nova ficha" />}<section className={compact ? "flex flex-col gap-4" : "archive-content flex flex-col gap-8"}>{!compact && <><p className="eyebrow">Antes de começar</p><h1 className="font-serif text-4xl uppercase sm:text-5xl">Você já tem uma mesa para se juntar?</h1><p className="text-sm text-muted-foreground">Sem mesa, siga com uma ficha independente. Com convite do Narrador, consulte as regras antes de criar.</p></>}<div className="flex flex-wrap gap-3">{!compact && <button type="button" className="button-ghost" disabled={loading} onClick={() => void onReady(null)}>Não, criar ficha independente</button>}<button type="button" className="button-primary" disabled={loading} onClick={() => setPlanned(true)}>{compact ? 'Vincular com convite do Narrador' : 'Sim, tenho convite do Narrador'}</button></div><dialog ref={invitationDialog} onCancel={() => setPlanned(false)} onClose={() => setPlanned(false)} aria-labelledby="invitation-dialog-title" className="archive-dialog m-auto max-h-[90dvh] gap-5 w-[min(48rem,95vw)] overflow-y-auto border border-border bg-card p-6 text-foreground backdrop:bg-background/80"><div className="mb-5 flex items-center justify-between gap-4"><h2 id="invitation-dialog-title" className="font-serif text-2xl">Convite do Narrador</h2><button type="button" className="button-ghost" onClick={() => setPlanned(false)}>Fechar</button></div><label className="sheet-field"><span>Link de convite do Narrador</span><input value={link} disabled={loading} onChange={event => { setLink(event.target.value); setRules(null); setInvitation(null); setAccepted(false) }} /></label><button type="button" className="button-ghost self-start" disabled={loading || !link.trim()} onClick={() => void consult()}>{loading ? 'Consultando...' : 'Consultar regras da mesa'}</button>{error && <p role="alert" className="text-sm text-primary">{error}</p>}{rules && <><h2 className="font-serif text-2xl">{rules.name}</h2><p className="text-sm text-muted-foreground">O aceite concede participação como jogador ao salvar o primeiro rascunho. A ficha e seus pertences ainda seguem a revisão da mesa; sessões exigem convocação.</p>{[{ title: 'Clãs', values: rules.clans }, { title: 'Predações', values: rules.predatorTypes }].map(group => <section key={group.title}><h3 className="font-semibold">{group.title}</h3><ul className="mt-2 grid gap-2 text-sm sm:grid-cols-2">{group.values.map(value => <li key={value.code}>{value.name} — {value.allowed ? 'Permitido' : 'Não permitido'}</li>)}</ul></section>)}<h3 className="font-semibold">Restrições aplicáveis</h3><ul className="text-sm">{rules.restrictions.map(restriction => <li key={restriction}>{restriction}</li>)}</ul><h3 className="font-semibold">Exceções predefinidas</h3>{rules.exceptions.length ? <ul className="text-sm">{rules.exceptions.map(rule => <li key={rule.code}>{rule.name}</li>)}</ul> : <p className="text-sm text-muted-foreground">Nenhuma exceção. Aplicam-se as restrições normais de clã e predação.</p>}<label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={accepted} onChange={event => setAccepted(event.target.checked)} /><span>Li e estou ciente das restrições e exceções desta mesa</span></label><button type="button" className="button-primary self-start" disabled={loading || !accepted || !invitation} onClick={() => void accept()}>{compact ? 'Aceitar convite e vincular ficha' : 'Aceitar convite e iniciar ficha'}</button></>}</dialog></section></Container>
}
