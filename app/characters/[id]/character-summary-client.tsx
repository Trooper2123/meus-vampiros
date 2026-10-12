'use client'

import { CharacterSummary } from '@/components/character-summary/character-summary'
import { useState } from 'react'

type CharacterData = {
  id: string
  name: string
  clan: string | null
  predator: string | null
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
  const [characterData, setCharacterData] = useState<CharacterData>(data)
  const [, setLoading] = useState(false)

  const handleResourcesChange = async (newResources: CharacterData['resources']) => {
    setLoading(true)
    const response = await fetch('/api/characters/resources', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ characterId: characterData.id, ...newResources }),
    })
    setLoading(false)
    if (response.ok) {
      const result = await response.json()
      setCharacterData({
        ...characterData,
        resources: result.resources,
      })
    }
  }

  return (
    <CharacterSummary data={characterData} onChangeResources={handleResourcesChange} />
  )
}
