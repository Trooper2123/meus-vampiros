'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { CharacterRolls } from '@/components/character-summary/character-rolls'

async function fetchCharacters(url: string): Promise<{ characters: { id: string; name: string }[] }> {
  const response = await fetch(url)
  const data = await response.json()
  if (!response.ok) throw new Error('Não foi possível carregar as fichas da chamada.')
  return data
}

export function CallRolls({ campaignId }: Readonly<{ campaignId: string }>) {
  const { data, error } = useSWR(`/api/campaigns/${campaignId}/call/roll-characters`, fetchCharacters)
  const [selected, setSelected] = useState('')
  const character = data?.characters.find(entry => entry.id === selected) ?? data?.characters[0]
  return <div className="mt-6 flex flex-col gap-4">
    {error && <p role="alert" className="text-sm">Não foi possível carregar as fichas para rolagem.</p>}
    {data?.characters.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma ficha aprovada e autorizada disponível para rolar nesta mesa.</p>}
    {character && <><label className="sheet-field"><span>Ficha para rolar durante a chamada</span><select className="select" value={character.id} onChange={event => setSelected(event.target.value)}>{data?.characters.map(entry => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label><CharacterRolls key={character.id} characterId={character.id} /></>}
  </div>
}
