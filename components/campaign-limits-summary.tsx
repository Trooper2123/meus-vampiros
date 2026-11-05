'use client'

import { useEffect, useState } from 'react'

type Limit = { id: string; category: 'LINE' | 'VEIL' | 'OTHER'; title: string }
const category: Record<Limit['category'], string> = { LINE: 'Linha', VEIL: 'Véu', OTHER: 'Acordo' }

export function CampaignLimitsSummary({ campaignId }: Readonly<{ campaignId: string }>) {
  const [limits, setLimits] = useState<Limit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(false)
    fetch(`/api/campaigns/${campaignId}/limits`, { cache: 'no-store', signal: controller.signal })
      .then(async response => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.error ?? 'Erro ao carregar limites')
        setLimits(data.limits ?? [])
      })
      .catch(() => { if (!controller.signal.aborted) setError(true) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [campaignId])

  if (loading) return <div className="campaign-empty-module"><p>Carregando acordos da mesa...</p></div>
  if (error) return <div className="campaign-empty-module"><p>Não foi possível carregar os acordos da mesa.</p></div>
  if (limits.length === 0) return <div className="campaign-empty-module"><p>Nenhum limite ou acordo cadastrado.</p></div>

  const counts = { LINE: 0, VEIL: 0, OTHER: 0 }
  for (const limit of limits) if (limit.category in counts) counts[limit.category]++

  return <div className="space-y-3 p-4">
    <p className="text-sm text-muted-foreground">{limits.length} {limits.length === 1 ? 'acordo registrado' : 'acordos registrados'} · {counts.LINE} linhas · {counts.VEIL} véus · {counts.OTHER} outros</p>
    <ul className="space-y-2">{limits.slice(0, 4).map(limit => <li key={limit.id} className="text-sm"><span className="font-semibold text-primary">{category[limit.category] ?? 'Acordo'}:</span> {limit.title}</li>)}</ul>
    {limits.length > 4 && <p className="text-xs text-muted-foreground">Mais {limits.length - 4} {limits.length - 4 === 1 ? 'acordo' : 'acordos'} na seção Limites.</p>}
  </div>
}
