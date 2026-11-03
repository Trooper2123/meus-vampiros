import { notFound, redirect } from 'next/navigation'
import { ArchiveHeader } from '@/components/archive-header'
import { PlayerCampaignPortal } from '@/components/player-campaigns/player-campaign-portal'
import { getPlayerCampaign, isInactiveCampaign } from '@/lib/player-campaigns'
import { getSessionOrDev } from '@/lib/auth0'

export default async function PlayerCampaignPage({params}:Readonly<{params:Promise<{id:string}>}>) {
  const session = await getSessionOrDev()
  if(!session?.user?.sub) redirect('/auth/login?returnTo=/campaigns')
  const {id} = await params
  const campaign = await getPlayerCampaign(session.user.sub,id)
  if(!campaign) notFound()
  return <main className="campaigns-reference-shell player-campaign-portal relative min-h-screen bg-background text-foreground">
    <div className="noise" aria-hidden="true"/>
    <ArchiveHeader title="Campanhas" variant="campaigns" campaignRole="player" campaignSection={isInactiveCampaign(campaign.status)?'inactive':'current'}/>
    <div className="archive-content player-campaign-portal-content">
      <PlayerCampaignPortal campaign={campaign} actorId={session.user.sub}/>
    </div>
  </main>
}
