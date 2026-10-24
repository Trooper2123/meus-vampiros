import { ArchiveHeader } from '@/components/archive-header'
import { CampaignTools } from '@/components/campaign-calendar/campaign-tools'
import { CharacterSummary } from '@/components/character-summary/character-summary'
import { CampaignPossessionsManager } from '@/components/master-panel'
import { getCharacterSummaryData } from '@/lib/character-summary'
import { getCharactersForCampaign } from '@/lib/characters'
import { getCampaignsForMaster } from '@/lib/campaigns'
import { getSessionOrDev } from '@/lib/auth0'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

export default async function CampaignDetailPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  const session = await getSessionOrDev()
  if (!session?.user) redirect('/auth/login?returnTo=/campaigns')

  const { id } = await params
  const campaign = (await getCampaignsForMaster(session.user.sub)).find(item => item.id === id)
  if (!campaign) notFound()

  const characters = await getCharactersForCampaign(campaign.id)
  const summaries = (await Promise.all(characters.map(character => getCharacterSummaryData(character.id, session.user.sub))))
    .filter(summary => summary?.characterType === 'PLAYER_VAMPIRE')

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="noise" aria-hidden="true" />
      <ArchiveHeader title="Crônicas / gerenciamento" showCampaigns />
      <div className="archive-content">
        <section className="archive-page-heading">
          <p className="eyebrow">Ficha da mesa</p>
          <h1 className="mt-3 font-serif text-4xl uppercase tracking-[0.08em] sm:text-6xl">{campaign.name}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            {campaign.theme ?? 'Tema não definido'} · {campaign.playerCount} jogador{campaign.playerCount === 1 ? '' : 'es'} vinculado{campaign.playerCount === 1 ? '' : 's'}.
          </p>
        </section>

        <div className="mt-8 flex flex-col gap-8">
          <nav className="archive-card-actions" aria-label="Ações da mesa">
            <Link href={`/campaigns/${campaign.id}/session`} className="button-primary self-start">Abrir modo sessão</Link>
            <Link href={`/notes?targetType=CAMPAIGN&targetId=${campaign.id}`} target="_blank" rel="noopener noreferrer" className="button-ghost self-start">Anotações do Narrador</Link>
            <Link href="/master/catalogo" target="_blank" rel="noopener noreferrer" className="button-ghost self-start">Pesquisa de habilidades</Link>
            <Link href="/master/vantagens-defeitos" target="_blank" rel="noopener noreferrer" className="button-ghost self-start">Pesquisa de vantagens e defeitos</Link>
          </nav>

          <CampaignTools campaignId={campaign.id} master />
          <CampaignPossessionsManager campaignId={campaign.id} />

          <section className="border border-border bg-card p-5" aria-labelledby="participants-title">
            <p className="eyebrow">Gestão de participantes</p>
            <h2 id="participants-title" className="mt-2 font-serif text-2xl">Fichas dos participantes</h2>
            <div className="mt-5 flex flex-col gap-4">
              {summaries.map(summary => summary && (
                <details key={summary.id} className="border border-border p-4">
                  <summary className="cursor-pointer font-serif text-xl">{summary.name} · {summary.clan ?? 'Clã não definido'}</summary>
                  <div className="mt-4 flex flex-col gap-4">
                    <Link className="button-ghost self-start" href={`/characters/${summary.id}/edit`}>Editar ficha e habilidades</Link>
                    <Link className="button-ghost self-start" href={`/characters/${summary.id}/narrative`}>Perfil narrativo desta mesa</Link>
                    <CharacterSummary data={summary} />
                  </div>
                </details>
              ))}
            </div>
            {summaries.length === 0 && <p className="mt-3 text-sm text-muted-foreground">Nenhuma ficha de jogador vinculada.</p>}
          </section>
        </div>
      </div>
    </main>
  )
}
