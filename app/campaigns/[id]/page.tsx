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
import { ArrowLeft, Play, Users, BookOpen, CalendarDays, Search, NotebookPen, UserRoundCog, PackageOpen, Settings2 } from 'lucide-react'
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
    <main className="campaign-detail-ui relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="noise" aria-hidden="true" />
      <ArchiveHeader title="Crônicas / gerenciamento" showCampaigns />
      <div className="archive-content campaign-detail-ui-content">
        <section className="archive-page-heading campaign-detail-hero">
          <p className="eyebrow">Ficha da mesa</p>
          <h1 className="mt-3 font-serif text-4xl uppercase tracking-[0.08em] sm:text-6xl">{campaign.name}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            {campaign.theme ?? 'Tema não definido'} · {campaign.playerCount} jogador{campaign.playerCount === 1 ? '' : 'es'} vinculado{campaign.playerCount === 1 ? '' : 's'}.
          </p>
        </section>

        <div className="campaign-detail-metrics" aria-label="Resumo da campanha"><div><Users className="size-5 text-primary" aria-hidden="true"/><span className="eyebrow">Participantes</span><strong>{campaign.playerCount}</strong></div><div><BookOpen className="size-5 text-primary" aria-hidden="true"/><span className="eyebrow">Personagens</span><strong>{characters.length}</strong></div><div><CalendarDays className="size-5 text-primary" aria-hidden="true"/><span className="eyebrow">Último encontro</span><strong className="text-base">{campaign.lastSessionAt ? new Date(campaign.lastSessionAt).toLocaleDateString("pt-BR") : "Não registrado"}</strong></div></div>
        <div className="campaign-management-shell">
          <aside className="campaign-management-nav" aria-label="Gestão da mesa">
            <div className="campaign-management-nav-heading">
              <p className="eyebrow">Preparação da crônica</p>
              <h2 className="font-serif text-xl">Gestão da mesa</h2>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">Configure a mesa antes de abrir o Modo Sessão.</p>
            </div>
            <nav className="campaign-management-links">
              <a href="#agenda"><CalendarDays className="size-4" aria-hidden="true"/>Agenda e calendários</a>
              <a href="#npcs"><UserRoundCog className="size-4" aria-hidden="true"/>NPCs</a>
              <a href="#participants"><Users className="size-4" aria-hidden="true"/>Participantes</a>
              <a href="#xp"><BookOpen className="size-4" aria-hidden="true"/>XP</a>
              <a href="#possessions"><PackageOpen className="size-4" aria-hidden="true"/>Itens restritos</a>
              <a href="#settings"><Settings2 className="size-4" aria-hidden="true"/>Configurações</a>
            </nav>
            <div className="campaign-management-reference">
              <p className="eyebrow">Referências</p>
              <Link href={`/notes?targetType=CAMPAIGN&targetId=${campaign.id}`} target="_blank" rel="noopener noreferrer"><NotebookPen className="size-4" aria-hidden="true"/>Anotações</Link>
              <Link href="/master/catalogo" target="_blank" rel="noopener noreferrer"><Search className="size-4" aria-hidden="true"/>Disciplinas e habilidades</Link>
              <Link href="/master/vantagens-defeitos" target="_blank" rel="noopener noreferrer"><BookOpen className="size-4" aria-hidden="true"/>Vantagens e defeitos</Link>
            </div>
          </aside>

          <div className="campaign-management-main">
            <section className="campaign-management-launch">
              <div>
                <p className="eyebrow">Nenhuma sessão ativa</p>
                <h2 className="mt-2 font-serif text-2xl">A mesa está em preparação</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Revise participantes, NPCs, calendário e recursos da crônica. Ao iniciar, a interface muda para o Hub da Sessão com chat, conteúdo central e câmeras.</p>
              </div>
              <div className="campaign-management-launch-actions">
                <Link href="/campaigns" className="button-ghost"><ArrowLeft className="size-4" aria-hidden="true"/>Voltar</Link>
                <Link href={`/campaigns/${campaign.id}/session`} className="button-primary"><Play className="size-4" aria-hidden="true"/>Iniciar sessão</Link>
              </div>
            </section>

            <section id="agenda" className="campaign-management-section">
              <div className="campaign-management-section-heading"><CalendarDays className="size-5 text-primary" aria-hidden="true"/><div><p className="eyebrow">Planejamento</p><h2 className="font-serif text-2xl">Agenda da mesa</h2></div></div>
              <CampaignTools campaignId={campaign.id} master />
            </section>

            <section id="npcs" className="campaign-management-section">
              <div className="campaign-management-section-heading"><UserRoundCog className="size-5 text-primary" aria-hidden="true"/><div><p className="eyebrow">Personagens do Narrador</p><h2 id="campaign-npcs-title" className="font-serif text-2xl">NPCs da mesa</h2></div></div>
              <p className="mb-5 mt-2 text-sm text-muted-foreground">Consulte as fichas vinculadas a esta mesa ou crie um NPC diretamente nela.</p>
              <NpcCatalogue campaignId={campaign.id} />
            </section>

            <section id="participants" className="campaign-management-section">
              <div className="campaign-management-section-heading"><Users className="size-5 text-primary" aria-hidden="true"/><div><p className="eyebrow">Gestão de participantes</p><h2 id="participants-title" className="font-serif text-2xl">Fichas dos participantes</h2></div></div>
              <div className="mt-5 flex flex-col gap-5">
                {groups.map(group => <section key={group.title} className="campaign-management-character-group">
                  <h3 className="font-serif text-xl">{group.title} <span className="text-sm text-muted-foreground">({summaries.filter(summary => summary && group.statuses.includes(summary.status)).length})</span></h3>
                  {summaries.filter(summary => summary && group.statuses.includes(summary.status)).map(summary => summary && (
                    <details key={summary.id} className="campaign-management-character">
                      <summary>{summary.name} · {summary.clan ?? 'Clã não definido'}</summary>
                      <div className="mt-4 flex flex-col gap-4">
                        <CampaignParticipantControls characterId={summary.id} />
                        <div className="archive-card-actions">
                          <Link className="button-ghost" href={`/characters/${summary.id}/summary`} target="_blank" rel="noopener noreferrer">Ver ficha</Link>
                          {summary.status === 'APPROVED' && <Link className="button-ghost" href={`/campaigns/${campaign.id}?xpCharacterId=${summary.id}#campaign-xp-history`}>Histórico de XP</Link>}
                          <Link className="button-ghost" href={`/characters/${summary.id}/edit`}>Editar ficha e habilidades</Link>
                          <Link className="button-ghost" href={`/characters/${summary.id}/narrative`}>Perfil narrativo</Link>
                        </div>
                        <CharacterSummary data={summary} />
                      </div>
                    </details>
                  ))}
                </section>)}
              </div>
              {summaries.length === 0 && <p className="mt-3 text-sm text-muted-foreground">Nenhuma ficha de jogador vinculada.</p>}
            </section>

            <section id="xp" className="campaign-management-section"><CampaignXpHistory key={xpCharacterId} campaignId={campaign.id} initialCharacterId={xpCharacterId} /></section>
            <section id="possessions" className="campaign-management-section"><div className="campaign-management-section-heading"><PackageOpen className="size-5 text-primary" aria-hidden="true"/><div><p className="eyebrow">Recursos especiais</p><h2 className="font-serif text-2xl">Itens restritos</h2></div></div><div className="mt-5"><CampaignPossessionsManager campaignId={campaign.id} /></div></section>
            <section id="settings" className="campaign-management-section"><div className="campaign-management-section-heading"><Settings2 className="size-5 text-primary" aria-hidden="true"/><div><p className="eyebrow">Administração</p><h2 className="font-serif text-2xl">Configurações da mesa</h2></div></div><div className="mt-5"><CampaignArchiveControl id={campaign.id} name={campaign.name} archived={campaign.status==='Arquivada'} /></div></section>
          </div>
        </div>
      </div>
    </main>
  )
}
