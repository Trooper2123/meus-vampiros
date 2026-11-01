'use client'

import { useEffect, useRef, useState } from 'react'
import { BookOpen, Clapperboard, Dice5, FileText, NotebookPen, Search, Users, Wallet, Moon, PanelRight, Eye } from 'lucide-react'
import Link from 'next/link'
import useSWR, { SWRConfig, useSWRConfig } from 'swr'
import { LiveKitRoomLink } from '@/components/livekit/livekit-room-link'
import { SessionResources } from '@/components/character-summary/session-resources'
import { CharacterRolls } from '@/components/character-summary/character-rolls'
import { AwakePanel } from '@/components/awake-panel'
import { CampaignPossessionsManager } from '@/components/master-panel'
import { NotesPanel } from '@/components/notes/notes-panel'
import { NpcSessionPanel,SessionReveals } from '@/components/npcs/npc-session-panel'

type Snapshot = { archived?: boolean; sessions?: {id:string;status:'ACTIVE'|'CLOSED';startedAt:string}[]; session: { id: string; status: 'ACTIVE' | 'CLOSED'; revision: number; chronicleNightIds: string[] } | null; canManage: boolean; characters: { id: string; name: string }[] }
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
  const [activeTool, setActiveTool] = useState('shared')
  const [closedNpcSession,setClosedNpcSession]=useState('')
  const manage = data?.canManage ?? false
  const activeSession = data?.session
  const current = data?.characters.find(character => character.id === selected) ?? data?.characters[0]
  const notesSessionId=data?.sessions?.find(session=>session.id===closedNpcSession)?.id??data?.session?.id??data?.sessions?.[0]?.id
  const npcSessionId=notesSessionId
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
    <header className="border border-border bg-card p-5"><p className="eyebrow">Modo sessão</p><h1 className="mt-2 font-serif text-3xl">Mesa em andamento</h1><p className="mt-2 text-sm text-muted-foreground">Recursos e rolagens usam os comandos oficiais da ficha. A sala de vídeo é opcional.</p>{feedback && <output  className="block mt-3 text-sm text-muted-foreground">{feedback}</output>}{error && <p role="alert" className="mt-3 text-sm text-primary">{error.message}</p>}{!data?.session && manage && !data?.archived && <button className="button-primary mt-4 min-h-10" disabled={pending} onClick={() => void command('POST', url, {})}>Iniciar sessão</button>}{activeSession?.status === 'ACTIVE' && manage && <button className="button-ghost mt-4 min-h-10" disabled={pending} onClick={() => void command('PATCH', `/api/sessions/${activeSession.id}`, { expectedRevision: activeSession.revision })}>Encerrar sessão</button>}</header>
    {data?.archived&&<p className="border border-border bg-card p-4 text-sm">Mesa arquivada. O histórico continua disponível; restaure a mesa para iniciar novas sessões.</p>}
    {!!data?.sessions?.length&&<label className="sheet-field"><span>Sessão para consultar anotações e revelações</span><select className="select" value={notesSessionId??''} onChange={event=>{const id=event.target.value;setClosedNpcSession(id);const location=new URL(window.location.href);location.searchParams.set('npcSessionId',id);window.history.replaceState(window.history.state,'',location.toString())}}>{data.sessions.map(session=><option key={session.id} value={session.id}>{new Date(session.startedAt).toLocaleString('pt-BR')} · {session.status==='ACTIVE'?'Em andamento':'Encerrada'}</option>)}</select></label>}
    {data && <div className="session-layout">
      <nav className="session-tools" aria-label="Ferramentas da sessão">
        <p className="eyebrow mb-4">Ferramentas</p>
        {[
          { id: 'shared', label: 'Mesa compartilhada', Icon: Eye },
          { id: 'sheet', label: 'Ficha e rolagens', Icon: Dice5 },
          { id: 'handouts', label: 'Handouts', Icon: FileText },
          { id: 'notes', label: 'Anotações', Icon: NotebookPen },
          { id: 'npcs', label: 'NPCs', Icon: Users },
          { id: 'reveals', label: 'Revelações', Icon: BookOpen },
          ...(manage ? [{ id: 'research', label: 'Pesquisas', Icon: Search }, { id: 'awake', label: 'Início da noite', Icon: Moon }, { id: 'xp', label: 'XP e pertences', Icon: Wallet }] : []),
        ].map(({ id, label, Icon }) => <button key={id} type="button" aria-current={activeTool === id ? 'page' : undefined} className={`session-tool ${activeTool === id ? 'session-tool-active' : ''}`} onClick={() => setActiveTool(id)}><Icon className="size-4 shrink-0" aria-hidden="true" />{label}</button>)}
      </nav>
      <section className="session-stage" aria-label="Conteúdo da sessão">
        {activeTool === 'shared' && <div className="session-visual-stage">
          <Clapperboard className="size-12 text-primary" strokeWidth={1.25} aria-hidden="true" />
          <h2 className="mt-4 font-serif text-2xl">Espaço visual da mesa</h2>
          <p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground">Área reservada para imagens, mapas e materiais compartilhados entre os participantes. A sincronização de conteúdo será disponibilizada com o drive de handouts da campanha.</p>
        </div>}
        {activeTool === 'handouts' && <div className="session-panel"><p className="eyebrow">Acervo da campanha</p><h2 className="mt-2 font-serif text-2xl">Handouts</h2><p className="mt-4 text-sm leading-6 text-muted-foreground">O drive da mesa e a distribuição de arquivos por participante ainda precisam ser habilitados no servidor. Quando disponíveis, o Narrador poderá escolher compartilhar com todos ou com jogadores específicos.</p><p className="mt-4 text-xs text-muted-foreground">Nenhum arquivo é compartilhado automaticamente.</p></div>}
        {activeTool === 'awake' && activeSession?.status === 'ACTIVE' && manage && <div className="session-panel"><h2 className="font-serif text-2xl">Início da noite</h2><div className="mt-5"><AwakePanel campaignId={campaignId} sessionId={activeSession.id} /></div></div>}
        {activeTool === 'notes' && notesSessionId && <div className="session-panel"><h2 className="font-serif text-2xl">Anotações da mesa</h2><div className="mt-5"><NotesPanel key={notesSessionId} actorId={actorId} initialCampaignId={campaignId} link={{targetType:'SESSION',targetId:notesSessionId}} /></div></div>}
        {activeTool === 'npcs' && npcSessionId && <div className="session-panel"><h2 className="font-serif text-2xl">NPCs da sessão</h2><div className="mt-5"><NpcSessionPanel sessionId={npcSessionId} campaignId={campaignId}/></div></div>}
        {activeTool === 'research' && manage && <div className="session-panel"><h2 className="font-serif text-2xl">Pesquisas da sessão</h2><nav className="mt-5 flex flex-col gap-3" aria-label="Pesquisas da sessão"><Link href="/master/catalogo" target="_blank" rel="noopener noreferrer" className="button-ghost">Disciplinas e habilidades</Link><Link href="/master/vantagens-defeitos" target="_blank" rel="noopener noreferrer" className="button-ghost">Vantagens e defeitos</Link></nav></div>}
        {activeTool === 'sheet' && activeSession?.status === 'ACTIVE' && <div className="session-panel"><h2 className="font-serif text-2xl">Ficha e rolagens</h2><div className="mt-5 flex flex-col gap-5">
          {!current && <p className="empty-state">Nenhuma ficha disponível nesta sessão.</p>}
          {data.characters.length > 0 && <label className="sheet-field"><span>Ficha desta sessão</span><select className="select" value={current?.id ?? ''} onChange={event => setSelected(event.target.value)}>{data.characters.map(character => <option key={character.id} value={character.id}>{character.name}</option>)}</select></label>}
          {current && <Link className="button-ghost self-start" href={`/characters/${current.id}/summary`} target="_blank" rel="noopener noreferrer">Abrir resumo completo da ficha</Link>}
          {current && <div className="grid gap-5"><SessionResources key={`resources-${current.id}`} characterId={current.id} sessionId={data.session.id} /><CharacterRolls key={`rolls-${current.id}`} characterId={current.id} sessionId={data.session.id} /></div>}
        </div></div>}
        {activeTool === 'xp' && manage && activeSession?.status === 'ACTIVE' && <div className="session-panel"><h2 className="font-serif text-2xl">XP e pertences</h2><div className="mt-5"><CampaignPossessionsManager campaignId={campaignId} sessionId={activeSession.id}/></div></div>}
        {activeTool === 'reveals' && notesSessionId && <div className="session-panel"><h2 className="font-serif text-2xl">Revelações da sessão</h2><div className="mt-5"><SessionReveals key={notesSessionId} sessionId={notesSessionId} active={data.session?.id===notesSessionId&&data.session.status==='ACTIVE'}/></div></div>}
      </section>
      <aside className="session-cameras" aria-label="Câmeras dos participantes">
        <div className="flex items-center justify-between gap-2"><div><p className="eyebrow">Comunicação</p><h2 className="mt-2 font-serif text-xl">Câmeras da mesa</h2></div><PanelRight className="size-5 text-primary" aria-hidden="true"/></div>
        <p className="mt-3 text-xs text-muted-foreground">Vídeo e áudio dos participantes. Não é necessário compartilhar a tela.</p>
        <div className="mt-4"><LiveKitRoomLink campaignId={campaignId} master={manage} compact /></div>
        {current && <Link href={`/characters/${current.id}/summary`} target="_blank" rel="noopener noreferrer" className="button-ghost mt-4 inline-flex w-full items-center justify-center gap-2"><BookOpen className="size-4" aria-hidden="true"/> Ver resumo da ficha</Link>}
      </aside>
    </div>}
    {!snapshot && !error && <output  className="block border border-border bg-card p-5 text-sm text-muted-foreground">Carregando sessão...</output>}
    {data && !data.session && <p className="border border-border bg-card p-5 text-sm text-muted-foreground">Aguardando o Narrador iniciar uma sessão.</p>}
  </div>
}
