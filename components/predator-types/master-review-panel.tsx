'use client'

import { useState } from 'react'

export function MasterPredatorReviewPanel() {
  const [characterId, setCharacterId] = useState('')
  const [ruleCode, setRuleCode] = useState('PREDATOR_TYPE_DISABLED_FOR_CAMPAIGN')
  const [justification, setJustification] = useState('')
  const [action, setAction] = useState<'CREATE' | 'REVOKE'>('CREATE')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setSubmitting(true); setMessage(null)
    const response = await fetch(`/api/characters/${characterId}/predator-type/override`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ruleCode, justification, action }) })
    const body = await response.json().catch(() => ({})); setSubmitting(false)
    setMessage(response.ok ? (action === 'CREATE' ? 'Override registrado e auditado.' : 'Override revogado e auditado.') : body.error ?? 'Não foi possível registrar o override.')
    if (response.ok) setJustification('')
  }

  return <section className="border border-border bg-card p-5" aria-labelledby="predator-review-title"><p className="eyebrow">Revisão excepcional</p><h2 id="predator-review-title" className="mt-2 font-serif text-2xl">Override de tipo de predação</h2><p className="mt-2 text-sm text-muted-foreground">A regra original permanece visível. Toda criação ou revogação exige justificativa e gera um evento no ledger.</p><form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={submit}><label className="sheet-field"><span>ID da ficha</span><input required value={characterId} onChange={(event) => setCharacterId(event.target.value)} placeholder="UUID da ficha" /></label><label className="sheet-field"><span>Regra</span><select className="select" value={ruleCode} onChange={(event) => setRuleCode(event.target.value)}><option value="PREDATOR_TYPE_DISABLED_FOR_CAMPAIGN">Tipo desabilitado na campanha</option><option value="PREDATOR_BAGGER_VENTRUE">Bagger para Ventrue</option><option value="PREDATOR_FARMER_RESTRICTED">Restrição de Farmer</option><option value="THIN_BLOOD_PREDATOR_REVIEW">Sangue-fraco recém-criado</option></select></label><label className="sheet-field"><span>Ação</span><select className="select" value={action} onChange={(event) => setAction(event.target.value as typeof action)}><option value="CREATE">Criar override</option><option value="REVOKE">Revogar override</option></select></label><label className="sheet-field sm:col-span-2"><span>Justificativa</span><textarea required maxLength={1000} rows={4} value={justification} onChange={(event) => setJustification(event.target.value)} placeholder="Explique a exceção narrativa e seu escopo." /></label><button className="button-primary sm:col-span-2 sm:justify-self-start" disabled={submitting || !characterId.trim() || !justification.trim()}>{submitting ? 'Registrando...' : action === 'CREATE' ? 'Registrar override' : 'Revogar override'}</button></form>{message && <p className="mt-4 text-sm text-muted-foreground" role="status">{message}</p>}</section>
}
