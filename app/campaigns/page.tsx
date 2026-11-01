import { ArchiveHeader } from '@/components/archive-header'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSessionOrDev } from '@/lib/auth0'
import { BookOpen, Plus, Layers, Users, CalendarDays, Archive } from 'lucide-react'
import { getCampaignsForMaster, hasMasterAccess } from '@/lib/campaigns'
import { MasterPanel } from '@/components/master-panel'

export default async function CampaignsPage({ searchParams }: Readonly<{ searchParams: Promise<{ archived?: string }> }>) {
  const showArchived = (await searchParams)?.archived === 'true'
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
  const campaigns = allCampaigns.filter(campaign => (campaign.status === 'Arquivada') === showArchived)
  const activeCampaigns = allCampaigns.filter(campaign => campaign.status !== 'Arquivada')
  const archivedCampaigns = allCampaigns.filter(campaign => campaign.status === 'Arquivada')
  const totalPlayers = campaigns.reduce((total, campaign) => total + campaign.playerCount, 0)
  const runningCampaigns = activeCampaigns.filter(campaign => campaign.status === 'Ativa')
  const campaignsWithSessions = campaigns.filter(campaign => Boolean(campaign.lastSessionAt)).length

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground campaigns-reference-shell">
      <div className="noise" aria-hidden="true" />

      <ArchiveHeader title="Campanhas" showCampaigns={campaigns.length > 0} variant="campaigns" />

      <div className="archive-content">
        <header className="archive-page-heading campaign-dashboard-heading">
          <div>
            <p className="eyebrow">Painel do Narrador / {showArchived ? 'Arquivo' : 'Visão geral'}</p>
            <h1 className="mt-3 font-serif text-4xl tracking-[0.02em] sm:text-6xl">Campanhas</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
              Organize suas mesas, participantes, personagens e sessões.
            </p>
          </div>
          <div className="archive-page-actions campaign-dashboard-actions">
            <Link href="/campaigns/new" id="btn-nova-campanha" className="button-primary inline-flex items-center justify-center gap-2">
              <Plus className="size-4" /> Nova campanha
            </Link>
          </div>
        </header>

        <section aria-label="Resumo das mesas" className="campaign-dashboard-stats">
          <div><Layers className="size-6 text-primary" aria-hidden="true" /><span className="eyebrow">Campanhas</span><strong>{allCampaigns.length}</strong></div>
          <div><BookOpen className="size-6 text-primary" aria-hidden="true" /><span className="eyebrow">Mesas ativas</span><strong>{runningCampaigns.length}</strong></div>
          <div><CalendarDays className="size-6 text-primary" aria-hidden="true" /><span className="eyebrow">Mesas com encontros registrados</span><strong>{campaignsWithSessions}</strong></div>
          <div><Users className="size-6 text-primary" aria-hidden="true" /><span className="eyebrow">Participantes nesta visão</span><strong>{totalPlayers}</strong></div>
        </section>

        <div className="campaigns-filter-row">
          <nav aria-label="Filtro de mesas" className="campaign-dashboard-tabs">
            <Link className={showArchived ? '' : 'is-active'} aria-current={!showArchived ? 'page' : undefined} href="/campaigns">Todas as atuais <span>{activeCampaigns.length}</span></Link>
            <Link className={showArchived ? 'is-active' : ''} aria-current={showArchived ? 'page' : undefined} href="/campaigns?archived=true"><Archive className="size-3.5" aria-hidden="true" /> Arquivadas <span>{archivedCampaigns.length}</span></Link>
          </nav>
          <div className="campaigns-catalog-links">
            <Link href="/master/catalogo">Disciplinas e habilidades</Link>
            <Link href="/master/vantagens-defeitos">Vantagens e defeitos</Link>
          </div>
        </div>
        <MasterPanel initialCampaigns={campaigns} archived={showArchived} />

      </div>
    </main>
  )
}
