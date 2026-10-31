import { CampaignArchiveControl } from '@/components/campaign-archive-control'
import { ArchiveHeader } from '@/components/archive-header'
import { CampaignTools } from '@/components/campaign-calendar/campaign-tools'
import { CharacterSummary } from '@/components/character-summary/character-summary'
import { CampaignParticipantControls } from '@/components/campaign-participant-controls'
import { CampaignPossessionsManager } from '@/components/master-panel'
import { CampaignXpHistory } from '@/components/campaign-xp-history'
import { NpcCatalogue } from '@/components/npcs/npc-catalogue'
import { getCharacterSummaryData } from '@/lib/character-summary'
import { getCharactersForCampaign } from '@/lib/characters'
import { getCampaignsForMaster } from '@/lib/campaigns'
import { getSessionOrDev } from '@/lib/auth0'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

export default async function CampaignDetailPage({ params, searchParams }: Readonly<{ params: Promise<{ id: string }>; searchParams?: Promise<{ xpCharacterId?: string }> }>) {
  const session = await getSessionOrDev()
  if (!session?.user) redirect('/auth/login?returnTo=/campaigns')

  const { id } = await params
  const campaign = (await getCampaignsForMaster(session.user.sub)).find(item => item.id === id)
  if (!campaign) notFound()

  const characters = await getCharactersForCampaign(campaign.id)
  const summaries = (await Promise.all(characters.map(async character => {
    const summary = await getCharacterSummaryData(character.id, session.user.sub)
    return summary ? { ...summary, status: character.status } : null
  })))
    .filter(summary => summary?.characterType === 'PLAYER_VAMPIRE')
  const requestedCharacter = (await searchParams)?.xpCharacterId
  const xpCharacterId = characters.find(character => character.id === requestedCharacter)?.id ?? ''
  const groups = [
    { title: 'Aguardando aprovação', statuses: ['PENDING_REVIEW'] },
    { title: 'Personagens aprovados', statuses: ['APPROVED'] },
    { title: 'Rascunhos e fichas inativas', statuses: ['DRAFT', 'ARCHIVED', 'DISABLED'] },
  ]

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

          <CampaignArchiveControl id={campaign.id} name={campaign.name} archived={campaign.status==='Arquivada'} />
          <CampaignTools campaignId={campaign.id} master />

          <details className="border border-border bg-card p-5">
            <summary className="cursor-pointer font-serif text-2xl">Gestão de NPCs</summary>
            <div className="mt-5">
            <p className="eyebrow">Personagens do Narrador</p>
            <h2 id="campaign-npcs-title" className="mt-2 font-serif text-2xl">NPCs da mesa</h2>
            <p className="mb-5 mt-2 text-sm text-muted-foreground">Consulte as fichas vinculadas a esta mesa ou crie um NPC diretamente nela.</p>
            <NpcCatalogue campaignId={campaign.id} />
            </div>
          </details>

          <details className="border border-border bg-card p-5">
            <summary className="cursor-pointer font-serif text-2xl">Visualização de personagens</summary>
            <div className="mt-5">
            <p className="eyebrow">Gestão de participantes</p>
            <h2 id="participants-title" className="mt-2 font-serif text-2xl">Fichas dos participantes</h2>
            <div className="mt-5 flex flex-col gap-4">
              {groups.map(group => <section key={group.title} className="flex flex-col gap-4">
                <h3 className="font-serif text-xl">{group.title} ({summaries.filter(summary => summary && group.statuses.includes(summary.status)).length})</h3>
              {summaries.filter(summary => summary && group.statuses.includes(summary.status)).map(summary => summary && (
                <details key={summary.id} className="border border-border p-4">
                  <summary className="cursor-pointer font-serif text-xl">{summary.name} · {summary.clan ?? 'Clã não definido'}</summary>
                  <div className="mt-4 flex flex-col gap-4">
                    <CampaignParticipantControls characterId={summary.id} />
                    <Link className="button-ghost self-start" href={`/characters/${summary.id}/summary`} target="_blank" rel="noopener noreferrer">Ver ficha</Link>
                    {summary.status === 'APPROVED' && <Link className="button-ghost self-start" href={`/campaigns/${campaign.id}?xpCharacterId=${summary.id}#campaign-xp-history`}>Histórico de XP</Link>}
                    <Link className="button-ghost self-start" href={`/characters/${summary.id}/edit`}>Editar ficha e habilidades</Link>
                    <Link className="button-ghost self-start" href={`/characters/${summary.id}/narrative`}>Perfil narrativo desta mesa</Link>
                    <CharacterSummary data={summary} />
                  </div>
                </details>
              ))}
              </section>)}
            </div>
            {summaries.length === 0 && <p className="mt-3 text-sm text-muted-foreground">Nenhuma ficha de jogador vinculada.</p>}
            </div>
          </details>
          <CampaignXpHistory key={xpCharacterId} campaignId={campaign.id} initialCharacterId={xpCharacterId} />
          <details className="border border-border bg-card p-5"><summary className="cursor-pointer font-serif text-2xl">Conceder itens restritos</summary><div className="mt-5"><CampaignPossessionsManager campaignId={campaign.id} /></div></details>
        </div>
      </div>
    </main>
  )
}
