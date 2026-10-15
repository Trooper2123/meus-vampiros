import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { ArrowLeft, LogOut } from 'lucide-react'
import { getSessionOrDev } from '@/lib/auth0'
import { getCampaignsForMaster } from '@/lib/campaigns'
import { CampaignPossessionsManager } from '@/components/master-panel'
import { CampaignTools } from '@/components/campaign-calendar/campaign-tools'
import { MasterPredatorCatalog } from '@/components/predator-types/master-catalog'
import { AwakePanel } from '@/components/awake-panel'
import { CampaignClans } from '@/components/character-summary/campaign-clans'
import { CampaignNotesDialog } from '@/components/notes/campaign-notes-dialog'
import { CampaignNpcCreator } from '@/components/campaign-npc-creator'

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionOrDev()
  if (!session?.user) redirect('/auth/login?returnTo=/campaigns')
  const { id } = await params
  const campaign = (await getCampaignsForMaster(session.user.sub)).find((item) => item.id === id)
  if (!campaign) notFound()

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="noise" aria-hidden="true" />
      <header className="sheet-header">
        <div><p className="eyebrow">Crônicas / gerenciamento</p><h1 className="mt-2 font-serif text-2xl uppercase tracking-[0.12em]">{campaign.name}</h1></div>
        <div className="flex items-center gap-3"><Link href="/campaigns" className="button-ghost inline-flex items-center gap-2"><ArrowLeft className="size-4" /> Voltar às mesas</Link><a href="/auth/logout" className="button-ghost inline-flex items-center gap-2"><LogOut className="size-4" /> Sair</a></div>
      </header>
      <div className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 lg:py-14">
        <section className="border-b border-border pb-8"><p className="eyebrow">Ficha da mesa</p><h2 className="mt-3 font-serif text-4xl uppercase tracking-[0.08em] sm:text-6xl">{campaign.name}</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{campaign.theme ?? 'Tema não definido'} · {campaign.playerCount} jogador{campaign.playerCount === 1 ? '' : 'es'} vinculado{campaign.playerCount === 1 ? '' : 's'}.</p></section>
        <div className="mt-8 flex flex-col gap-8">
          <CampaignNotesDialog key={`${session.user.sub}:${campaign.id}`} campaignId={campaign.id} actorId={session.user.sub} />
          <CampaignTools campaignId={campaign.id} master />
          <AwakePanel campaignId={campaign.id} />
          <CampaignPossessionsManager campaignId={campaign.id} />
          <CampaignNpcCreator campaignId={campaign.id} />
          <CampaignClans campaignId={campaign.id} />
          <MasterPredatorCatalog campaignId={campaign.id} />
        </div>
      </div>
    </main>
  )
}
