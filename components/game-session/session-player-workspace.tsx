'use client'

import { CampaignHandouts } from '@/components/campaign-handouts'

import { CharacterSms } from '@/components/character-sms/character-sms'
import { useState, type ComponentProps } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { BookOpen, CalendarDays, Dice5, Droplet, FileText, HeartPulse, MessageCircle, NotebookPen, ScrollText, Shield, Users, LogOut, X, MessageSquareText } from 'lucide-react'
import { LiveKitRoomLink } from '@/components/livekit/livekit-room-link'
import { CharacterSummary } from '@/components/character-summary/character-summary'
import { SessionSoundtrack } from './session-soundtrack'
import { DisciplineRollPanel } from '@/components/character-summary/discipline-roll-panel'
import { CharacterRolls } from '@/components/character-summary/character-rolls'
import { CharacterAwakePanel } from '@/components/character-summary/character-awake-panel'
import { SessionResources } from '@/components/character-summary/session-resources'
import { NotesPanel } from '@/components/notes/notes-panel'
import { CampaignTools } from '@/components/campaign-calendar/campaign-tools'

type Character = {id:string;name:string}
type CharacterData = ComponentProps<typeof CharacterSummary>['data']
type PlayerTab = 'sheet'|'diary'|'session'|'files'|'messages'
type QuickTool = 'roll'|'health'|'hunger'|'willpower'|null
const read = async (url:string) => {
  const response = await fetch(url,{cache:'no-store'})
  const body = await response.json()
  if(!response.ok) throw new Error(body.error ?? 'Falha ao carregar os dados.')
  return body
}

function PlayerSheet({characterId}:Readonly<{characterId:string}>) {
  const {data,error,isLoading,mutate}=useSWR<CharacterData>(`/api/characters/${characterId}/session-summary`,read,{refreshInterval:20000})
  return <div className="session-player-sheet">
    {isLoading && <output className="text-sm text-muted-foreground">Carregando ficha da personagem...</output>}
    {error && <div role="alert" className="session-player-error"><p>Não foi possível carregar a ficha.</p><button type="button" className="button-ghost" onClick={()=>void mutate()}>Tentar novamente</button></div>}
    {data && <CharacterSummary data={data} />}
  </div>
}

function PlayerQuickActions({characterId,sessionId}:Readonly<{characterId:string;sessionId:string}>) {
  const [active,setActive]=useState<QuickTool>(null)
  const {data}=useSWR<{state:{hunger:number;healthCurrent:number;willpowerCurrent:number};maxima:{healthMax:number;willpowerMax:number}}>(`/api/characters/${characterId}/resources`,read,{refreshInterval:5000})
  const actions = [
    {id:'roll' as const, label:'Rolagem',Icon:Dice5,value:'Testes V5'},
    {id:'health' as const,label:'Vitalidade',Icon:HeartPulse,value:data ? `${data.state.healthCurrent} / ${data.maxima.healthMax}` : '—'},
    {id:'hunger' as const,label:'Fome',Icon:Droplet,value:data ? `${data.state.hunger} / 5` : '—'},
    {id:'willpower' as const,label:'Willpower',Icon:Shield,value:data ? `${data.state.willpowerCurrent} / ${data.maxima.willpowerMax}` : '—'},
  ]
  return <section className="session-player-action-dock" aria-label="Ações rápidas durante a sessão">
    <div className="session-player-dock-header"><Dice5 className="size-5" aria-hidden="true"/><h2>Ações da Sessão</h2>{active && <button type="button" className="session-player-close-tool" aria-label="Fechar ações" onClick={()=>setActive(null)}><X className="size-4"/></button>}</div>
    <div className="session-player-action-buttons">
      {actions.map(({id,label,Icon,value})=><button key={id} type="button" className={active===id?'is-active':''} aria-pressed={active===id} onClick={()=>setActive(old=>old===id?null:id)}><Icon className="size-5"/><strong>{label}</strong><small>{value}</small></button>)}
    </div>
    {active && <div className="session-player-action-panel">
      {active==='roll' ? <><CharacterAwakePanel characterId={characterId} sessionId={sessionId}/><DisciplineRollPanel characterId={characterId} sessionId={sessionId}/><CharacterRolls characterId={characterId} sessionId={sessionId}/></> :
      <><p className="mb-3 text-xs text-muted-foreground">Ajustes de {active==='health'?'Vitalidade':active==='hunger'?'Fome':'Força de Vontade'} seguem as regras de dano e persistência da ficha.</p><SessionResources characterId={characterId} sessionId={sessionId} focus={active}/></>}
    </div>}
  </section>
}

export function SessionPlayerWorkspace({campaignId,actorId,sessionId,characters,campaignName}:Readonly<{campaignId:string;actorId:string;sessionId:string|null;characters:Character[];campaignName?:string|null}>) {
  const [tab,setTab]=useState<PlayerTab>('sheet')
  const [mobilePanel,setMobilePanel]=useState<'center'|'chat'|'cameras'>('center')
  const [selected,setSelected]=useState(characters[0]?.id??'')
  const {data:smsInbox}=useSWR<{enabled:boolean;threads:Array<{unreadCount:number}>}>(`/api/campaigns/${campaignId}/character-sms?view=player`,read,{refreshInterval:10000})
  const smsUnread=smsInbox?.enabled?smsInbox.threads.reduce((sum,thread)=>sum+Number(thread.unreadCount??0),0):0
  const current=characters.find(character=>character.id===selected)??characters[0]
  const tabs=[
    {id:'sheet' as const,label:'Ficha',Icon:ScrollText},
    {id:'diary' as const,label:'Anotações',Icon:NotebookPen},
    {id:'session' as const,label:'Sessão',Icon:CalendarDays},
    {id:'files' as const,label:'Arquivos',Icon:FileText},
    {id:'messages' as const,label:smsUnread>0?`Mensagens (${smsUnread})`:'Mensagens',Icon:MessageSquareText},
  ]
  return <div className="session-player-approved" aria-label="Modo Sessão do Jogador">
    <div className="session-player-title"><div><p className="eyebrow">Arquivos da Noite · Visão do Jogador</p><h1>{campaignName ? `Sessão: ${campaignName}` : "Minha Sessão"}</h1><p>Ficha, diário e recursos da crônica sem sair da mesa.</p></div><div className="session-player-title-actions"><span className="session-player-status">{sessionId?<><i/>Sessão em andamento</> :'Aguardando início da sessão'}</span><Link className="session-player-exit" href="/characters"><LogOut className="size-4"/>Sair da Sessão</Link></div></div>
    <nav className="session-mobile-panels" aria-label="Selecionar painel da sessão">{[{id:'center',label:'Ficha e recursos'},{id:'chat',label:'Chat'},{id:'cameras',label:'Câmeras'}].map(item=><button type="button" key={item.id} aria-pressed={mobilePanel===item.id} className={mobilePanel===item.id?'is-active':''} onClick={()=>setMobilePanel(item.id as 'center'|'chat'|'cameras')}>{item.label}</button>)}</nav>
    <div className="session-player-columns" data-mobile-panel={mobilePanel}>
      <aside className="session-player-chat" aria-label="Chat da sessão">
        <div className="session-player-column-header"><MessageCircle className="size-5"/><h2>Chat da Sessão</h2></div>
        <div id="session-player-livekit-chat" className="session-chat-mount">
          <div className="session-player-chat-placeholder"><MessageCircle className="size-8"/><p>Conecte-se à mesa virtual na lateral direita para conversar.</p><small>Mensagens temporárias via LiveKit.</small></div>
        </div>
      </aside>
      <main className="session-player-center">
        <nav className="session-player-tabs" aria-label="Seções da sessão">{tabs.map(({id,label,Icon})=><button type="button" key={id} aria-current={tab===id?'page':undefined} className={tab===id?'is-active':''} onClick={()=>setTab(id)}><Icon className="size-4"/>{label}</button>)}</nav>
        <div className="session-player-stage">
          {tab==='sheet' && (current ? <>
            {characters.length>1 && <label className="session-player-character-select">Personagem <select value={current.id} onChange={event=>setSelected(event.target.value)}>{characters.map(character=><option key={character.id} value={character.id}>{character.name}</option>)}</select></label>}
            <PlayerSheet key={current.id} characterId={current.id}/>
          </> : <div className="session-player-empty"><BookOpen className="size-8"/><h2>Nenhuma ficha autorizada nesta mesa</h2><p>Uma ficha aprovada e vinculada é necessária para participar com rolagens e recursos.</p></div>)}
          {tab==='diary' && <div className="session-player-diary"><div className="session-player-section-heading"><NotebookPen className="size-6"/><div><p className="eyebrow">Diário da Crônica</p><h2>Minhas Anotações</h2><p>Registre acontecimentos, agrupe capítulos por marcador e pesquise seus próprios registros.</p></div></div><NotesPanel actorId={actorId} initialCampaignId={campaignId}/></div>}
          {tab==='session' && <div className="session-player-events"><div className="session-player-section-heading"><CalendarDays className="size-6"/><div><p className="eyebrow">Minha participação</p><h2>Calendário e disponibilidade</h2><p>Consulte eventos e informe os dias em que pode participar.</p></div></div><CampaignTools campaignId={campaignId} master={false}/></div>}
          {tab==='messages' && <CharacterSms campaignId={campaignId} mode="player"/>}
          {tab==='files' && <div className="session-player-files"><h2 className="font-serif text-2xl">Arquivos recebidos</h2><CampaignHandouts campaignId={campaignId}/></div>}
        </div>
        {sessionId && <SessionSoundtrack sessionId={sessionId}/>} 
        {current && sessionId && <PlayerQuickActions characterId={current.id} sessionId={sessionId}/> }
        {(!current||!sessionId) && <div className="session-player-actions-unavailable">As ações de dados e recursos ficam disponíveis quando uma ficha autorizada participa de uma sessão ativa.</div>}
      </main>
      <aside className="session-player-cameras" aria-label="Câmeras da mesa">
        <div className="session-player-column-header"><Users className="size-5"/><h2>Participantes</h2></div>
        <LiveKitRoomLink campaignId={campaignId} master={false} compact chatTargetId="session-player-livekit-chat"/>
        <p className="session-player-video-hint">As câmeras permanecem nesta lateral enquanto você navega pelo Hub.</p>
      </aside>
    </div>
  </div>
}
