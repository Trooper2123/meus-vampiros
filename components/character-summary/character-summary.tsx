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

export function CharacterSummary({ data, onChangeResources, specialties, resources, headerActions, clanDetails }: CharacterSummaryProps) {
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
      {resources}
      <SummaryAttributes attributes={data.attributes} />
      <SummarySkills skills={data.skills} />
      {specialties}
      <SummaryMerits merits={data.merits} flaws={data.flaws} grants={data.creationGrants} />
      <SummaryDisciplines disciplines={data.disciplines} grants={data.creationGrants} />
      {onChangeResources && (
        <SummaryResources resources={data.resources} maxima={maxima} onChange={handleResourcesChange} />
      )}
    </div>
  )
}
