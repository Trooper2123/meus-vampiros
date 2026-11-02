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
import { Play, Users, BookOpen, CalendarDays, Search, NotebookPen, UserRoundCog, PackageOpen, Settings2, Shield, FolderKanban, MessagesSquare, ScrollText, ImageIcon, Target, Crown } from 'lucide-react'
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
  }))).filter(summary => summary?.characterType === 'PLAYER_VAMPIRE')
  const requestedCharacter = (await searchParams)?.xpCharacterId
  const xpCharacterId = characters.find(character => character.id === requestedCharacter)?.id ?? ''
  const groups = [
    { title: 'Aguardando aprovação', statuses: ['PENDING_REVIEW'] },
    { title: 'Personagens aprovados', statuses: ['APPROVED'] },
    { title: 'Rascunhos e fichas inativas', statuses: ['DRAFT', 'ARCHIVED', 'DISABLED'] },
  ]

  return (
    <main className="campaign-detail-ui campaign-management-approved relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="noise" aria-hidden="true" />
      <ArchiveHeader title="Arquivos da Noite" showCampaigns />
      <div className="archive-content campaign-detail-ui-content">
        <header className="campaign-approved-heading">
          <div><h1 className="font-serif text-4xl">Gestão da Mesa</h1><p className="mt-1 text-sm text-muted-foreground">Planejamento, organização e recursos da campanha.</p></div>
          <div className="campaign-approved-heading-actions"><Link href={`/campaigns/${campaign.id}/session`} className="button-primary"><Play className="size-4"/>Iniciar sessão</Link><a href="#agenda" className="button-ghost"><CalendarDays className="size-4"/>Agendar sessão</a></div>
        </header>

        <div className="campaign-approved-layout">
          <aside className="campaign-approved-sidebar">
            <div className="campaign-approved-cover">
              <div className="campaign-approved-cover-art"><Crown className="size-7" aria-hidden="true"/></div>
              <strong className="font-serif text-xl">{campaign.name}</strong>
              <span>{campaign.theme ?? 'Crônica sem tema definido'}</span>
            </div>
            <nav>
              <a className="is-active" href="#overview"><Crown/>Gestão da Mesa</a>
              <a href="#participants"><BookOpen/>Fichas</a>
              <a href="#participants"><Users/>Participantes</a>
              <a href="#npcs"><UserRoundCog/>NPCs</a>
              <a href="#handouts"><ImageIcon/>Handouts / Revelações</a>
              <a href="#agenda"><CalendarDays/>Calendário</a>
              <a href="#xp"><ScrollText/>XP e Evolução</a>
              <a href="#possessions"><PackageOpen/>Itens Restritos</a>
              <a href="#limits"><Shield/>Limites</a>
              <a href="#projects"><FolderKanban/>Projetos</a>
              <a href="#coterie"><Users/>Cotterie</a>
              <a href="#messages"><MessagesSquare/>Mensagens da Mesa</a>
              <Link href={`/notes?targetType=CAMPAIGN&targetId=${campaign.id}`}><NotebookPen/>Anotações</Link>
              <Link href="/master/catalogo"><Search/>Pesquisas</Link>
              <a href="#settings"><Settings2/>Configurações</a>
            </nav>
          </aside>

          <div className="campaign-approved-main">
            <section id="overview" className="campaign-preparation-banner">
              <div><span className="campaign-preparation-pill"><Shield className="size-4"/>Mesa em preparação</span><h2 className="mt-4 font-serif text-3xl">Nenhuma sessão ativa</h2><p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">Organize a próxima sessão, gerencie participantes, limites, handouts, anotações e eventos da campanha.</p></div>
              <button className="button-ghost" type="button" disabled title="Upload da imagem da mesa será implementado com o módulo de mídia"><ImageIcon className="size-4"/>Trocar imagem da mesa</button>
            </section>

            <div className="campaign-approved-grid">
              <section id="participants" className="campaign-approved-card campaign-approved-card-wide">
                <div className="campaign-approved-card-title"><span><Users/>Participantes ({summaries.length})</span><a href="#participant-details">Ver todos →</a></div>
                <div className="campaign-participant-preview">{summaries.slice(0,4).map(summary => summary && <Link key={summary.id} href={`/characters/${summary.id}/summary`} className="campaign-participant-chip"><span className="campaign-participant-avatar">{summary.name.slice(0,1)}</span><strong>{summary.name}</strong><small>{summary.clan ?? 'Clã não definido'}</small></Link>)}{summaries.length === 0 && <p className="text-sm text-muted-foreground">Nenhum personagem de jogador vinculado.</p>}</div>
              </section>

              <section id="limits" className="campaign-approved-card">
                <div className="campaign-approved-card-title"><span><Shield/>Limites da Mesa</span><span>Gerenciar →</span></div>
                <div className="campaign-empty-module"><p>O domínio de limites ainda não existe nesta versão.</p><button type="button" className="button-ghost" disabled>+ Adicionar limite</button></div>
              </section>

              <section id="agenda" className="campaign-approved-card">
                <div className="campaign-approved-card-title"><span><CalendarDays/>Calendário de Eventos</span><span>Resumo</span></div>
                <CampaignTools campaignId={campaign.id} master />
              </section>

              <section id="messages" className="campaign-approved-card campaign-approved-card-wide">
                <div className="campaign-approved-card-title"><span><MessagesSquare/>Mensagens da Mesa</span><span>Abrir conversas →</span></div>
                <div className="campaign-empty-module"><p>Mensagens entre personagens (estilo SMS) ainda não possuem domínio persistente.</p></div>
              </section>

              <section className="campaign-approved-card">
                <div className="campaign-approved-card-title"><span><ScrollText/>Resumo da Campanha</span></div>
                <dl className="campaign-summary-list"><div><dt>Personagens</dt><dd>{summaries.length}</dd></div><div><dt>Fichas vinculadas</dt><dd>{characters.length}</dd></div><div><dt>Último encontro</dt><dd>{campaign.lastSessionAt ? new Date(campaign.lastSessionAt).toLocaleDateString('pt-BR') : '—'}</dd></div></dl>
              </section>

              <section id="missions" className="campaign-approved-card">
                <div className="campaign-approved-card-title"><span><Target/>Missões Ativas</span></div>
                <div className="campaign-empty-module"><p>O domínio de missões ainda não existe. Nenhuma missão fictícia foi criada.</p></div>
              </section>
            </div>

            <section id="participant-details" className="campaign-management-section">
              <div className="campaign-management-section-heading"><Users className="size-5 text-primary"/><div><p className="eyebrow">Gestão de participantes</p><h2 className="font-serif text-2xl">Fichas dos participantes</h2></div></div>
              <div className="mt-5 flex flex-col gap-5">{groups.map(group => <section key={group.title} className="campaign-management-character-group"><h3 className="font-serif text-xl">{group.title} <span className="text-sm text-muted-foreground">({summaries.filter(summary => summary && group.statuses.includes(summary.status)).length})</span></h3>{summaries.filter(summary => summary && group.statuses.includes(summary.status)).map(summary => summary && <details key={summary.id} className="campaign-management-character"><summary>{summary.name} · {summary.clan ?? 'Clã não definido'}</summary><div className="mt-4 flex flex-col gap-4"><CampaignParticipantControls characterId={summary.id}/><div className="archive-card-actions"><Link className="button-ghost" href={`/characters/${summary.id}/summary`}>Ver ficha</Link>{summary.status === 'APPROVED' && <Link className="button-ghost" href={`/campaigns/${campaign.id}?xpCharacterId=${summary.id}#campaign-xp-history`}>Histórico de XP</Link>}<Link className="button-ghost" href={`/characters/${summary.id}/edit`}>Editar ficha</Link><Link className="button-ghost" href={`/characters/${summary.id}/narrative`}>Perfil narrativo</Link></div><CharacterSummary data={summary}/></div></details>)}</section>)}</div>
            </section>

            <section id="npcs" className="campaign-management-section"><div className="campaign-management-section-heading"><UserRoundCog className="size-5 text-primary"/><div><p className="eyebrow">Personagens do Narrador</p><h2 className="font-serif text-2xl">NPCs da mesa</h2></div></div><NpcCatalogue campaignId={campaign.id}/></section>
            <section id="xp" className="campaign-management-section"><CampaignXpHistory key={xpCharacterId} campaignId={campaign.id} initialCharacterId={xpCharacterId}/></section>
            <section id="possessions" className="campaign-management-section"><div className="campaign-management-section-heading"><PackageOpen className="size-5 text-primary"/><h2 className="font-serif text-2xl">Itens restritos</h2></div><CampaignPossessionsManager campaignId={campaign.id}/></section>
            <section id="handouts" className="campaign-management-section"><div className="campaign-management-section-heading"><ImageIcon className="size-5 text-primary"/><h2 className="font-serif text-2xl">Handouts / Revelações</h2></div><p className="text-sm text-muted-foreground">Área reservada ao drive de Handouts especificado para Vercel Blob.</p></section>
            <section id="projects" className="campaign-management-section"><div className="campaign-management-section-heading"><FolderKanban className="size-5 text-primary"/><h2 className="font-serif text-2xl">Projetos</h2></div><p className="text-sm text-muted-foreground">Módulo preparado para implementação do domínio de Projetos.</p></section>
            <section id="coterie" className="campaign-management-section"><div className="campaign-management-section-heading"><Users className="size-5 text-primary"/><h2 className="font-serif text-2xl">Cotterie</h2></div><p className="text-sm text-muted-foreground">Módulo preparado para implementação do domínio da Cotterie.</p></section>
            <section id="settings" className="campaign-management-section"><div className="campaign-management-section-heading"><Settings2 className="size-5 text-primary"/><h2 className="font-serif text-2xl">Configurações da mesa</h2></div><CampaignArchiveControl id={campaign.id} name={campaign.name} archived={campaign.status==='Arquivada'}/></section>
          </div>
        </div>
      </div>
    </main>
  )
}
