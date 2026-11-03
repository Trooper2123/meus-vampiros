'use client'

import { useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { BookOpen, CalendarDays, Download, FileText, FolderKanban, FolderOpen, Home, NotebookPen, Play, ShieldAlert, Users } from 'lucide-react'
import { CampaignTools } from '@/components/campaign-calendar/campaign-tools'
import { NotesPanel } from '@/components/notes/notes-panel'
import { CampaignCoteriePanel } from '@/components/coterie/campaign-coterie-panel'
import { PlayerProjectsPanel } from '@/components/projects/player-projects-panel'
import type { PlayerCampaign } from '@/lib/player-campaigns'
import type { CampaignEvent } from '@/lib/types/campaign-event'
import type { PlayerHandout } from '@/lib/player-handouts'

export type PlayerCampaignTab = 'overview'|'files'|'notes'|'events'|'calendar'|'coterie'|'projects'
type Tab = PlayerCampaignTab
type SessionResponse = {session?:{id:string;status:'ACTIVE'|'CLOSED'}|null}
type NotePreview = {id:string;title:string;updatedAt:string;marker?:string|null}
const fetcher = async (url:string) => {
  const response = await fetch(url,{cache:'no-store'})
  const body = await response.json().catch(()=>null)
  if(!response.ok) throw new Error(body?.error ?? 'Não foi possível carregar as informações.')
  return body
}
function niceDate(value: string | Date | null | undefined){
  if(!value) return 'Sem data definida'
  const dt = new Date(value)
  return Number.isNaN(dt.getTime()) ? 'Sem data definida' : new Intl.DateTimeFormat('pt-BR',{dateStyle:'medium',timeZone:'UTC'}).format(dt)
}

function PortalPanel({title,subtitle,icon:Icon,children}:Readonly<{title:string;subtitle?:string;icon:typeof FileText;children:React.ReactNode}>) {
  return <section className="player-portal-card">
    <div className="player-portal-card-heading"><Icon className="size-6" aria-hidden="true"/><div><h2>{title}</h2>{subtitle&&<p>{subtitle}</p>}</div></div>
    {children}
  </section>
}

export function PlayerCampaignPortal({campaign,actorId,initialTab='overview'}:Readonly<{campaign:PlayerCampaign;actorId:string;initialTab?:PlayerCampaignTab}>) {
  const [tab,setTab]=useState<Tab>(initialTab)
  const openTab=(next:Tab)=>{
    setTab(next)
    // Atualiza o deep link sem sair do hub nem desmontar o banner.
    const url=new URL(window.location.href)
    if(next==='overview')url.searchParams.delete('tab')
    else url.searchParams.set('tab',next)
    window.history.replaceState(window.history.state,'',url.pathname+url.search+url.hash)
  }
  const {data:filesData,error:filesError} = useSWR<{files:PlayerHandout[]}>(`/api/campaigns/${campaign.id}/player-handouts`,fetcher,{refreshInterval:30000})
  const {data:eventsData,error:eventsError}=useSWR<{events:CampaignEvent[]}>(`/api/campaign-events?campaignId=${campaign.id}`,fetcher,{refreshInterval:60000})
  const {data:notesData}=useSWR<{notes:NotePreview[]}>(`/api/notes?page=1&campaignId=${campaign.id}`,fetcher,{refreshInterval:30000})
  const {data:sessionData}=useSWR<SessionResponse>(`/api/campaigns/${campaign.id}/sessions`,fetcher,{refreshInterval:10000})
  const active = sessionData?.session?.status === 'ACTIVE'
  const files = filesData?.files ?? []
  const events = (eventsData?.events ?? []).filter(e=>e.visibility==='everyone')
  const datedEvents = events.filter(e=>e.eventDate && e.eventDate >= new Date().toISOString().slice(0,10)).sort((a,b)=>(a.eventDate??'').localeCompare(b.eventDate??''))
  const notes = notesData?.notes ?? []
  const tabs=[
    {id:'overview' as const,label:'Visão da Mesa',Icon:Home},
    {id:'files' as const,label:'Arquivos',Icon:FolderOpen},
    {id:'notes' as const,label:'Anotações',Icon:NotebookPen},
    {id:'events' as const,label:'Eventos',Icon:CalendarDays},
    {id:'calendar' as const,label:'Calendário',Icon:CalendarDays},
    {id:'coterie' as const,label:'Coterie',Icon:Users},
    {id:'projects' as const,label:'Projetos',Icon:FolderKanban},
  ]
  return <div className="player-portal-workspace">
    <div className="player-portal-campaign-banner">
      <div className="player-portal-cover-art" aria-hidden="true"><BookOpen className="size-11"/></div>
      <div className="player-portal-banner-info">
        <p className="eyebrow">Área do Jogador · Arquivos da Noite</p>
        <h1>{campaign.name}</h1>
        <div className="player-portal-meta"><span><Users className="size-4"/>Narrador: {campaign.masterName || 'Não informado'}</span><span>{campaign.characterCount} ficha(s) vinculada(s)</span><span className="player-portal-status">{campaign.status}</span></div>
      </div>
      <div className="player-portal-banner-actions">
        {active ? <Link className="button-primary" href={`/campaigns/${campaign.id}/session`}><Play className="size-4"/>Entrar na sessão</Link> : <span className="player-portal-session-off"><ShieldAlert className="size-4"/>Nenhuma sessão em andamento. Arquivos e calendários continuam acessíveis.</span>}
      </div>
    </div>
    <nav className="player-portal-tabs" aria-label="Áreas da mesa">{tabs.map(({id,label,Icon})=><button type="button" key={id} onClick={()=>openTab(id)} aria-current={tab===id?'page':undefined} aria-pressed={tab===id} className={tab===id?'is-active':''}><Icon className="size-5"/>{label}</button>)}</nav>
    {tab==='overview' && <div className="player-portal-overview">
      <PortalPanel title="Sobre a Campanha" icon={BookOpen}>
        <p className="player-portal-description">{campaign.theme || 'O Narrador ainda não definiu o tema da crônica.'}</p>
        {campaign.principios&&<p className="player-portal-principles"><strong>Princípios da mesa:</strong> {campaign.principios}</p>}
      </PortalPanel>
      <PortalPanel title="Próximos Eventos" icon={CalendarDays}>
        <button type="button" className="player-portal-see-all" onClick={()=>openTab('events')}>Ver todos →</button>
        {eventsError&&<p role="alert">Falha ao carregar eventos.</p>}
        {!eventsData&&!eventsError&&<p className="player-portal-muted">Carregando...</p>}
        {eventsData&&datedEvents.length===0&&<p className="player-portal-muted">Nenhum evento futuro publicado.</p>}
        {datedEvents.slice(0,3).map(e=><div className="player-portal-list-row" key={e.id}><CalendarDays className="size-5"/><div><strong>{e.title}</strong><small>{niceDate(e.eventDate)} {e.eventTime ? '· '+e.eventTime : ''}</small></div></div>)}
      </PortalPanel>
      <PortalPanel title="Arquivos Recentes" icon={FolderOpen}>
        <button type="button" className="player-portal-see-all" onClick={()=>openTab('files')}>Ver todos →</button>
        {filesError&&<p role="alert">Falha ao carregar arquivos compartilhados.</p>}
        {!filesData&&!filesError&&<p className="player-portal-muted">Carregando...</p>}
        {filesData&&files.length===0&&<p className="player-portal-muted">Nenhum arquivo foi compartilhado com você.</p>}
        {files.slice(0,3).map(file=><div className="player-portal-list-row" key={file.id}><FileText className="size-5"/><div><strong>{file.title}</strong><small>{file.fileName}</small></div><a className="player-portal-file-download" aria-label={`Baixar ${file.title}`} href={`/api/campaigns/${campaign.id}/player-handouts/${file.id}`}><Download className="size-4"/></a></div>)}
      </PortalPanel>
      <PortalPanel title="Anotações da Mesa" icon={NotebookPen}>
        <button type="button" className="player-portal-see-all" onClick={()=>openTab('notes')}>Ver todas →</button>
        {notes.length===0&&<p className="player-portal-muted">Nenhuma anotação disponível para você nesta mesa.</p>}
        {notes.slice(0,3).map(note=><button className="player-portal-list-row player-portal-note-preview" type="button" key={note.id} onClick={()=>openTab('notes')}><NotebookPen className="size-5"/><div><strong>{note.title}</strong><small>{note.marker || 'Sem marcador'} · {niceDate(note.updatedAt)}</small></div></button>)}
      </PortalPanel>
    </div>}
    {tab==='files'&&<PortalPanel title="Arquivos Compartilhados" subtitle="Somente documentos enviados à mesa inteira ou diretamente a você." icon={FolderOpen}>
      {filesError&&<p role="alert">Não foi possível acessar os arquivos. Confira a configuração do armazenamento.</p>}
      {!filesData&&!filesError&&<p className="player-portal-muted">Carregando documentos...</p>}
      {filesData&&files.length===0&&<p className="player-portal-muted">Nenhum arquivo compartilhado por enquanto.</p>}
      {files.map(file=><div className="player-portal-list-row" key={file.id}><FileText className="size-6"/><div><strong>{file.title}</strong><small>{file.fileName}{file.sizeBytes!=null ? ` · ${(file.sizeBytes/1024/1024).toFixed(1)} MB`:''} · {niceDate(file.createdAt)}</small></div><a className="button-ghost" href={`/api/campaigns/${campaign.id}/player-handouts/${file.id}`} aria-label={`Baixar ${file.fileName}`}><Download className="size-4"/>Baixar</a></div>)}
    </PortalPanel>}
    {tab==='notes'&&<PortalPanel title="Diário e Anotações" subtitle="Pesquise, organize por marcadores e mantenha seus registros privados." icon={NotebookPen}><div className="player-portal-notes"><NotesPanel actorId={actorId} initialCampaignId={campaign.id}/></div></PortalPanel>}
    {tab==='events'&&<PortalPanel title="Eventos da Crônica" subtitle="Eventos publicados para os participantes, incluindo datas narrativas." icon={CalendarDays}>
      {eventsError&&<p role="alert">Não foi possível carregar os eventos.</p>}
      {!eventsData&&!eventsError&&<p className="player-portal-muted">Carregando eventos...</p>}
      {eventsData&&events.length===0&&<p className="player-portal-muted">Nenhum evento visível nesta campanha.</p>}
      {events.map(event=><div className="player-portal-list-row" key={event.id}><CalendarDays className="size-5"/><div><strong>{event.title}</strong><small>{event.eventDate ? niceDate(event.eventDate) : `Crônica: ${event.fictionalMonth ?? ''} ${event.fictionalYear ?? ''}`}{event.eventTime?` · ${event.eventTime}`:''}</small>{event.description&&<p>{event.description}</p>}</div></div>)}
    </PortalPanel>}
    {tab==='calendar'&&<PortalPanel title="Calendários e Disponibilidade" subtitle="Consulte o calendário da campanha e marque sua disponibilidade para encontros." icon={CalendarDays}><CampaignTools campaignId={campaign.id} master={false}/></PortalPanel>}
    {tab==='coterie'&&<CampaignCoteriePanel campaignId={campaign.id} onOpenProjects={()=>openTab('projects')}/>}
    {tab==='projects'&&<PlayerProjectsPanel campaignId={campaign.id}/>}

  </div>
}
