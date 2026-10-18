'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function CampaignNpcCreator({ campaignId }: Readonly<{ campaignId: string }>) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [characterType, setCharacterType] = useState('HUMAN_NPC')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || !name.trim()) return
    setBusy(true)
    setError(null)
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/npcs`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name.trim(), characterType }) })
      const result = await response.json()
      if (!response.ok || typeof result?.id !== 'string' || !/^[0-9a-f-]{36}$/i.test(result.id)) throw new Error('Não foi possível criar o NPC.')
      router.push(`/characters/${result.id}/edit`)
    } catch {
      setError('Não foi possível criar o NPC. Confira os campos e tente novamente.')
    } finally {
      setBusy(false)
    }
  }

  return <section className="border border-border bg-card p-5" aria-labelledby="campaign-npc-title">
    <p className="eyebrow">Personagens do Narrador</p>
    <h2 id="campaign-npc-title" className="mt-2 font-serif text-2xl">Criar ficha de NPC</h2>
    <p className="mt-2 text-sm text-muted-foreground">O NPC ficará vinculado a esta mesa e visível apenas ao Narrador. Após criar o rascunho, complete a ficha no editor.</p>
    <form onSubmit={create} aria-busy={busy} className="mt-4 flex flex-col gap-6">
      <label className="sheet-field flex-1"><span>Nome do NPC</span><input className="input" required maxLength={120} value={name} disabled={busy} onChange={event => setName(event.target.value)} /></label>
      <label className="sheet-field"><span>Tipo de NPC</span><select className="select" value={characterType} disabled={busy} onChange={event => setCharacterType(event.target.value)}><option value="HUMAN_NPC">NPC humano</option><option value="VAMPIRE_NPC">NPC vampiro</option></select></label>
      <button type="submit" className="button-primary" disabled={busy || !name.trim()}>{busy ? 'Criando...' : 'Criar ficha de NPC'}</button>
    </form>
    {error && <p role="alert" className="mt-4 text-sm text-primary">{error}</p>}
  </section>
}
