'use client'

import { CharacterSummary } from '@/components/character-summary/character-summary'
import { SessionResources } from '@/components/character-summary/session-resources'
import { CharacterSpecialties } from '@/components/character-summary/character-specialties'
import { CharacterRolls } from '@/components/character-summary/character-rolls'
import { PlayerPredatorSummary } from '@/components/predator-types/player-predator-selector'
import { CharacterClanSummary } from '@/components/character-summary/character-clan'
import { NotesBacklinks } from '@/components/notes/notes-panel'
import type { PredatorTypeSelection } from '@/lib/vtm-v5/predator-types'

type CharacterData = {
  id: string
  characterType?: string
  name: string
  clan: string | null
  predator: string | null
  predatorRoll?: string | null
  predatorSource?: string | null
  predatorSelection?: Partial<PredatorTypeSelection> | null
  generation: string | null
  campaignName: string | null
  campaignTheme: string | null
  attributes: Record<string, number>
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

type CharacterSummaryClientProps = {
  data: CharacterData
}

export function CharacterSummaryClient({ data }: CharacterSummaryClientProps) {
  return <div className="flex flex-col gap-6"><CharacterSummary data={data} /><NotesBacklinks targetType={['HUMAN_NPC', 'VAMPIRE_NPC'].includes(data.characterType ?? '') ? 'NPC' : 'CHARACTER'} targetId={data.id} />{data.characterType === 'PLAYER_VAMPIRE' && <><CharacterClanSummary characterId={data.id} /><SessionResources characterId={data.id} /><CharacterSpecialties characterId={data.id} /><CharacterRolls characterId={data.id} /></>}{data.predator && <PlayerPredatorSummary name={data.predator} roll={data.predatorRoll} source={data.predatorSource} selection={data.predatorSelection} />}</div>
}
