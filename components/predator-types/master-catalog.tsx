'use client'

import useSWR from 'swr'
import type { MasterPredatorTypeDto } from '@/lib/vtm-v5/predator-types'

const fetcher = async (url: string) => {
  const response = await fetch(url)
  const body = await response.json()
  if (!response.ok) throw new Error(body.error ?? 'Não foi possível carregar as predações da mesa.')
  return body
}

export function MasterPredatorCatalog({ campaignId }: Readonly<{ campaignId: string }>) {
  const { data, error, isLoading } = useSWR<{ predatorTypes: MasterPredatorTypeDto[] }>(`/api/campaigns/${campaignId}/predator-types`, fetcher)
  return <section className="border border-border bg-card p-5" aria-labelledby="master-predator-title">
    <p className="eyebrow">Regras da crônica</p><h2 id="master-predator-title" className="mt-2 font-serif text-2xl">Predações dos personagens</h2><p className="mt-2 text-sm text-muted-foreground">Somente os tipos utilizados pelas fichas atualmente vinculadas à mesa.</p>
    {isLoading && <output className="block mt-4 text-sm">Carregando predações...</output>}{error && <p role="alert" className="mt-4 text-sm text-primary">{error.message}</p>}
    {data && !error && data.predatorTypes.length === 0 && <p className="empty-state mt-4">Nenhum personagem desta mesa possui predação definida.</p>}
    <div className="mt-5 flex flex-col gap-3">{!error && data?.predatorTypes.map(entry => <details key={entry.code} className="border border-border p-4"><summary className="cursor-pointer font-serif text-lg">{entry.name}</summary><div className="mt-4 grid gap-4 lg:grid-cols-3"><div><p className="eyebrow">Visível ao jogador</p><p className="mt-2 text-sm">{entry.summary}</p><p className="mt-2 text-xs text-muted-foreground">Rolagem: {entry.predatorRoll}</p>{entry.sourceReference && <p className="mt-2 text-xs text-muted-foreground">Fonte: {entry.sourceReference}</p>}{entry.rulesText && <p className="mt-2 text-sm text-muted-foreground">{entry.rulesText}</p>}</div><div><p className="eyebrow">Ajustes mecânicos</p><p className="mt-2 text-sm text-muted-foreground">Especialidades: {entry.specialtyOptions.join(' ou ')}</p><p className="mt-2 text-sm text-muted-foreground">Disciplinas: {entry.disciplineOptions.join(' ou ')}</p><p className="mt-2 text-xs">{[...entry.bonusOptions, ...entry.flawsOrCosts].map(option => option.label).join(' · ')}</p></div><div><p className="eyebrow">Notas do Narrador</p><p className="mt-2 text-sm">{entry.validationNotes}</p><p className="mt-2 text-xs text-muted-foreground">Riscos: {entry.commonRisks.join(', ')}</p></div></div></details>)}</div>
  </section>
}
