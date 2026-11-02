'use client'

import { useEffect, useRef, useState } from 'react'
import { BookOpen, CalendarDays, FileText, MessageCircle, NotebookPen, Search, Users, Wallet, Eye, Target, UserRoundCog, House, Boxes, ImageIcon, Dices, Send, Pause, X } from 'lucide-react'
import Link from 'next/link'
import useSWR, { SWRConfig, useSWRConfig } from 'swr'
import { LiveKitRoomLink } from '@/components/livekit/livekit-room-link'
import { CharacterRolls } from '@/components/character-summary/character-rolls'
import { CampaignPossessionsManager } from '@/components/master-panel'
import { NotesPanel } from '@/components/notes/notes-panel'
import { NpcSessionPanel,SessionReveals } from '@/components/npcs/npc-session-panel'
import { CampaignTools } from '@/components/campaign-calendar/campaign-tools'
import { SessionQuickRoll } from '@/components/game-session/session-quick-roll'

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
  const [feedback, setFeedback] = useState('')
  const [activeTool, setActiveTool] = useState('shared')
  const [researchView, setResearchView] = useState<'skills' | 'merits'>('skills')
  const [closedNpcSession,setClosedNpcSession]=useState('')
  const manage = data?.canManage ?? false
  const activeSession = data?.session
  const current = data?.characters[0]
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

  return <div className="session-approved-layout">
    <header className="session-active-header">
      <div className="session-active-brand"><Boxes aria-hidden="true"/><div><p className="eyebrow">Painel do Narrador</p><h1>Mesa em andamento</h1><p>Controle e condução da sessão · recursos, comunicação e rolagens da mesa.</p></div></div>
      <div className="session-active-actions">{activeSession?.status === 'ACTIVE' && <><span className="session-live-status"><i/>Sessão em andamento</span><button className="button-ghost" type="button" disabled title="Pausa temporal será implementada em etapa própria"><Pause className="size-4"/>Pausar</button>{manage && <button className="button-primary" disabled={pending} onClick={() => void command('PATCH', `/api/sessions/${activeSession.id}`, { expectedRevision: activeSession.revision })}><X className="size-4"/>Encerrar</button>}</>}{!data?.session && manage && !data?.archived && <button className="button-primary" disabled={pending} onClick={() => void command('POST', url, {})}>Iniciar sessão</button>}</div>
      {feedback && <output className="session-header-feedback">{feedback}</output>}{error && <p role="alert" className="session-header-feedback">{error.message}</p>}
    </header>
    {data?.archived&&<p className="border border-border bg-card p-4 text-sm">Mesa arquivada. O histórico continua disponível; restaure a mesa para iniciar novas sessões.</p>}
    {!!data?.sessions?.length&&<label className="sheet-field"><span>Sessão para consultar anotações e revelações</span><select className="select" value={notesSessionId??''} onChange={event=>{const id=event.target.value;setClosedNpcSession(id);const location=new URL(window.location.href);location.searchParams.set('npcSessionId',id);window.history.replaceState(window.history.state,'',location.toString())}}>{data.sessions.map(session=><option key={session.id} value={session.id}>{new Date(session.startedAt).toLocaleString('pt-BR')} · {session.status==='ACTIVE'?'Em andamento':'Encerrada'}</option>)}</select></label>}
    {data && manage && <div className="session-master-shell">
      <aside className="session-chat" aria-label="Chat da mesa">
        <div className="session-column-heading"><MessageCircle className="size-6 text-primary" aria-hidden="true"/><div><p className="eyebrow">Comunicação</p><h2 className="font-serif text-xl">Chat da Mesa</h2></div><button type="button" className="session-icon-action" aria-label="Mais opções">•••</button></div>
        <div className="session-chat-log" aria-live="polite">
          <div className="session-chat-placeholder">
            <MessageCircle className="size-9 text-primary" strokeWidth={1.25} aria-hidden="true"/>
            <p className="mt-3 text-sm">Chat persistente da sessão</p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">A interface está preparada; o repositório ainda não possui armazenamento próprio de mensagens da mesa.</p>
          </div>
        </div>
        <label className="session-chat-compose"><span className="sr-only">Mensagem da mesa</span><textarea rows={2} disabled placeholder="Digite uma mensagem..." /><button type="button" disabled aria-label="Enviar mensagem"><Send className="size-4"/></button></label>
      </aside>

      <main className="session-center">
        <div className="session-center-heading">
          <div className="session-hub-title"><House className="size-7 text-primary"/><div><h2 className="font-serif text-2xl">Hub da Sessão</h2><p>Visão geral, comunicação e principais recursos da mesa.</p></div></div>
          <p className="text-xs text-muted-foreground">As abas trocam apenas o conteúdo central.</p>
        </div>

        <nav className="session-tabs" aria-label="Seções do modo sessão">
          {[
            { id: 'shared', label: 'Hub', Icon: House },
            { id: 'visual', label: 'Mesa Visual', Icon: Boxes },
            { id: 'handouts', label: 'Handouts', Icon: FileText },
            { id: 'research', label: 'Pesquisas', Icon: Search },
            { id: 'notes', label: 'Anotações', Icon: NotebookPen },
            { id: 'npcs', label: 'NPCs', Icon: Users },
            { id: 'reveals', label: 'Revelações', Icon: BookOpen },
            ...(manage ? [{ id: 'xp', label: 'XP e pertences', Icon: Wallet }] : []),
          ].map(({ id, label, Icon }) => <button key={id} type="button" aria-current={activeTool === id ? 'page' : undefined} className={`session-tab ${activeTool === id ? 'session-tab-active' : ''}`} onClick={() => setActiveTool(id)}><Icon className="size-4" aria-hidden="true"/>{label}</button>)}
        </nav>

        <section className="session-stage" aria-label="Conteúdo da seção selecionada">
          {activeTool === 'shared' && <div className="session-hub-grid">
            <section className="session-shared-visual">
              <div className="session-panel-heading"><ImageIcon className="size-7 text-primary"/><div><p className="eyebrow">Compartilhamento visual mútuo</p><h3 className="font-serif text-xl">Espaço visual compartilhado</h3><p className="session-panel-subtitle">Visual da sessão visível para toda a mesa (gerenciado pelo Narrador).</p></div><Eye className="ml-auto size-5 text-primary" aria-hidden="true"/></div>
              <div className="session-visual-stage session-visual-stage-compact">
                <div className="session-visual-placeholder"><ImageIcon/><span>Mapas, imagens e handouts compartilhados aparecem aqui.</span></div>
              </div>
            </section>
            <section className="session-quick-roll">
              <div className="session-panel-heading"><Dices className="size-7 text-primary"/><div><p className="eyebrow">Rolagem rápida</p><h3 className="font-serif text-xl">Rolagem rápida</h3><p className="session-panel-subtitle">Role testes, disputas e resistências de forma ágil.</p></div><span className="session-public-roll"><Eye className="size-3.5" aria-hidden="true"/>Visível aos jogadores</span></div>
              {!current && activeSession?.status === 'ACTIVE' && <SessionQuickRoll sessionId={activeSession.id} campaignId={campaignId}/>} 
              {current && activeSession?.status === 'ACTIVE' && <div className="mt-4"><CharacterRolls key={`hub-rolls-${current.id}`} characterId={current.id} sessionId={activeSession.id}/></div>}
            </section>
            <section className="session-quick-access">
              <div className="session-panel-heading"><div><p className="eyebrow">Configurável pelo Narrador</p><h3 className="font-serif text-xl">Acesso rápido</h3></div></div>
              <div className="mt-4 grid gap-2">
                <button type="button" className="session-shortcut" onClick={() => setActiveTool('npcs')}><UserRoundCog className="size-4" aria-hidden="true"/>NPCs da sessão</button>
                <button type="button" className="session-shortcut" disabled title="Objetivos ainda não possuem módulo próprio"><Target className="size-4" aria-hidden="true"/>Objetivos da campanha</button>
                <button type="button" className="session-shortcut" onClick={() => setActiveTool('calendar')}><CalendarDays className="size-4" aria-hidden="true"/>Calendário da mesa</button>
              </div>
            </section>
          </div>}

          {activeTool === 'visual' && <div className="session-panel"><p className="eyebrow">Mesa visual</p><h2 className="mt-2 font-serif text-2xl">Espaço visual compartilhado</h2><div className="session-visual-stage mt-5"><p className="max-w-lg text-sm leading-6 text-muted-foreground">Canvas compartilhado para mapas e imagens. A camada de sincronização ainda será implementada.</p></div></div>}

          {activeTool === 'handouts' && <div className="session-panel"><p className="eyebrow">Drive da mesa · gerenciado pelo Narrador</p><h2 className="mt-2 font-serif text-2xl">Handouts</h2><div className="session-handouts-empty"><FileText className="size-10 text-primary" strokeWidth={1.25} aria-hidden="true"/><p className="mt-3 text-sm">Nenhum handout disponível.</p><p className="mt-2 max-w-md text-xs leading-5 text-muted-foreground">O fluxo previsto é: selecionar um arquivo e escolher em popup entre compartilhar com todos ou apenas jogadores selecionados. O backend de handouts ainda não existe no repositório.</p></div></div>}

          {activeTool === 'research' && <div className="session-panel"><p className="eyebrow">Pesquisas já disponíveis</p><h2 className="mt-2 font-serif text-2xl">Pesquisa da mesa</h2><div className="session-research-switch mt-5"><button type="button" className={researchView === 'skills' ? 'is-active' : ''} onClick={() => setResearchView('skills')}><Search className="size-4" aria-hidden="true"/>Disciplinas e habilidades</button><button type="button" className={researchView === 'merits' ? 'is-active' : ''} onClick={() => setResearchView('merits')}><BookOpen className="size-4" aria-hidden="true"/>Vantagens e defeitos</button></div><iframe title={researchView === 'skills' ? 'Disciplinas e habilidades' : 'Vantagens e defeitos'} className="session-research-frame" src={researchView === 'skills' ? '/master/catalogo' : '/master/vantagens-defeitos'} /></div>}

          {activeTool === 'notes' && notesSessionId && <div className="session-panel"><p className="eyebrow">Subdivisões definidas pelo Narrador</p><h2 className="mt-2 font-serif text-2xl">Anotações da mesa</h2><div className="mt-5"><NotesPanel key={notesSessionId} actorId={actorId} initialCampaignId={campaignId} link={{targetType:'SESSION',targetId:notesSessionId}} /></div></div>}

          {activeTool === 'npcs' && npcSessionId && <div className="session-panel"><h2 className="font-serif text-2xl">NPCs da sessão</h2><div className="mt-5"><NpcSessionPanel sessionId={npcSessionId} campaignId={campaignId}/></div></div>}

          {activeTool === 'reveals' && notesSessionId && <div className="session-panel"><h2 className="font-serif text-2xl">Revelações da sessão</h2><div className="mt-5"><SessionReveals key={notesSessionId} sessionId={notesSessionId} active={data.session?.id===notesSessionId&&data.session.status==='ACTIVE'}/></div></div>}

          {activeTool === 'xp' && manage && activeSession?.status === 'ACTIVE' && <div className="session-panel"><h2 className="font-serif text-2xl">XP e pertences</h2><div className="mt-5"><CampaignPossessionsManager campaignId={campaignId} sessionId={activeSession.id}/></div></div>}

          {activeTool === 'calendar' && <div className="session-panel"><p className="eyebrow">Agenda da campanha</p><h2 className="mt-2 font-serif text-2xl">Calendário da mesa</h2><div className="mt-5"><CampaignTools campaignId={campaignId} master={manage}/></div></div>}
        </section>
      </main>

      <aside className="session-cameras" aria-label="Câmeras dos participantes">
        <div className="session-column-heading"><Users className="size-6 text-primary" aria-hidden="true"/><div><p className="eyebrow">Participantes</p><h2 className="font-serif text-xl">Participantes ({data.characters.length})</h2></div></div>
        
        <div className="mt-4"><LiveKitRoomLink campaignId={campaignId} master={manage} compact /></div>
        {data.characters.length > 0 && <div className="session-character-links"><p className="eyebrow">Resumos de ficha</p>{data.characters.map(character => <Link key={character.id} href={`/characters/${character.id}/summary`} target="_blank" rel="noopener noreferrer"><BookOpen className="size-3.5" aria-hidden="true"/>{character.name}</Link>)}</div>}
      </aside>
    </div>}
    {data && !manage && <section className="session-player-view"><p className="eyebrow">Sessão em andamento</p><h2 className="mt-2 font-serif text-2xl">Sua participação na mesa</h2><p className="mt-3 text-sm text-muted-foreground">A interface completa de condução é exclusiva do Narrador. Jogadores continuam com vídeo, ficha e rolagens pelos controles autorizados.</p><div className="mt-5"><LiveKitRoomLink campaignId={campaignId} master={false} /></div>{current && activeSession?.status === 'ACTIVE' && <div className="mt-5"><CharacterRolls characterId={current.id} sessionId={activeSession.id}/></div>}</section>}
    {!snapshot && !error && <output  className="block border border-border bg-card p-5 text-sm text-muted-foreground">Carregando sessão...</output>}
    {data && !data.session && <p className="border border-border bg-card p-5 text-sm text-muted-foreground">Aguardando o Narrador iniciar uma sessão.</p>}
  </div>
}
