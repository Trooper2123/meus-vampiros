import { MasterViewportGuard } from '@/components/master-viewport-guard'
import { redirect } from 'next/navigation'
import { getSessionOrDev } from '@/lib/auth0'
import { CampaignSessionWorkspace } from '@/components/game-session/session-workspace'
import Link from 'next/link'

export default async function CampaignSessionPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  const auth = await getSessionOrDev()
  if (!auth?.user?.sub) redirect('/auth/login?returnTo=/campaigns')
  const { id } = await params
  return <main className="session-page-shell min-h-screen bg-background text-foreground">
    <MasterViewportGuard backHref={`/campaigns/${id}`} />
    <div className="master-large-screen-only">
      <header className="session-narrator-topbar">
        <Link className="session-back-link" href={`/campaigns/${id}`}>← Voltar à mesa</Link>
        <div className="session-breadcrumb"><span>Gestão da Mesa</span><b>›</b><strong>Sessão</strong></div>
      </header>
      <div className="session-page-content"><CampaignSessionWorkspace campaignId={id} actorId={auth.user.sub} /></div>
    </div>
  </main>
}
