import { MasterViewportGuard } from '@/components/master-viewport-guard'
import { NotesPanel } from '@/components/notes/notes-panel'
import { CampaignArchiveControl } from '@/components/campaign-archive-control'
import { CampaignTools } from '@/components/campaign-calendar/campaign-tools'
import { CharacterSummary } from '@/components/character-summary/character-summary'
import { CampaignParticipantControls } from '@/components/campaign-participant-controls'
import { CampaignPossessionsManager } from '@/components/master-panel'
import { CampaignXpHistory } from '@/components/campaign-xp-history'
import { NewNpcModal, NpcCatalogue } from '@/components/npcs/npc-catalogue'
import { getCharacterSummaryData } from '@/lib/character-summary'
import { getCharactersForCampaign } from '@/lib/characters'
import { getCampaignsForMaster } from '@/lib/campaigns'
import { getSessionOrDev } from '@/lib/auth0'
import Link from 'next/link'
import { Play, Users, BookOpen, CalendarDays, Search, NotebookPen, UserRoundCog, PackageOpen, Settings2, Shield, FolderKanban, MessagesSquare, ScrollText, ImageIcon, Target, Crown } from 'lucide-react'
import { notFound, redirect } from 'next/navigation'

export default async function CampaignDetailPage({ params, searchParams }: Readonly<{ params: Promise<{ id: string }>; searchParams?: Promise<{ xpCharacterId?: string; view?: string }> }>) {
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
  const query = await searchParams
  const requestedCharacter = query?.xpCharacterId
  const allowedViews = ['overview','characters','participants','npcs','handouts','calendar','xp','possessions','limits','projects','coterie','messages','notes','research','settings'] as const
  const requestedView = query?.view
  const view = allowedViews.find(item => item === requestedView) ?? 'overview'
  const viewHref = (nextView: string) => `/campaigns/${campaign.id}?view=${nextView}`
  const xpCharacterId = characters.find(character => character.id === requestedCharacter)?.id ?? ''
  const groups = [
    { title: 'Aguardando aprovação', statuses: ['PENDING_REVIEW'] },
    { title: 'Personagens aprovados', statuses: ['APPROVED'] },
    { title: 'Rascunhos e fichas inativas', statuses: ['DRAFT', 'ARCHIVED', 'DISABLED'] },
  ]

  return (
    <main className="campaign-detail-ui campaign-management-approved relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="noise" aria-hidden="true" />
      <MasterViewportGuard backHref="/campaigns" />
      <div className="master-large-screen-only">
      <div className="archive-content campaign-detail-ui-content campaign-management-content">
        <header className="campaign-approved-heading">
          <div className="campaign-management-title"><p className="eyebrow">Arquivos da Noite</p><h1 className="font-serif text-4xl">{campaign.name}</h1><p className="mt-1 text-sm text-muted-foreground">Gestão da Mesa · planejamento, organização e recursos da campanha.</p></div>
          <div className="campaign-approved-heading-actions"><Link href={`/campaigns/${campaign.id}/session`} className="button-primary"><Play className="size-4"/>Iniciar sessão</Link><Link href={viewHref('calendar')} className="button-ghost"><CalendarDays className="size-4"/>Agendar sessão</Link></div>
        </header>

        <div className="campaign-approved-layout">
          <aside className="campaign-approved-sidebar">
            <div className="campaign-approved-cover">
              <div className="campaign-approved-cover-art"><Crown className="size-7" aria-hidden="true"/></div>
              <strong className="font-serif text-xl">{campaign.name}</strong>
              <span>{campaign.theme ?? 'Crônica sem tema definido'}</span>
            </div>
            <nav>
              <Link className={view === 'overview' ? 'is-active' : ''} href={viewHref('overview')}><Crown/>Gestão da Mesa</Link>
              <Link className={view === 'characters' ? 'is-active' : ''} href={viewHref('characters')}><BookOpen/>Fichas</Link>
              <Link className={view === 'participants' ? 'is-active' : ''} href={viewHref('participants')}><Users/>Participantes</Link>
              <Link className={view === 'npcs' ? 'is-active' : ''} href={viewHref('npcs')}><UserRoundCog/>NPCs</Link>
              <Link className={view === 'handouts' ? 'is-active' : ''} href={viewHref('handouts')}><ImageIcon/>Handouts / Revelações</Link>
              <Link className={view === 'calendar' ? 'is-active' : ''} href={viewHref('calendar')}><CalendarDays/>Calendário</Link>
              <Link className={view === 'xp' ? 'is-active' : ''} href={viewHref('xp')}><ScrollText/>XP e Evolução</Link>
              <Link className={view === 'possessions' ? 'is-active' : ''} href={viewHref('possessions')}><PackageOpen/>Itens Restritos</Link>
              <Link className={view === 'limits' ? 'is-active' : ''} href={viewHref('limits')}><Shield/>Limites</Link>
              <Link className={view === 'projects' ? 'is-active' : ''} href={viewHref('projects')}><FolderKanban/>Projetos</Link>
              <Link className={view === 'coterie' ? 'is-active' : ''} href={viewHref('coterie')}><Users/>Cotterie</Link>
              <Link className={view === 'messages' ? 'is-active' : ''} href={viewHref('messages')}><MessagesSquare/>Mensagens da Mesa</Link>
              <Link className={view === 'notes' ? 'is-active' : ''} href={viewHref('notes')}><NotebookPen/>Anotações</Link>
              <Link className={view === 'research' ? 'is-active' : ''} href={viewHref('research')}><Search/>Pesquisas</Link>
              <Link className={view === 'settings' ? 'is-active' : ''} href={viewHref('settings')}><Settings2/>Configurações</Link>
            </nav>
          </aside>

          <div className="campaign-approved-main">
            {view === 'overview' && <>
              <section className="campaign-preparation-banner"><div><span className="campaign-preparation-pill"><Shield className="size-4"/>Mesa em preparação</span><h2 className="mt-4 font-serif text-3xl">Nenhuma sessão ativa</h2><p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">Organize a próxima sessão, gerencie participantes, limites, handouts, anotações e eventos da campanha.</p></div><button className="button-ghost" type="button" disabled><ImageIcon className="size-4"/>Trocar imagem da mesa</button></section>
              <div className="campaign-approved-grid">
                <section className="campaign-approved-card"><div className="campaign-approved-card-title"><span><Users/>Participantes ({summaries.length})</span><Link href={viewHref('participants')}>Ver todos →</Link></div><div className="campaign-participant-preview">{summaries.slice(0,4).map(summary => summary && <Link key={summary.id} href={`/characters/${summary.id}/summary`} className="campaign-participant-chip"><span className="campaign-participant-avatar">{summary.name.slice(0,1)}</span><strong>{summary.name}</strong><small>{summary.clan ?? 'Clã não definido'}</small></Link>)}</div></section>
                <section className="campaign-approved-card"><div className="campaign-approved-card-title"><span><Shield/>Limites da Mesa</span><Link href={viewHref('limits')}>Gerenciar →</Link></div><div className="campaign-empty-module"><p>Configure os limites e regras específicas da mesa.</p></div></section>
                <section className="campaign-approved-card"><div className="campaign-approved-card-title"><span><CalendarDays/>Calendário de Eventos</span><Link href={viewHref('calendar')}>Resumo →</Link></div><div className="campaign-empty-module"><p>Acesse o calendário para consultar e agendar eventos.</p></div></section>
                <section className="campaign-approved-card"><div className="campaign-approved-card-title"><span><ScrollText/>Resumo da Campanha</span></div><dl className="campaign-summary-list"><div><dt>Personagens</dt><dd>{summaries.length}</dd></div><div><dt>Fichas vinculadas</dt><dd>{characters.length}</dd></div><div><dt>Último encontro</dt><dd>{campaign.lastSessionAt ? new Date(campaign.lastSessionAt).toLocaleDateString('pt-BR') : '—'}</dd></div></dl></section>
                <section className="campaign-approved-card"><div className="campaign-approved-card-title"><span><Target/>Missões Ativas</span></div><div className="campaign-empty-module"><p>O domínio de missões ainda não existe.</p></div></section>
              </div>
            </>}

            {(view === 'characters' || view === 'participants') && <section className="campaign-module-workspace"><div className="campaign-module-header"><div className="campaign-module-heading"><Users/><div><p className="eyebrow">Gestão de participantes</p><h2>{view === 'characters' ? 'Fichas' : 'Participantes'}</h2><p>{view === 'characters' ? 'Consulte e administre as fichas vinculadas à mesa.' : 'Gerencie jogadores, aprovações e personagens participantes.'}</p></div></div></div><div className="campaign-module-body flex flex-col gap-5">{groups.map(group => <section key={group.title} className="campaign-module-subsection"><h3 className="font-serif text-xl">{group.title} <span className="text-sm text-muted-foreground">({summaries.filter(summary => summary && group.statuses.includes(summary.status)).length})</span></h3>{summaries.filter(summary => summary && group.statuses.includes(summary.status)).map(summary => summary && <details key={summary.id} className="campaign-module-character"><summary>{summary.name} · {summary.clan ?? 'Clã não definido'}</summary><div className="mt-4 flex flex-col gap-4"><CampaignParticipantControls characterId={summary.id}/><div className="archive-card-actions"><Link className="button-ghost" href={`/characters/${summary.id}/summary`}>Ver ficha</Link><Link className="button-ghost" href={`/characters/${summary.id}/edit`}>Editar ficha</Link><Link className="button-ghost" href={`/characters/${summary.id}/narrative`}>Perfil narrativo</Link></div><CharacterSummary data={summary}/></div></details>)}</section>)}</div></section>}
            {view === 'npcs' && <section className="campaign-module-workspace"><div className="campaign-module-header"><div className="campaign-module-heading"><UserRoundCog/><div><p className="eyebrow">Personagens do Narrador</p><h2>NPCs da Mesa</h2><p>Crie, organize e gerencie os NPCs da campanha.</p></div></div><NewNpcModal campaignId={campaign.id}/></div><NpcCatalogue campaignId={campaign.id} hideCreate/></section>}
            {view === 'calendar' && <section className="campaign-module-workspace"><div className="campaign-module-header"><div className="campaign-module-heading"><CalendarDays/><div><p className="eyebrow">Planejamento da crônica</p><h2>Calendário</h2><p>Organize eventos, disponibilidade e próximas sessões da mesa.</p></div></div></div><CampaignTools campaignId={campaign.id} master/></section>}
            {view === 'xp' && <section className="campaign-module-workspace"><div className="campaign-module-header"><div className="campaign-module-heading"><ScrollText/><div><p className="eyebrow">Progressão</p><h2>XP e Evolução</h2><p>Acompanhe experiência distribuída, disponível e histórico dos personagens.</p></div></div></div><CampaignXpHistory key={xpCharacterId} campaignId={campaign.id} initialCharacterId={xpCharacterId}/></section>}
            {view === 'possessions' && <section className="campaign-module-workspace"><div className="campaign-module-header"><div className="campaign-module-heading"><PackageOpen/><div><p className="eyebrow">Recursos especiais</p><h2>Itens Restritos</h2><p>Revise, conceda e administre pertences que exigem controle do Narrador.</p></div></div></div><CampaignPossessionsManager campaignId={campaign.id}/></section>}
            {view === 'handouts' && <section className="campaign-module-workspace"><div className="campaign-module-header"><div className="campaign-module-heading"><ImageIcon/><div><p className="eyebrow">Arquivos da crônica</p><h2>Handouts / Revelações</h2><p>Organize materiais da mesa e compartilhe arquivos com jogadores.</p></div></div></div><div className="campaign-module-empty"><ImageIcon/><h3>Handouts / Revelações</h3><p>Drive de Handouts da mesa. Implementação funcional seguirá a SPEC de Vercel Blob.</p></div></section>}
            {view === 'limits' && <section className="campaign-module-workspace"><div className="campaign-module-header"><div className="campaign-module-heading"><Shield/><div><p className="eyebrow">Segurança e acordos</p><h2>Limites da Mesa</h2><p>Configure limites e regras específicas aplicadas à crônica.</p></div></div></div><div className="campaign-module-empty"><Shield/><h3>Limites da Mesa</h3><p>O domínio de limites ainda não está implementado.</p></div></section>}
            {view === 'projects' && <section className="campaign-module-workspace"><div className="campaign-module-header"><div className="campaign-module-heading"><FolderKanban/><div><p className="eyebrow">Planos de longo prazo</p><h2>Projetos</h2><p>Acompanhe Projects pessoais e coletivos da Coterie.</p></div></div></div><div className="campaign-module-empty"><FolderKanban/><h3>Projetos</h3><p>Módulo reservado aos Projects definidos na SPEC-SESSION-011.</p></div></section>}
            {view === 'coterie' && <section className="campaign-module-workspace"><div className="campaign-module-header"><div className="campaign-module-heading"><Users/><div><p className="eyebrow">Estrutura coletiva</p><h2>Cotterie</h2><p>Gerencie membros, Domain, Backgrounds, Goals e recursos compartilhados.</p></div></div></div><div className="campaign-module-empty"><Users/><h3>Cotterie</h3><p>Módulo reservado à Coterie definida na SPEC-SESSION-011.</p></div></section>}
            {view === 'messages' && <section className="campaign-module-workspace"><div className="campaign-module-header"><div className="campaign-module-heading"><MessagesSquare/><div><p className="eyebrow">Comunicação entre personagens</p><h2>Mensagens da Mesa</h2><p>Acompanhe conversas privadas entre personagens da crônica.</p></div></div></div><div className="campaign-module-empty"><MessagesSquare/><h3>Mensagens da Mesa</h3><p>Mensagens entre personagens ainda não possuem domínio persistente.</p></div></section>}
            {view === 'notes' && <section className="campaign-module-workspace"><div className="campaign-module-header"><div className="campaign-module-heading"><NotebookPen/><div><p className="eyebrow">Registro do Narrador</p><h2>Anotações</h2><p>Organize, agrupe e pesquise registros, pistas e informações da campanha.</p></div></div></div><NotesPanel actorId={session.user.sub} initialCampaignId={campaign.id}/></section>}
            {view === 'research' && <section className="campaign-module-workspace"><div className="campaign-module-header"><div className="campaign-module-heading"><Search/><div><p className="eyebrow">Referências de regras</p><h2>Pesquisas</h2><p>Consulte catálogos de disciplinas, habilidades, vantagens e defeitos.</p></div></div></div><div className="campaign-module-choice-grid"><Link href="/master/catalogo"><Search/><strong>Disciplinas e habilidades</strong><span>Abrir catálogo de poderes e referências.</span></Link><Link href="/master/vantagens-defeitos"><BookOpen/><strong>Vantagens e defeitos</strong><span>Abrir catálogo e itens personalizados.</span></Link></div></section>}
            {view === 'settings' && <section className="campaign-module-workspace"><div className="campaign-module-header"><div className="campaign-module-heading"><Settings2/><div><p className="eyebrow">Administração</p><h2>Configurações da Mesa</h2><p>Gerencie o estado e as opções administrativas da campanha.</p></div></div></div><CampaignArchiveControl id={campaign.id} name={campaign.name} archived={campaign.status==='Arquivada'}/></section>}
          </div>
          </div>
        </div>
      </div>
    </main>
  )
}
