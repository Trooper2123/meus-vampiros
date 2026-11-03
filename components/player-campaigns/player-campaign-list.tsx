import Link from 'next/link'
import { ArchiveHeader } from '@/components/archive-header'
import { getPlayerCampaigns, isInactiveCampaign } from '@/lib/player-campaigns'
import { BookOpen, CalendarDays, FolderOpen, Users } from 'lucide-react'

export async function PlayerCampaignList({actorId,inactive}:Readonly<{actorId:string;inactive:boolean}>) {
  const campaigns = (await getPlayerCampaigns(actorId)).filter(campaign => isInactiveCampaign(campaign.status) === inactive)
  return <main className="campaigns-reference-shell player-campaign-portal relative min-h-screen bg-background text-foreground">
    <div className="noise" aria-hidden="true"/>
    <ArchiveHeader title="Campanhas" variant="campaigns" campaignSection={inactive?'inactive':'current'}/>
    <div className="archive-content player-campaign-list-content">
      <div className="player-portal-heading">
        <p className="eyebrow">Arquivos da Noite / Visão do Jogador</p>
        <h1>{inactive?'Mesas inativas':'Minhas mesas'}</h1>
        <p>Crônicas das quais você participa como jogador(a). Consulte seus arquivos, anotações e calendários mesmo fora da sessão.</p>
      </div>
      <div className="player-portal-summary"><BookOpen className="size-6"/><span>{campaigns.length} {campaigns.length === 1?'mesa':'mesas'} {inactive?'inativas':'ativas'} com personagens vinculados</span></div>
      {campaigns.length === 0 ? <section className="player-portal-card player-portal-empty"><FolderOpen className="size-9"/><h2>Nenhuma mesa encontrada</h2><p>{inactive?'Você ainda não possui campanhas inativas vinculadas às suas fichas.':'Vincule um personagem a uma campanha para que ela apareça aqui.'}</p><Link href="/characters" className="button-ghost">Ver personagens</Link></section> :
        <div className="player-campaign-list-grid">{campaigns.map(campaign=><article key={campaign.id} className="player-portal-card player-campaign-list-card">
          <div className="player-campaign-card-art"><BookOpen className="size-10"/></div>
          <div><span className="eyebrow">{campaign.status}</span><h2>{campaign.name}</h2><p>{campaign.theme || 'Crônica sem tema definido.'}</p>
            <div className="player-campaign-card-meta"><span><Users className="size-4"/>{campaign.characterCount} {campaign.characterCount===1?'ficha vinculada':'fichas vinculadas'}</span>{campaign.masterName&&<span>Narrador: {campaign.masterName}</span>}</div>
          </div>
          <Link className="button-primary" href={`/campaigns/player/${campaign.id}`}>Acessar mesa <CalendarDays className="size-4"/></Link>
        </article>)}</div>}
    </div>
  </main>
}
