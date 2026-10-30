import { ArchiveHeader } from '@/components/archive-header'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSessionOrDev } from '@/lib/auth0'
import { BookOpen, Plus } from 'lucide-react'
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

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="noise" aria-hidden="true" />

      <ArchiveHeader title="Suas mesas" showCampaigns={campaigns.length > 0} />

      <div className="archive-content">
        {/* Cabeçalho */}
        <div className="archive-page-heading">
          <div>
            <p className="eyebrow">Painel do Narrador</p>
            <h1 className="mt-3 font-serif text-4xl uppercase tracking-[0.08em] sm:text-6xl">Suas histórias</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
              Um resumo das campanhas que você narra. Gerencie os participantes, pertences e acontecimentos de cada crônica.
            </p>
          </div>
          <div className="archive-page-actions"><Link href="/master/catalogo" target="_blank" rel="noopener noreferrer" className="button-ghost inline-flex items-center justify-center gap-2">Pesquisa de habilidades</Link><Link href="/master/vantagens-defeitos" target="_blank" rel="noopener noreferrer" className="button-ghost inline-flex items-center justify-center gap-2">Pesquisa de vantagens e defeitos</Link><Link href="/campaigns/new" id="btn-nova-campanha" className="button-primary inline-flex items-center justify-center gap-2">
            <Plus className="size-4" /> Nova campanha
          </Link></div>
        </div>

        <nav aria-label="Filtro de mesas" className="my-6 flex flex-wrap gap-3"><Link className="button-ghost" aria-current={!showArchived?'page':undefined} href="/campaigns">Mesas atuais</Link><Link className="button-ghost" aria-current={showArchived?'page':undefined} href="/campaigns?archived=true">Mesas arquivadas</Link></nav>
        {campaigns.length === 0 ? (
          showArchived ? <p className="empty-state">Nenhuma mesa arquivada.</p> :
          <section className="login-panel mx-auto max-w-2xl text-center">
            <BookOpen className="mx-auto size-12 text-primary" aria-hidden="true" />
            <p className="eyebrow mt-6">Nenhuma crônica registrada</p>
            <h3 className="mt-3 font-serif text-3xl uppercase tracking-[0.08em]">A noite ainda não começou</h3>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
              Crie sua primeira campanha e comece a tecer sua história. Os jogadores poderão se vincular a ela.
            </p>
            <div className="archive-page-actions"><Link href="/campaigns/new" className="button-primary mt-7 inline-flex items-center gap-2">
              Criar primeira mesa <Plus className="size-4" />
            </Link></div>
          </section>
        ) : (
          <MasterPanel initialCampaigns={campaigns} archived={showArchived} />
        )}
      </div>
    </main>
  )
}
