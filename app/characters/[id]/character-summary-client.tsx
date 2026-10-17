'use client'

import Link from 'next/link'

import { CharacterSummary } from '@/components/character-summary/character-summary'
import { SessionResources } from '@/components/character-summary/session-resources'
import { CharacterSpecialties } from '@/components/character-summary/character-specialties'
import { CharacterRolls } from '@/components/character-summary/character-rolls'
import { PlayerPredatorSummary } from '@/components/predator-types/player-predator-selector'
import { CharacterClanSummary } from '@/components/character-summary/character-clan'
import { BloodPotencySummary } from '@/components/character-summary/blood-potency-summary'
import type { CreationGrant } from '@/lib/vtm-v5/creation-grants'
import { hasSummaryName } from '@/lib/vtm-v5/summary'
import type { PredatorTypeSelection } from '@/lib/vtm-v5/predator-types'

type CharacterData = {
  id: string
  creationGrants?: CreationGrant[]
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
  return <div className="flex flex-col gap-6"><CharacterSummary clanDetails={data.characterType === 'PLAYER_VAMPIRE' ? <CharacterClanSummary characterId={data.id} /> : undefined} data={data} headerActions={<Link href={`/notes?targetType=${['HUMAN_NPC', 'VAMPIRE_NPC'].includes(data.characterType ?? '') ? 'NPC' : 'CHARACTER'}&targetId=${data.id}`} target="_blank" rel="noopener noreferrer" className="button-primary" aria-label="Anotações (abre em nova guia)">Anotações</Link>} resources={data.characterType === 'PLAYER_VAMPIRE' ? <SessionResources characterId={data.id} /> : undefined} specialties={data.characterType === 'PLAYER_VAMPIRE' ? <CharacterSpecialties characterId={data.id} /> : undefined} />{['PLAYER_VAMPIRE', 'VAMPIRE_NPC'].includes(data.characterType ?? '') && <BloodPotencySummary characterId={data.id} />}{data.characterType === 'PLAYER_VAMPIRE' && <CharacterRolls characterId={data.id} />}{hasSummaryName(data.predator) && data.predator && <PlayerPredatorSummary name={data.predator} roll={data.predatorRoll} source={data.predatorSource} selection={data.predatorSelection} />}</div>
}
