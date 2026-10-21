'use client'

import { useState } from 'react'

type Props = {
  characterId: string
  revision: number
  totalXp: number
  spentXp: number
  onImported: () => Promise<unknown>
}

export function HistoricalXpImport({ characterId, revision, totalXp, spentXp, onImported }: Readonly<Props>) {
  const [total, setTotal] = useState('50')
  const [spent, setSpent] = useState('47')
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')
  const received = Number(total)
  const consumed = Number(spent)
  const valid = total.trim() !== '' && spent.trim() !== '' &&
    Number.isSafeInteger(received) && Number.isSafeInteger(consumed) &&
    received >= 0 && received <= 1000000 && consumed >= 0 && consumed <= received
  const alreadyUsed = totalXp !== 0 || spentXp !== 0

  async function submit() {
    if (!valid || pending) return
    setPending(true)
    setMessage('')
    try {
      const response = await fetch('/api/characters/xp-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterId, expectedRevision: revision, totalXp: received,
          spentXp: consumed, idempotencyKey: crypto.randomUUID(),
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? 'Falha na importação.')
      await onImported()
      setMessage('Experiência histórica importada com sucesso.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Falha na importação.')
    } finally {
      setPending(false)
    }
  }

  return <section className="mb-6 border border-border bg-card p-5" aria-label="Importar experiência histórica">
    <h2 className="font-serif text-xl">Experiência anterior ao aplicativo</h2>
    <p className="mt-2 text-sm text-muted-foreground">Informe a experiência acumulada na mesa externa. Os pontos já usados não serão cobrados novamente ao transcrever sua ficha.</p>
    {alreadyUsed ? <p className="mt-3 text-sm">XP registrado: {totalXp} total, {spentXp} gasto e {totalXp - spentXp} disponível.</p> : <>
      <div className="sheet-grid sheet-grid-2 mt-4">
        <label className="sheet-field"><span>XP total recebido</span><input className="input" type="number" min="0" max="1000000" value={total} onChange={e => setTotal(e.target.value)} /></label>
        <label className="sheet-field"><span>XP já gasto</span><input className="input" type="number" min="0" max="1000000" value={spent} onChange={e => setSpent(e.target.value)} /></label>
      </div>
      <p className="mt-3 text-sm">XP restante: {valid ? received - consumed : '—'}</p>
      <button className="button-primary mt-4" type="button" disabled={!valid || pending} onClick={() => void submit()}>{pending ? 'Importando...' : 'Registrar XP histórico'}</button>
    </>}
    {message && <p className="mt-3 text-sm" role="status">{message}</p>}
  </section>
}
