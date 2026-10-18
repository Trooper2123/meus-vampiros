'use client'

import useSWR from 'swr'

const fetcher = async (url: string) => {
  const response = await fetch(url)
  const body = await response.json()
  if (!response.ok) throw new Error(body.error ?? 'Não foi possível carregar os clãs da mesa.')
  return body
}
export function CampaignClans({ campaignId }: Readonly<{ campaignId: string }>) {
  const { data, error, isLoading } = useSWR<{ clans: { code: string; name: string; bane: string; compulsion: string }[] }>(`/api/campaigns/${campaignId}/clans`, fetcher)
  return <section className="border border-border bg-card p-5" aria-labelledby="campaign-clans-title"><p className="eyebrow">Regras da crônica</p><h2 id="campaign-clans-title" className="mt-2 font-serif text-2xl">Clãs dos personagens</h2>
    {isLoading && <output>Carregando clãs...</output>}{error && <p role="alert">{error.message}</p>}{data && !error && data.clans.length === 0 && <p className="empty-state mt-4">Nenhum personagem desta mesa possui clã definido.</p>}
    {!error && data?.clans.map(clan => <details key={clan.code} className="mt-4 border border-border p-4"><summary className="cursor-pointer font-serif text-lg">{clan.name}</summary><p className="mt-3 text-sm">Perdição: {clan.bane}</p><p className="mt-2 text-sm">Compulsão: {clan.compulsion}</p></details>)}
  </section>
}
