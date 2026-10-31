'use client'

import { SummaryHeader } from './summary-header'
import { SummaryAttributes } from './summary-attributes'
import { SummarySkills } from './summary-skills'
import { SummaryDisciplines } from './summary-disciplines'
import { SummaryResources } from './summary-resources'
import { SummaryMerits } from './summary-merits'
import type { ReactNode } from 'react'
import { calculateSecondaryAttributes } from '@/lib/vtm-v5/secondary-attributes'
import type { CreationGrant } from '@/lib/vtm-v5/creation-grants'

type CharacterData = {
  id: string
  creationGrants?: CreationGrant[]
  characterType?: string
  name: string
  clan: string | null
  predator: string | null
  generation: string | null
  campaignName: string | null
  campaignTheme: string | null
  attributes: {
    forca?: number
    destreza?: number
    vigor?: number
    carisma?: number
    manipulacao?: number
    compostura?: number
    inteligencia?: number
    raciocinio?: number
    determinacao?: number
  }
  convictions?: Array<{ touchstone: string; text: string }>
  skills: Record<string, number>
  merits: Array<{ name?: string; level?: number; description?: string }>
  flaws: Array<{ name?: string; level?: number; description?: string }>
  disciplines: Array<{
    id: string
    name: string
    level: number
    powers: Array<{
      effect?: string
      dicePool?: string
    }>
  }>
  resources: {
    humanidade: number
    vontade: number
    vitalidade: number
    fome: number
  }
}

type CharacterSummaryProps = {
  clanDetails?: ReactNode
  headerActions?: ReactNode
  resources?: ReactNode
  specialties?: ReactNode
  data: CharacterData
  onChangeResources?: (resources: CharacterData['resources']) => void
}

export function CharacterSummary({ data, onChangeResources, specialties, resources, headerActions, clanDetails }: Readonly<CharacterSummaryProps>) {
  const maxima = data.characterType === 'PLAYER_VAMPIRE' ? calculateSecondaryAttributes(data.attributes) : undefined
  const handleResourcesChange = (newResources: CharacterData['resources']) => {
    onChangeResources?.(newResources)
  }

  const statCards = [
    { label: 'Humanidade', value: data.resources.humanidade, total: 10 },
    { label: 'Fome', value: data.resources.fome, total: 5 },
    { label: 'Vitalidade', value: data.resources.vitalidade, total: maxima?.healthMax ?? 10 },
  ]

  return (
    <div className="character-summary-layout">
      <section className="character-summary-identity">
        <SummaryHeader
          actions={headerActions}
          name={data.name}
          clan={data.clan}
          predator={data.predator}
          generation={data.generation}
          campaignName={data.campaignName}
          campaignTheme={data.campaignTheme}
        />
      </section>
      <section className="character-summary-stats" aria-label="Recursos principais">
        {statCards.map((stat) => <article className="character-summary-stat" key={stat.label}><span>{stat.label}</span><div className="summary-stat-dots" aria-hidden="true">{Array.from({ length: stat.total }, (_, index) => <i key={index} className={index < stat.value ? 'is-filled' : ''} />)}</div><strong>{stat.value}/{stat.total}</strong></article>)}
      </section>
      <div className="character-summary-body">
        <nav className="character-summary-nav" aria-label="Navegação da ficha">
          <a className="is-active" href="#visao-geral">Visão geral</a>
          <a href="#ficha-v5">Ficha V5</a>
          <a href="#disciplinas">Disciplinas</a>
          <a href="#relacoes">Relações</a>
          <a href="#inventario">Inventário</a>
          <a href="#historia">História</a>
        </nav>
        <div className="character-summary-content" id="visao-geral">
          {clanDetails}
          {resources}
          {Boolean(data.convictions?.length) && <section className="border border-border bg-card p-6" aria-label="Pilares e convicções"><h2 className="mb-5 font-serif text-2xl">Pilares e convicções</h2><dl className="grid gap-4 sm:grid-cols-3">{data.convictions?.map(entry => <div key={`${entry.touchstone}:${entry.text}`}><dt className="font-semibold">{entry.touchstone || 'Pilar não informado'}</dt><dd className="mt-2 text-sm text-muted-foreground">{entry.text || 'Convicção não informada'}</dd></div>)}</dl></section>}
          <div id="ficha-v5"><SummaryAttributes attributes={data.attributes} /><SummarySkills skills={data.skills} /></div>
          {specialties}
          <div id="relacoes"><SummaryMerits merits={data.merits} flaws={data.flaws} grants={data.creationGrants} clan={data.clan} /></div>
          <div id="disciplinas"><SummaryDisciplines disciplines={data.disciplines} grants={data.creationGrants} /></div>
          {onChangeResources && <SummaryResources resources={data.resources} maxima={maxima} onChange={handleResourcesChange} />}
        </div>
      </div>
    </div>
  )
}
