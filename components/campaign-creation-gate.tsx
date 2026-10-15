'use client'

import { useEffect, useState } from 'react'

export type AcceptedCampaignInvitation = { campaignId: string; token: string; accepted: true }
type CampaignRules = { id: string; name: string; clans: { code: string; name: string; allowed: boolean }[]; predatorTypes: { code: string; name: string; allowed: boolean }[]; exceptions: { code: string; name: string }[]; restrictions: string[] }

export function CampaignCreationGate({ onReady }: { onReady: (invitation: AcceptedCampaignInvitation | null) => void | Promise<void> }) {
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
    } catch (failure) { setError(failure instanceof TypeError ? 'Informe um link de convite válido.' : failure instanceof Error ? failure.message : 'Não foi possível consultar o convite.') }
    finally { setLoading(false) }
  }

  async function accept() {
    if (!invitation || !accepted || loading) return
    setLoading(true)
    setError(null)
    try { await onReady(invitation) }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Não foi possível aceitar o convite.') }
    finally { setLoading(false) }
  }

  return <main className="min-h-screen bg-background p-5 text-foreground"><section className="mx-auto flex max-w-3xl flex-col gap-5 border border-border bg-card p-6"><p className="eyebrow">Antes da ficha</p><h1 className="font-serif text-3xl">Você já tem uma mesa planejada?</h1><div className="flex flex-wrap gap-3"><button type="button" className="button-ghost" disabled={loading} onClick={() => void onReady(null)}>Não, criar ficha independente</button><button type="button" className="button-primary" disabled={loading} onClick={() => setPlanned(true)}>Sim, tenho convite do Narrador</button></div>{planned && <><label className="sheet-field"><span>Link de convite do Narrador</span><input value={link} disabled={loading} onChange={event => { setLink(event.target.value); setRules(null); setInvitation(null); setAccepted(false) }} /></label><button type="button" className="button-ghost self-start" disabled={loading || !link.trim()} onClick={() => void consult()}>{loading ? 'Consultando...' : 'Consultar regras da mesa'}</button>{error && <p role="alert" className="text-sm text-primary">{error}</p>}{rules && <><h2 className="font-serif text-2xl">{rules.name}</h2><p className="text-sm text-muted-foreground">O aceite concede participação como jogador ao salvar o primeiro rascunho. A ficha e seus pertences ainda seguem a revisão da mesa; sessões exigem convocação.</p>{[{ title: 'Clãs', values: rules.clans }, { title: 'Predações', values: rules.predatorTypes }].map(group => <section key={group.title}><h3 className="font-semibold">{group.title}</h3><ul className="mt-2 grid gap-2 text-sm sm:grid-cols-2">{group.values.map(value => <li key={value.code}>{value.name} — {value.allowed ? 'Permitido' : 'Não permitido'}</li>)}</ul></section>)}<h3 className="font-semibold">Restrições aplicáveis</h3><ul className="text-sm">{rules.restrictions.map(restriction => <li key={restriction}>{restriction}</li>)}</ul><h3 className="font-semibold">Exceções predefinidas</h3>{rules.exceptions.length ? <ul className="text-sm">{rules.exceptions.map(rule => <li key={rule.code}>{rule.name}</li>)}</ul> : <p className="text-sm text-muted-foreground">Nenhuma exceção. Aplicam-se as restrições normais de clã e predação.</p>}<label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={accepted} onChange={event => setAccepted(event.target.checked)} /><span>Li e estou ciente das restrições e exceções desta mesa</span></label><button type="button" className="button-primary self-start" disabled={loading || !accepted || !invitation} onClick={() => void accept()}>Aceitar convite e iniciar ficha</button></>}</>}</section></main>
}
