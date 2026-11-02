import { redirect } from 'next/navigation'
import { getSessionOrDev } from '@/lib/auth0'
import { CampaignSessionWorkspace } from '@/components/game-session/session-workspace'
import { getCampaignById } from '@/lib/campaigns'

export default async function CampaignSessionPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  const auth = await getSessionOrDev()
  if (!auth?.user?.sub) redirect('/auth/login?returnTo=/campaigns')
  const { id } = await params
  const campaign = await getCampaignById(id)
  return <main className="session-page-shell min-h-screen bg-background text-foreground">
    <CampaignSessionWorkspace campaignId={id} actorId={auth.user.sub} campaignName={campaign?.name ?? null} />
  </main>
}
