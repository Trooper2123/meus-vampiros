import { ArchiveHeader } from '@/components/archive-header'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSessionOrDev } from '@/lib/auth0'
import { BookOpen, Plus, Layers, Users, CalendarDays, Archive, PauseCircle, CheckCircle2, ArrowLeft } from 'lucide-react'
import { getCampaignsForMaster, hasMasterAccess } from '@/lib/campaigns'
import { MasterPanel } from '@/components/master-panel'

export default async function CampaignsPage({ searchParams }: Readonly<{ searchParams: Promise<{ archived?: string; view?: string }> }>) {
  const query = await searchParams
  const showInactive = query?.view === 'inactive' || query?.archived === 'true'
  if (!process.env.AUTH0_DOMAIN || !process.env.AUTH0_CLIENT_ID || !process.env.AUTH0_SECRET || !process.env.AUTH0_CLIENT_SECRET) {
    const session = await getSessionOrDev()
    if (!session?.user) redirect('/auth/login?returnTo=/campaigns')
  }

  const session = await getSessionOrDev()
  if (!session?.user) redirect('/auth/login?returnTo=/campaigns')

  const userIsMaster = await hasMasterAccess(session.user)

  // A capacidade é comum; a consulta abaixo retorna somente mesas deste usuário.
  if (!userIsMaster) redirect('/master')

  const allCampaigns = await getCampaignsForMaster(session.user.sub)
  const isInactive = (status: string) => ['Arquivada', 'Pausada', 'Encerrada'].includes(status)
  const currentCampaigns = allCampaigns.filter(campaign => !isInactive(campaign.status))
  const inactiveCampaigns = allCampaigns.filter(campaign => isInactive(campaign.status))
  const campaigns = showInactive ? inactiveCampaigns : currentCampaigns
  const totalPlayers = campaigns.reduce((total, campaign) => total + campaign.playerCount, 0)
  const runningCampaigns = currentCampaigns.filter(campaign => campaign.status === 'Ativa')
  const campaignsWithSessions = campaigns.filter(campaign => Boolean(campaign.lastSessionAt)).length
  const pausedCampaigns = inactiveCampaigns.filter(campaign => campaign.status === 'Pausada').length
  const closedCampaigns = inactiveCampaigns.filter(campaign => campaign.status === 'Encerrada').length
  const archivedCampaigns = inactiveCampaigns.filter(campaign => campaign.status === 'Arquivada').length

  return (
    <main className={`relative min-h-screen overflow-hidden bg-background text-foreground campaigns-reference-shell ${showInactive ? "campaigns-inactive-view" : ""}`}>
      <div className="noise" aria-hidden="true" />

      <ArchiveHeader title="Campanhas" showCampaigns={allCampaigns.length > 0} variant="campaigns" campaignSection={showInactive ? "inactive" : "current"} />

      <div className="archive-content">
        <header className="archive-page-heading campaign-dashboard-heading">
          <div>
            <p className="eyebrow">Painel do Narrador / {showInactive ? 'Mesas inativas' : 'Visão geral'}</p>
            <h1 className="mt-3 font-serif text-4xl tracking-[0.02em] sm:text-6xl">{showInactive ? 'Mesas Inativas' : 'Campanhas'}</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
              {showInactive ? 'Consulte crônicas pausadas, encerradas ou arquivadas e retome seu gerenciamento.' : 'Organize suas mesas, participantes, personagens e sessões.'}
            </p>
          </div>
          <div className="archive-page-actions campaign-dashboard-actions">
            {showInactive && <Link href="/campaigns" className="button-ghost inline-flex items-center justify-center gap-2"><ArrowLeft className="size-4"/>Mesas ativas</Link>}
            <Link href="/campaigns/new" id="btn-nova-campanha" className="button-primary inline-flex items-center justify-center gap-2">
              <Plus className="size-4" /> Nova campanha
            </Link>
          </div>
        </header>

        <section aria-label="Resumo das mesas" className="campaign-dashboard-stats">
          {showInactive ? <>
            <div><Archive className="size-6 text-primary" aria-hidden="true" /><span className="eyebrow">Mesas inativas</span><strong>{inactiveCampaigns.length}</strong></div>
            <div><PauseCircle className="size-6 text-primary" aria-hidden="true" /><span className="eyebrow">Pausadas</span><strong>{pausedCampaigns}</strong></div>
            <div><CheckCircle2 className="size-6 text-primary" aria-hidden="true" /><span className="eyebrow">Encerradas</span><strong>{closedCampaigns}</strong></div>
            <div><Archive className="size-6 text-primary" aria-hidden="true" /><span className="eyebrow">Arquivadas</span><strong>{archivedCampaigns}</strong></div>
          </> : <>
            <div><Layers className="size-6 text-primary" aria-hidden="true" /><span className="eyebrow">Campanhas</span><strong>{allCampaigns.length}</strong></div>
            <div><BookOpen className="size-6 text-primary" aria-hidden="true" /><span className="eyebrow">Mesas ativas</span><strong>{runningCampaigns.length}</strong></div>
            <div><CalendarDays className="size-6 text-primary" aria-hidden="true" /><span className="eyebrow">Mesas com encontros registrados</span><strong>{campaignsWithSessions}</strong></div>
            <div><Users className="size-6 text-primary" aria-hidden="true" /><span className="eyebrow">Participantes nesta visão</span><strong>{totalPlayers}</strong></div>
          </>}
        </section>

        <MasterPanel initialCampaigns={campaigns} view={showInactive ? 'inactive' : 'current'} />

      </div>
    </main>
  )
}
