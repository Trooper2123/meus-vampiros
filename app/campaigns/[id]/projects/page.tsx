import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { BookOpen, CalendarDays, ChevronLeft, Crown, FolderKanban, Home, Play, Users } from 'lucide-react'
import { getSessionOrDev } from '@/lib/auth0'
import { ensureAllTables } from '@/lib/db'
import { getCampaignsForMaster } from '@/lib/campaigns'
import { getPlayerCampaign } from '@/lib/player-campaigns'
import { getCampaignProjects } from '@/lib/projects-service'
import { CampaignProjectsPanel } from '@/components/projects/campaign-projects-panel'
import { PlayerProjectsPanel } from '@/components/projects/player-projects-panel'

export default async function CampaignProjectsPage({params}:Readonly<{params:Promise<{id:string}>}>) {
 const auth=await getSessionOrDev()
 if(!auth?.user?.sub)redirect('/auth/login?returnTo=/campaigns')
 const {id}=await params
 await ensureAllTables()
 const masterCampaign=(await getCampaignsForMaster(auth.user.sub)).find(c=>c.id===id)
 const campaign=masterCampaign??await getPlayerCampaign(auth.user.sub,id)
 if(!campaign)notFound()
 try {await getCampaignProjects(auth.user.sub,id)}catch{notFound()}
 const root=masterCampaign?'/campaigns/'+id:'/campaigns/player/'+id
 return <main className="campaign-detail-ui campaign-management-approved relative min-h-screen overflow-hidden bg-background text-foreground">
  <div className="noise" aria-hidden="true"/>
  <div className="archive-content campaign-detail-ui-content campaign-management-content">
   <header className="campaign-approved-heading">
    <div className="campaign-management-title"><p className="eyebrow">Arquivos da Noite · {masterCampaign?'Narrador':'Jogador'}</p><h1 className="font-serif text-3xl sm:text-4xl">{campaign.name}</h1><p className="mt-1 text-sm text-muted-foreground">Projetos individuais, colaborações e empreendimentos da Coterie.</p></div>
    <div className="campaign-approved-heading-actions"><Link href={'/campaigns/'+id+'/session'} className="button-ghost"><Play className="size-4"/>Sessão</Link><Link href={root} className="button-ghost"><ChevronLeft className="size-4"/>Voltar à mesa</Link></div>
   </header>
   <div className="campaign-approved-layout">
    <aside className="campaign-approved-sidebar">
     <div className="campaign-approved-cover">
      <div className="campaign-approved-cover-art"><Crown className="size-7" aria-hidden="true"/></div>
      <strong className="font-serif text-xl">{campaign.name}</strong>
      <span>{campaign.theme??'Crônica sem tema definido'}</span>
     </div>
     <nav aria-label="Navegação da campanha">
      <Link href={root}><Home/>Visão da Mesa</Link>
      <Link href={masterCampaign?root+'?view=characters':'/characters'}><BookOpen/>Personagens</Link>
      <Link href={'/campaigns/'+id+'/projects'} className="is-active" aria-current="page"><FolderKanban/>Projetos</Link>
      <Link href={masterCampaign?root+'?view=coterie':root}><Users/>Coterie</Link>
      <Link href={masterCampaign?root+'?view=calendar':root}><CalendarDays/>Calendário</Link>
     </nav>
     <Link className="campaign-return-to-mesas" href={root}><ChevronLeft className="size-4"/>Voltar à mesa</Link>
    </aside>
    <div className="campaign-approved-main min-w-0">
     {masterCampaign ? <CampaignProjectsPanel campaignId={id}/> : <PlayerProjectsPanel campaignId={id}/>}
    </div>
   </div>
  </div>
 </main>
}
