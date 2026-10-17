import { ArchiveHeader } from '@/components/archive-header'
import { notFound, redirect } from 'next/navigation'
import { getSessionOrDev } from '@/lib/auth0'
import { getCampaignsForMaster } from '@/lib/campaigns'
import { CampaignNpcCreator } from '@/components/campaign-npc-creator'

export default async function NewNpcPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionOrDev()
  if (!session?.user) redirect('/auth/login?returnTo=/campaigns')
  const { id } = await params
  const campaign = (await getCampaignsForMaster(session.user.sub)).find(entry => entry.id === id)
  if (!campaign) notFound()

  return <main className="min-h-screen bg-background text-foreground">
    <ArchiveHeader title="Novo NPC" showCampaigns />
    <div className="archive-content flex flex-col gap-8">
      <section className="archive-page-heading"><p className="eyebrow">NPC · {campaign.name}</p><h1 className="mt-3 font-serif text-4xl uppercase sm:text-6xl">Criar ficha de NPC</h1><p className="mt-3 text-sm text-muted-foreground">A mesa atual é vinculada automaticamente e não pode ser alterada aqui.</p></section>
      <CampaignNpcCreator campaignId={campaign.id} />
    </div>
  </main>
}
