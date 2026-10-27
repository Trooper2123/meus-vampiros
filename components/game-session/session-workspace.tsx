'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import useSWR, { SWRConfig, useSWRConfig } from 'swr'
import { LiveKitRoomLink } from '@/components/livekit/livekit-room-link'
import { SessionResources } from '@/components/character-summary/session-resources'
import { CharacterRolls } from '@/components/character-summary/character-rolls'
import { AwakePanel } from '@/components/awake-panel'
import { CampaignPossessionsManager } from '@/components/master-panel'
import { NotesPanel } from '@/components/notes/notes-panel'
import { NpcSessionPanel,SessionReveals } from '@/components/npcs/npc-session-panel'

type Snapshot = { session: { id: string; status: 'ACTIVE' | 'CLOSED'; revision: number; chronicleNightIds: string[] } | null; canManage: boolean; characters: { id: string; name: string }[] }
const read = async (url: string) => { const response = await fetch(url, { cache: 'no-store' }); const body = await response.json(); if (!response.ok) { throw new Error(body.error ?? 'Não foi possível carregar a sessão.'); } return body }

export function CampaignSessionWorkspace({ campaignId, actorId }: Readonly<{ campaignId: string; actorId: string }>) {
  return <SWRConfig key={`${actorId}:${campaignId}`} value={{ provider: () => new Map() }}><SessionWorkspace campaignId={campaignId} actorId={actorId} /></SWRConfig>
}

function SessionWorkspace({ campaignId, actorId }: Readonly<{ campaignId: string; actorId: string }>) {
  const url = `/api/campaigns/${campaignId}/sessions`
  const { data: snapshot, error, mutate } = useSWR<Snapshot>(url, read, { refreshInterval: 5000 })
  const data = error ? undefined : snapshot
  const { mutate: refresh } = useSWRConfig()
  const requestKeys = useRef<Record<string, string>>({})
  const sending = useRef(false)
  const [pending, setPending] = useState(false)
  const [selected, setSelected] = useState('')
  const [feedback, setFeedback] = useState('')
  const [closedNpcSession,setClosedNpcSession]=useState('')
  const manage = data?.canManage ?? false
  const activeSession = data?.session
  const current = data?.characters.find(character => character.id === selected) ?? data?.characters[0]
  const npcSessionId=data?.session?.id??closedNpcSession
  useEffect(()=>{const id=new URL(window.location.href).searchParams.get('npcSessionId');if(id&&/^[0-9a-f-]{36}$/i.test(id)){ setClosedNpcSession(id) }},[])

  useEffect(() => {
    const sessionId = data?.session?.id
    if (!sessionId || data?.session?.status !== 'ACTIVE') { return }
    const timer = window.setInterval(() => {
      void Promise.allSettled([...(manage ? [refresh(`/api/campaigns/${campaignId}/nights/awake`)] : []), ...(data?.characters ?? []).flatMap(character => [refresh(`/api/characters/${character.id}/resources`), refresh(`/api/characters/${character.id}/rolls`)])])
    }, 5000)
    return () => window.clearInterval(timer)
  }, [campaignId, data?.characters, data?.session?.id, data?.session?.status, manage, refresh])

  async function command(method: 'POST' | 'PATCH', endpoint: string, body: object) {
    if (sending.current) { return }
    sending.current = true
    setPending(true)
    setFeedback('')
    const operation = `${method}:${endpoint}:${JSON.stringify(body)}`
    requestKeys.current[operation] ??= crypto.randomUUID()
    try {
      const response = await fetch(endpoint, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...body, idempotencyKey: requestKeys.current[operation] }) })
      const result = await response.json().catch(() => null)
      if (!response.ok) { setFeedback(result?.error ?? 'Não foi possível atualizar a sessão.'); await mutate(); return }
      if (typeof result?.session?.id !== 'string') { throw new Error('Resposta de sessão inválida.') }
      const location = new URL(window.location.href)
      if (method === 'PATCH') { setClosedNpcSession(result.session.id); location.searchParams.set('npcSessionId', result.session.id) }
      else { setClosedNpcSession(''); location.searchParams.delete('npcSessionId') }
      window.history.replaceState(window.history.state, '', location.toString())
      delete requestKeys.current[operation]
      await mutate()
    } catch {
      setFeedback('Não foi possível confirmar a operação. Tente novamente para consultar o mesmo envio com segurança.')
    } finally {
      sending.current = false
      setPending(false)
    }
  }

  return <div className="flex flex-col gap-6">
    <header className="border border-border bg-card p-5"><p className="eyebrow">Modo sessão</p><h1 className="mt-2 font-serif text-3xl">Mesa em andamento</h1><p className="mt-2 text-sm text-muted-foreground">Recursos e rolagens usam os comandos oficiais da ficha. A sala de vídeo é opcional.</p>{feedback && <output  className="block mt-3 text-sm text-muted-foreground">{feedback}</output>}{error && <p role="alert" className="mt-3 text-sm text-primary">{error.message}</p>}{!data?.session && manage && <button className="button-primary mt-4 min-h-10" disabled={pending} onClick={() => void command('POST', url, {})}>Iniciar sessão</button>}{activeSession?.status === 'ACTIVE' && manage && <button className="button-ghost mt-4 min-h-10" disabled={pending} onClick={() => void command('PATCH', `/api/sessions/${activeSession.id}`, { expectedRevision: activeSession.revision })}>Encerrar sessão</button>}</header>
    {activeSession?.status === 'ACTIVE' && manage && <details className="border border-border bg-card p-5"><summary className="cursor-pointer font-serif text-2xl">Início da noite</summary><div className="mt-5"><AwakePanel campaignId={campaignId} sessionId={activeSession.id} /></div></details>}
    {activeSession?.status === 'ACTIVE' && <details className="border border-border bg-card p-5"><summary className="cursor-pointer font-serif text-2xl">Anotações da mesa</summary><div className="mt-5"><NotesPanel actorId={actorId} initialCampaignId={campaignId} /></div></details>}
    {data && <details className="border border-border bg-card p-5"><summary className="cursor-pointer font-serif text-2xl">Videochamada</summary><div className="mt-5"><LiveKitRoomLink campaignId={campaignId} master={manage} /></div></details>}
    {data&&npcSessionId&&<details className="border border-border bg-card p-5"><summary className="cursor-pointer font-serif text-2xl">NPCs da sessão</summary><div className="mt-5"><NpcSessionPanel sessionId={npcSessionId} campaignId={campaignId}/></div></details>}
    {data?.session?.status === 'ACTIVE' && <>
      {manage && <details className="border border-border bg-card p-5"><summary className="cursor-pointer font-serif text-2xl">Pesquisas da sessão</summary><nav className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap" aria-label="Pesquisas da sessão"><Link href="/master/catalogo" target="_blank" rel="noopener noreferrer" className="button-ghost">Pesquisa de habilidades</Link><Link href="/master/vantagens-defeitos" target="_blank" rel="noopener noreferrer" className="button-ghost">Pesquisa de vantagens e defeitos</Link></nav></details>}
      <details className="border border-border bg-card p-5"><summary className="cursor-pointer font-serif text-2xl">Ficha e rolagens</summary><div className="mt-5 flex flex-col gap-5">
      {!current && <p className="empty-state">Nenhuma ficha disponível nesta sessão.</p>}
      {data.characters.length > 0 && <label className="sheet-field"><span>Ficha desta sessão</span><select className="select" value={current?.id ?? ''} onChange={event => setSelected(event.target.value)}>{data.characters.map(character => <option key={character.id} value={character.id}>{character.name}</option>)}</select></label>}
      {current && <Link className="button-ghost self-start" href={`/characters/${current.id}/summary`} target="_blank" rel="noopener noreferrer">Abrir resumo completo da ficha</Link>}
      {current && <div className="grid gap-5 xl:grid-cols-2"><SessionResources key={`resources-${current.id}`} characterId={current.id} sessionId={data.session.id} /><CharacterRolls key={`rolls-${current.id}`} characterId={current.id} sessionId={data.session.id} /></div>}
      </div></details>
      {manage && <details className="border border-border bg-card p-5"><summary className="cursor-pointer font-serif text-2xl">XP e pertences</summary><div className="mt-5"><CampaignPossessionsManager campaignId={campaignId} sessionId={data.session.id} /></div></details>}
      <details className="border border-border bg-card p-5"><summary className="cursor-pointer font-serif text-2xl">Revelações da sessão</summary><div className="mt-5"><SessionReveals sessionId={data.session.id}/></div></details>
    </>}
    {!snapshot && !error && <output  className="block border border-border bg-card p-5 text-sm text-muted-foreground">Carregando sessão...</output>}
    {data && !data.session && <p className="border border-border bg-card p-5 text-sm text-muted-foreground">Aguardando o Narrador iniciar uma sessão.</p>}
  </div>
}
