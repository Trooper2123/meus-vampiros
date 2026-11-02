import { redirect } from 'next/navigation'
import { getSessionOrDev } from '@/lib/auth0'
import { CampaignSessionWorkspace } from '@/components/game-session/session-workspace'
import Link from 'next/link'

export default async function CampaignSessionPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  const auth = await getSessionOrDev()
  if (!auth?.user?.sub) redirect('/auth/login?returnTo=/campaigns')
  const { id } = await params
  return <main className="session-page-shell min-h-screen bg-background text-foreground"><div className="session-page-content"><Link className="button-ghost self-start" href={`/campaigns/${id}`}>Voltar à mesa</Link><CampaignSessionWorkspace campaignId={id} actorId={auth.user.sub} /></div></main>
}
