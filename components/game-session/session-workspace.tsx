'use client'

import { useEffect, useState } from 'react'
import useSWR, { useSWRConfig } from 'swr'
import { LiveKitRoomLink } from '@/components/livekit/livekit-room-link'
import { SessionResources } from '@/components/character-summary/session-resources'
import { CharacterRolls } from '@/components/character-summary/character-rolls'
import { AwakePanel } from '@/components/awake-panel'
import { CampaignPossessionsManager } from '@/components/master-panel'
import { NotesPanel } from '@/components/notes/notes-panel'
import { NpcSessionPanel,SessionReveals } from '@/components/npcs/npc-session-panel'

type Snapshot = { session: { id: string; status: 'ACTIVE' | 'CLOSED'; revision: number; chronicleNightIds: string[] } | null; canManage: boolean; characters: { id: string; name: string }[] }
const read = async (url: string) => { const response = await fetch(url, { cache: 'no-store' }); const body = await response.json(); if (!response.ok) throw new Error(body.error ?? 'Não foi possível carregar a sessão.'); return body }

export function CampaignSessionWorkspace({ campaignId, actorId }: Readonly<{ campaignId: string; actorId: string }>) {
  const url = `/api/campaigns/${campaignId}/sessions`
  const { data, error, mutate } = useSWR<Snapshot>(url, read, { refreshInterval: 5000 })
  const { mutate: refresh } = useSWRConfig()
  const [selected, setSelected] = useState('')
  const [feedback, setFeedback] = useState('')
  const [closedNpcSession,setClosedNpcSession]=useState('')
  const manage = data?.canManage ?? false
  const current = data?.characters.find(character => character.id === selected) ?? data?.characters[0]
  const npcSessionId=data?.session?.id??closedNpcSession
  useEffect(()=>{const id=new URL(window.location.href).searchParams.get('npcSessionId');if(id&&/^[0-9a-f-]{36}$/i.test(id))setClosedNpcSession(id)},[])

  useEffect(() => {
    const sessionId = data?.session?.id
    if (!sessionId || data.session.status !== 'ACTIVE') return
    const timer = window.setInterval(() => {
      void Promise.allSettled([...(manage ? [refresh(`/api/campaigns/${campaignId}/nights/awake`)] : []), ...(data?.characters ?? []).flatMap(character => [refresh(`/api/characters/${character.id}/resources`), refresh(`/api/characters/${character.id}/rolls`)])])
    }, 5000)
    return () => window.clearInterval(timer)
  }, [campaignId, data?.characters, data?.session?.id, data?.session?.status, manage, refresh])

  async function command(method: 'POST' | 'PATCH', endpoint: string, body: object) {
    setFeedback('')
    const response = await fetch(endpoint, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
    const result = await response.json().catch(() => null)
    if (!response.ok) { setFeedback(result?.error ?? 'Não foi possível atualizar a sessão.'); await mutate(); return }
    const location=new URL(window.location.href)
    if(method==='PATCH'&&typeof result?.id==='string'){setClosedNpcSession(result.id);location.searchParams.set('npcSessionId',result.id)}
    else if(method==='POST'){setClosedNpcSession('');location.searchParams.delete('npcSessionId')}
    window.history.replaceState(window.history.state,'',location.toString())
    await mutate()
  }

  return <div className="flex flex-col gap-6">
    <header className="border border-border bg-card p-5"><p className="eyebrow">Modo sessão</p><h1 className="mt-2 font-serif text-3xl">Mesa em andamento</h1><p className="mt-2 text-sm text-muted-foreground">Recursos e rolagens usam os comandos oficiais da ficha. A sala de vídeo é opcional.</p>{feedback && <p role="status" className="mt-3 text-sm text-muted-foreground">{feedback}</p>}{error && <p role="alert" className="mt-3 text-sm text-primary">{error.message}</p>}{!data?.session && manage && <button className="button-primary mt-4 min-h-10" onClick={() => void command('POST', url, { idempotencyKey: crypto.randomUUID() })}>Iniciar sessão</button>}{data?.session?.status === 'ACTIVE' && manage && <button className="button-ghost mt-4 min-h-10" onClick={() => void command('PATCH', `/api/sessions/${data.session.id}`, { idempotencyKey: crypto.randomUUID(), expectedRevision: data.session.revision })}>Encerrar sessão</button>}</header>
    <details className="border border-border bg-card p-5"><summary className="cursor-pointer font-serif text-xl">Videochamada</summary><div className="mt-5"><LiveKitRoomLink campaignId={campaignId} master={manage} /></div></details>
    {npcSessionId&&<NpcSessionPanel sessionId={npcSessionId} campaignId={campaignId}/>}
    {data?.session?.status === 'ACTIVE' && <>
      {data.characters.length > 0 && <label className="sheet-field"><span>Ficha desta sessão</span><select className="select" value={current?.id ?? ''} onChange={event => setSelected(event.target.value)}>{data.characters.map(character => <option key={character.id} value={character.id}>{character.name}</option>)}</select></label>}
      {current && <div className="grid gap-5 xl:grid-cols-2"><SessionResources key={`resources-${current.id}`} characterId={current.id} sessionId={data.session.id} /><CharacterRolls key={`rolls-${current.id}`} characterId={current.id} sessionId={data.session.id} /></div>}
      {manage && <><AwakePanel campaignId={campaignId} sessionId={data.session.id} /><CampaignPossessionsManager campaignId={campaignId} sessionId={data.session.id} /></>}
      <details className="border border-border bg-card p-5"><summary className="cursor-pointer font-serif text-xl">Anotações da mesa</summary><div className="mt-5"><NotesPanel actorId={actorId} initialCampaignId={campaignId} /></div></details>
      <SessionReveals sessionId={data.session.id}/>
    </>}
    {!data?.session && !error && <p className="border border-border bg-card p-5 text-sm text-muted-foreground">Aguardando o Narrador iniciar uma sessão.</p>}
  </div>
}
