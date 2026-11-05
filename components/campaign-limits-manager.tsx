'use client'

import { useCallback, useEffect, useState } from 'react'

type Limit = { id: string; category: 'LINE' | 'VEIL' | 'OTHER'; title: string; description: string }
const labels: Record<Limit['category'], string> = { LINE: 'Linha — conteúdo excluído', VEIL: 'Véu — conteúdo fora de cena', OTHER: 'Outro acordo' }
const empty = { category: 'LINE' as Limit['category'], title: '', description: '' }

export function CampaignLimitsManager({ campaignId }: Readonly<{ campaignId: string }>) {
  const [items, setItems] = useState<Limit[]>([])
  const [form, setForm] = useState(empty)
  const [editing, setEditing] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const url = `/api/campaigns/${campaignId}/limits`

  const refresh = useCallback(async () => {
    const response = await fetch(url, { cache: 'no-store' })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error ?? 'Não foi possível carregar os limites.')
    setItems(data.limits ?? [])
  }, [url])

  useEffect(() => {
    let active = true
    fetch(url, { cache: 'no-store' }).then(async response => {
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Não foi possível carregar os limites.')
      if (active) setItems(data.limits ?? [])
    }).catch(err => { if (active) setError(err instanceof Error ? err.message : 'Erro ao carregar limites.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [url])

  function begin(item: Limit) {
    setEditing(item.id)
    setForm({ category: item.category, title: item.title, description: item.description })
    setError('')
    setNotice('')
  }

  function reset() {
    setEditing(null)
    setForm(empty)
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    setBusy(true); setError(''); setNotice('')
    try {
      const response = await fetch(editing ? `${url}/${editing}` : url, {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Não foi possível salvar o limite.')
      await refresh()
      reset()
      setNotice(editing ? 'Limite atualizado.' : 'Limite adicionado.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar.')
    } finally { setBusy(false) }
  }

  async function remove(item: Limit) {
    if (busy || !window.confirm(`Excluir o limite "${item.title}"? Esta ação não pode ser desfeita.`)) return
    setBusy(true); setError(''); setNotice('')
    try {
      const response = await fetch(`${url}/${item.id}`, { method: 'DELETE' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Não foi possível excluir o limite.')
      await refresh()
      if (editing === item.id) reset()
      setNotice('Limite excluído.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir.')
    } finally { setBusy(false) }
  }

  return <div className="space-y-6">
    <div className="rounded-lg border border-border bg-card/50 p-5">
      <h3 className="font-serif text-xl">Acordos da crônica</h3>
      <p className="mt-2 text-sm text-muted-foreground">Linhas são temas excluídos da narrativa. Véus podem existir na história, mas não são descritos em cena.</p>
      {loading ? <p className="mt-4 text-sm">Carregando limites...</p> : items.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">Nenhum limite cadastrado. Adicione o primeiro acordo abaixo.</p> :
        <ul className="mt-5 space-y-3">{items.map(item => <li key={item.id} className="rounded-md border border-border p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1"><p className="text-xs font-semibold uppercase tracking-wider text-primary">{labels[item.category]}</p><h4 className="mt-1 font-semibold">{item.title}</h4>{item.description && <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{item.description}</p>}</div>
            <div className="flex flex-wrap gap-2"><button type="button" className="button-ghost" disabled={busy} onClick={() => begin(item)}>Editar</button><button type="button" className="button-ghost" disabled={busy} onClick={() => void remove(item)}>Excluir</button></div>
          </div>
        </li>)}</ul>}
    </div>
    <form onSubmit={event => void submit(event)} className="space-y-4 rounded-lg border border-border bg-card/50 p-5">
      <h3 className="font-serif text-xl">{editing ? 'Editar limite' : 'Adicionar limite'}</h3>
      <label className="block text-sm font-semibold">Tipo
        <select className="mt-2 w-full rounded-md border border-border bg-background p-3 text-foreground" value={form.category} onChange={event => setForm(previous => ({ ...previous, category: event.target.value as Limit['category'] }))} disabled={busy}>
          {Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <label className="block text-sm font-semibold">Título
        <input className="mt-2 w-full rounded-md border border-border bg-background p-3 text-foreground" required maxLength={160} value={form.title} onChange={event => setForm(previous => ({ ...previous, title: event.target.value }))} disabled={busy} placeholder="Ex.: violência contra crianças" />
      </label>
      <label className="block text-sm font-semibold">Descrição ou observações
        <textarea className="mt-2 w-full rounded-md border border-border bg-background p-3 text-foreground" rows={3} maxLength={3000} value={form.description} onChange={event => setForm(previous => ({ ...previous, description: event.target.value }))} disabled={busy} />
      </label>
      <div className="flex flex-wrap gap-3"><button className="button-primary" disabled={busy} type="submit">{busy ? 'Salvando...' : editing ? 'Salvar alterações' : 'Adicionar limite'}</button>{editing && <button type="button" className="button-ghost" disabled={busy} onClick={reset}>Cancelar edição</button>}</div>
    </form>
    {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
    {notice && <p role="status" className="text-sm text-green-400">{notice}</p>}
  </div>
}
