'use client'

import Link from 'next/link'
import { useState } from 'react'

import { CharacterSummary } from '@/components/character-summary/character-summary'
import { CharacterAwakePanel } from '@/components/character-summary/character-awake-panel'
import { SessionResources } from '@/components/character-summary/session-resources'
import { DisciplineRollPanel } from '@/components/character-summary/discipline-roll-panel'
import { CharacterRolls } from '@/components/character-summary/character-rolls'
import { PlayerPredatorSummary } from '@/components/predator-types/player-predator-selector'
import { CharacterClanSummary } from '@/components/character-summary/character-clan'
import { BloodPotencySummary } from '@/components/character-summary/blood-potency-summary'
import type { CreationGrant } from '@/lib/vtm-v5/creation-grants'
import { hasSummaryName } from '@/lib/vtm-v5/summary'
import type { PredatorTypeSelection } from '@/lib/vtm-v5/predator-types'
import { SPECIALTY_SKILL_NAMES } from '@/lib/vtm-v5/skills'

type CharacterData = {
  id: string
  campaignId?: string | null
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

export function CharacterSummaryClient({ data }: Readonly<CharacterSummaryClientProps>) {
  const [rollPrefill, setRollPrefill] = useState<{ attribute?: string; skill?: string }>()
  const canRoll = data.characterType === 'PLAYER_VAMPIRE'
  const hasBloodPotency = ['PLAYER_VAMPIRE', 'VAMPIRE_NPC'].includes(data.characterType ?? '')
  return (
    <div className="character-summary-body">
      <nav className="character-summary-nav" aria-label="Navegação do dossiê">
        <a href="#visao-geral">Visão geral</a>
        <a href="#atributos">Atributos</a>
        <a href="#habilidades">Habilidades</a>
        <a href="#vantagens">Vantagens e defeitos</a>
        <a href="#disciplinas">Disciplinas</a>
        {hasBloodPotency && <a href="#potencia-de-sangue">Potência de Sangue</a>}
        {canRoll && <><a href="#recursos">Recursos</a><a href="#rolagens">Rolagens</a></>}
        {hasSummaryName(data.predator) && <a href="#predacao">Predação</a>}
      </nav>
      <div className="character-summary-content">
        <CharacterSummary
          onRollAttribute={canRoll ? attribute => setRollPrefill({ attribute }) : undefined}
          onRollSkill={canRoll ? skill => setRollPrefill({ skill: Object.entries(SPECIALTY_SKILL_NAMES).find(([, name]) => name === skill)?.[0] }) : undefined}
          clanDetails={data.characterType === 'PLAYER_VAMPIRE' ? <CharacterClanSummary characterId={data.id} /> : undefined}
          data={data}
          headerActions={<>
            {data.campaignId && data.characterType === 'PLAYER_VAMPIRE' && <Link href={`/campaigns/${data.campaignId}/session`} className="button-primary">Abrir sessão da mesa</Link>}
            <Link href={`/notes?targetType=${['HUMAN_NPC', 'VAMPIRE_NPC'].includes(data.characterType ?? '') ? 'NPC' : 'CHARACTER'}&targetId=${data.id}`} target="_blank" rel="noopener noreferrer" className="button-primary" aria-label="Anotações (abre em nova guia)">Anotações</Link>
            {data.characterType === 'PLAYER_VAMPIRE' && <Link href={`/characters/${data.id}/evolution`} target="_blank" rel="noopener noreferrer" className="button-ghost" aria-label="Evolução (abre em nova guia)">Evolução</Link>}
          </>}
          resources={canRoll ? <SessionResources characterId={data.id} /> : undefined}
        />
        {canRoll && <CharacterAwakePanel characterId={data.id} />}
        {hasBloodPotency && <div id="potencia-de-sangue"><BloodPotencySummary characterId={data.id} /></div>}
        {canRoll && <div id="rolagens"><DisciplineRollPanel characterId={data.id} /><CharacterRolls characterId={data.id} prefill={rollPrefill} /></div>}
        {hasSummaryName(data.predator) && data.predator && <div id="predacao"><PlayerPredatorSummary name={data.predator} roll={data.predatorRoll} source={data.predatorSource} selection={data.predatorSelection} /></div>}
      </div>
    </div>
  )
}
