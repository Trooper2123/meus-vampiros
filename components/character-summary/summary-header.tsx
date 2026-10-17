import { hasSummaryName } from '@/lib/vtm-v5/summary'
import type { ReactNode } from 'react'

type SummaryHeaderProps = {
  actions?: ReactNode
  name: string
  clan: string | null
  predator: string | null
  generation: string | null
  campaignName: string | null
  campaignTheme: string | null
}

export function SummaryHeader({ name, clan, predator, generation, campaignName, campaignTheme, actions }: SummaryHeaderProps) {
  return <section className="archive-page-heading">
    <p className="eyebrow">{[clan, predator, generation].filter(hasSummaryName).join(' · ') || 'Ficha de personagem'}</p>
    <div className="mt-5 flex flex-wrap items-center gap-4">
      <h1 className="font-serif text-4xl uppercase sm:text-6xl">{hasSummaryName(name) ? name : 'Resumo da ficha'}</h1>
      {actions}
    </div>
    {(hasSummaryName(campaignName) || hasSummaryName(campaignTheme)) && <p className="mt-5 text-sm text-muted-foreground">{[campaignName, campaignTheme].filter(hasSummaryName).join(' · ')}</p>}
  </section>
}
