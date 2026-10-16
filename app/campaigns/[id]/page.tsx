import { ArchiveHeader } from '@/components/archive-header'
import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { getSessionOrDev } from '@/lib/auth0'
import { getCampaignsForMaster } from '@/lib/campaigns'
import { CampaignPossessionsManager } from '@/components/master-panel'
import { CampaignTools } from '@/components/campaign-calendar/campaign-tools'
import { AwakePanel } from '@/components/awake-panel'
import { CampaignNotesDialog } from '@/components/notes/campaign-notes-dialog'
import { getCharactersForCampaign } from '@/lib/characters'
import { getCharacterSummaryData } from '@/lib/character-summary'
import { CharacterSummary } from '@/components/character-summary/character-summary'

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionOrDev()
  if (!session?.user) redirect('/auth/login?returnTo=/campaigns')
  const { id } = await params
  const campaign = (await getCampaignsForMaster(session.user.sub)).find((item) => item.id === id)
  if (!campaign) notFound()
  const summaries = (await Promise.all((await getCharactersForCampaign(campaign.id)).map(character => getCharacterSummaryData(character.id, session.user.sub)))).filter(summary => summary?.characterType === 'PLAYER_VAMPIRE')

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="noise" aria-hidden="true" />
      <ArchiveHeader title="Crônicas / gerenciamento" showCampaigns />
      <div className="archive-content">
        <section className="archive-page-heading"><p className="eyebrow">Ficha da mesa</p><h1 className="mt-3 font-serif text-4xl uppercase tracking-[0.08em] sm:text-6xl">{campaign.name}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{campaign.theme ?? 'Tema não definido'} · {campaign.playerCount} jogador{campaign.playerCount === 1 ? '' : 'es'} vinculado{campaign.playerCount === 1 ? '' : 's'}.</p></section>
        <div className="mt-8 flex flex-col gap-8">
          <CampaignNotesDialog key={`${session.user.sub}:${campaign.id}`} campaignId={campaign.id} actorId={session.user.sub} />
          <CampaignTools campaignId={campaign.id} master />
          <AwakePanel campaignId={campaign.id} />
          <CampaignPossessionsManager campaignId={campaign.id} />
          <section className="border border-border bg-card p-5"><p className="eyebrow">Personagens do Narrador</p><h2 className="mt-2 font-serif text-2xl">Criar ficha de NPC</h2><p className="mt-2 text-sm text-muted-foreground">Sempre vinculado a esta mesa e visível apenas ao Narrador.</p><Link className="button-primary mt-4 inline-flex" href={`/campaigns/${campaign.id}/npcs/new`}>Abrir criação de NPC</Link></section>
          <section className="border border-border bg-card p-5"><h2 className="font-serif text-2xl">Fichas dos participantes</h2><div className="mt-5 flex flex-col gap-4">{summaries.filter(summary => summary !== null).map(summary => <details key={summary.id} className="border border-border p-4"><summary className="cursor-pointer font-serif text-xl">{summary.name} · {summary.clan ?? 'Clã não definido'}</summary><div className="mt-4"><CharacterSummary data={summary} /></div></details>)}</div>{summaries.length === 0 && <p className="mt-3 text-sm text-muted-foreground">Nenhuma ficha de jogador vinculada.</p>}</section>
        </div>
      </div>
    </main>
  )
}
