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
  onRollAttribute?: (attribute: string) => void
  onRollSkill?: (skill: string) => void
}

export function CharacterSummary({ data, onChangeResources, onRollAttribute, onRollSkill, specialties, resources, headerActions, clanDetails }: Readonly<CharacterSummaryProps>) {
  const maxima = data.characterType === 'PLAYER_VAMPIRE' ? calculateSecondaryAttributes(data.attributes) : undefined
  const handleResourcesChange = (newResources: CharacterData['resources']) => {
    onChangeResources?.(newResources)
  }

  return (
    <div className="flex flex-col gap-6">
      <SummaryHeader
        actions={headerActions}
        name={data.name}
        clan={data.clan}
        predator={data.predator}
        generation={data.generation}
        campaignName={data.campaignName}
        campaignTheme={data.campaignTheme}
      />
      {clanDetails}
      {resources && <div id="recursos">{resources}</div>}
      {Boolean(data.convictions?.length) && <section className="border border-border bg-card p-6" aria-label="Pilares e convicções"><h2 className="mb-5 font-serif text-2xl">Pilares e convicções</h2><dl className="grid gap-4 sm:grid-cols-3">{data.convictions?.map(entry => <div key={`${entry.touchstone}:${entry.text}`}><dt className="font-semibold">{entry.touchstone || 'Pilar não informado'}</dt><dd className="mt-2 text-sm text-muted-foreground">{entry.text || 'Convicção não informada'}</dd></div>)}</dl></section>}
      <div id="atributos"><SummaryAttributes attributes={data.attributes} onRoll={onRollAttribute} /></div>
      <div id="habilidades"><SummarySkills skills={data.skills} onRoll={onRollSkill} /></div>
      {specialties}
      <div id="vantagens"><SummaryMerits merits={data.merits} flaws={data.flaws} grants={data.creationGrants} clan={data.clan} /></div>
      <div id="disciplinas"><SummaryDisciplines disciplines={data.disciplines} grants={data.creationGrants} /></div>
      {onChangeResources && (
        <SummaryResources resources={data.resources} maxima={maxima} onChange={handleResourcesChange} />
      )}
    </div>
  )
}
