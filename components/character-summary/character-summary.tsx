'use client'

import { SummaryHeader } from './summary-header'
import { SummaryAttributes } from './summary-attributes'
import { SummarySkills } from './summary-skills'
import { SummaryDisciplines } from './summary-disciplines'
import { SummaryResources } from './summary-resources'

type CharacterData = {
  id: string
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
  data: CharacterData
  onChangeResources?: (resources: CharacterData['resources']) => void
}

export function CharacterSummary({ data, onChangeResources }: CharacterSummaryProps) {
  const handleResourcesChange = (newResources: CharacterData['resources']) => {
    onChangeResources?.(newResources)
  }

  return (
    <div className="space-y-6">
      <SummaryHeader
        name={data.name}
        clan={data.clan}
        predator={data.predator}
        generation={data.generation}
        campaignName={data.campaignName}
        campaignTheme={data.campaignTheme}
      />
      <SummaryAttributes attributes={data.attributes} />
      <SummarySkills skills={data.skills} />
      <SummaryDisciplines disciplines={data.disciplines} />
      {onChangeResources && (
        <SummaryResources resources={data.resources} onChange={handleResourcesChange} />
      )}
    </div>
  )
}
