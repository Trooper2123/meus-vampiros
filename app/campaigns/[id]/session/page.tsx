import { redirect } from 'next/navigation'
import { getSessionOrDev } from '@/lib/auth0'
import { CampaignSessionWorkspace } from '@/components/game-session/session-workspace'

export default async function CampaignSessionPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  const auth = await getSessionOrDev()
  if (!auth?.user?.sub) redirect('/auth/login?returnTo=/campaigns')
  const { id } = await params
  return <main className="min-h-screen bg-background text-foreground"><div className="archive-content py-8"><CampaignSessionWorkspace campaignId={id} actorId={auth.user.sub} /></div></main>
}
