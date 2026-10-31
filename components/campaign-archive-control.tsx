'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function CampaignArchiveControl({ id, name, archived }: Readonly<{ id: string; name: string; archived: boolean }>) {
  const router = useRouter()
  const [confirmationName, setConfirmationName] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage('')
    try {
      const response = await fetch(`/api/campaigns/${id}/archive`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ archived: !archived, confirmationName }) })
      const body = await response.json()
      if (!response.ok) { throw new Error(body.error ?? 'Não foi possível atualizar a mesa.') }
      setConfirmationName(''); setMessage(archived ? 'Mesa restaurada.' : 'Mesa arquivada. Histórico preservado.'); router.refresh()
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível atualizar a mesa.') }
    finally { setBusy(false) }
  }
  return <details className="border border-border bg-card p-5"><summary className="cursor-pointer font-serif text-xl">{archived ? 'Restaurar mesa' : 'Arquivar mesa'}</summary><form onSubmit={e => void submit(e)} className="mt-4 flex flex-col gap-4">
    <p className="text-sm text-muted-foreground">Arquivar retira a mesa da listagem principal e impede novas sessões. Fichas, imagens, anotações e histórico são preservados. A mesa pode ser restaurada.</p>
    <label className="sheet-field"><span>Digite o nome da mesa para confirmar: {name}</span><input required maxLength={name.length} value={confirmationName} disabled={busy} onChange={e => setConfirmationName(e.target.value)} /></label>
    <button className="button-ghost self-start" type="submit" disabled={busy || confirmationName !== name}>{busy ? 'Salvando…' : archived ? 'Restaurar mesa' : 'Confirmar arquivamento'}</button>
    {message && <output className="text-sm" aria-live="polite">{message}</output>}
  </form></details>
}
