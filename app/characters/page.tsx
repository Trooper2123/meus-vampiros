import {ArchiveHeader} from '@/components/archive-header'
import {CreateCharacterButton} from '@/components/character-creation-dialog'
import Link from 'next/link'
import {redirect} from 'next/navigation'
import {getSessionOrDev} from '@/lib/auth0'
import {ArrowRight, BookOpen, Plus, Skull, Clock3, Pencil, UserRound, CalendarDays, Layers3} from 'lucide-react'
import {getCharactersForUser} from '@/lib/characters'
import {getPlayerUpcomingEncounters} from '@/lib/player-upcoming-encounters'
import {CharacterFilterDashboard, CharacterFilterGroup, CharacterFilterCard} from '@/components/characters/character-filter-dashboard'
import {getCampaignsForMaster, hasMasterAccess} from '@/lib/campaigns'
import {DuplicateCharacterButton} from '@/components/duplicate-character-button'
import {DeleteCharacterButton} from '@/components/delete-character-button'
import {LiveKitRoomLink} from '@/components/livekit/livekit-room-link'
import {EditCharacterButton} from "@/components/edit-character-button"
import {GetResumeCharacterButton} from "@/components/get-resume-character-button";

const characterStatusLabels: Record<string, string> = {
    DRAFT: 'Rascunho',
    IN_REVIEW: 'Em revisão',
    APPROVED: 'Aprovada',
    ARCHIVED: 'Arquivada',
    REJECTED: 'Devolvida',
}

export default async function PersonagensPage() {
    if (!process.env.AUTH0_DOMAIN || !process.env.AUTH0_CLIENT_ID || !process.env.AUTH0_SECRET || !process.env.AUTH0_CLIENT_SECRET) {
        const session = await getSessionOrDev()
        if (!session?.user) redirect('/auth/login?returnTo=/characters')
    }

    const session = await getSessionOrDev()
    if (!session?.user) redirect('/auth/login?returnTo=/characters')

    const [characters, upcomingEncounters] = await Promise.all([
        getCharactersForUser(session.user.sub),
        getPlayerUpcomingEncounters(session.user.sub),
    ])
    const characterGroups = [
        {
            label: 'Desvinculados',
            characters: characters.filter((character) => !character.campaignId && character.status !== 'ARCHIVED')
        },
        {
            label: 'Vinculados',
            characters: characters.filter((character) => character.campaignId && character.status !== 'ARCHIVED')
        },
        {label: 'Arquivados', characters: characters.filter((character) => character.status === 'ARCHIVED')},
    ]
    const activeCount = characters.filter(character => character.status !== 'ARCHIVED').length
    const approvedCount = characters.filter(character => character.status === 'APPROVED').length
    const linkedCount = characters.filter(character => Boolean(character.campaignId) && character.status !== 'ARCHIVED').length
    const userIsMaster = await hasMasterAccess(session.user)
    const campaigns = userIsMaster ? await getCampaignsForMaster(session.user.sub) : []

    const storyHref = userIsMaster ? '/campaigns' : '/master'
  const latestUpdates = characters.slice(0, 5)

    return (
        <main className="characters-ui-shell relative min-h-screen overflow-hidden bg-background text-foreground">
            <div className="noise" aria-hidden="true"/>
            <ArchiveHeader title="Personagens" showCampaigns={campaigns.length > 0} variant="characters"/>

            <div className="archive-content characters-ui-content characters-approved-content">
                <div
                    className="characters-livekit-calls mb-8 flex flex-col gap-4">{[...new Map(characters.flatMap(character => character.campaignId ? [[character.campaignId, character.campaignName] as const] : []))].map(([campaignId, campaignName]) =>
                    <LiveKitRoomLink key={campaignId} campaignId={campaignId} campaignName={campaignName}
                                     master={false} activeOnly />)}</div>
                {/* Cabeçalho da seção com os dois botões */}
                <div className="archive-page-heading characters-approved-heading">
                    <div>
                        <p className="eyebrow">Arquivo pessoal / acesso autorizado</p>
                        <h1 className="mt-3 font-serif text-4xl tracking-[0.02em] sm:text-6xl">Suas
                            criaturas</h1>
                        <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
                            Um resumo dos personagens ligados à sua conta. Selecione uma ficha para continuar sua
                            história.
                        </p>
                    </div>
                    <div className="archive-page-actions characters-approved-actions">
                        {campaigns.length === 0 && <Link
                            href={storyHref}
                            id="btn-conte-historia"
                            className="button-ghost inline-flex items-center justify-center gap-2"
                        >
                            <BookOpen className="size-4"/> Conte sua história
                        </Link>}
                        <CreateCharacterButton>
                            <Plus className="size-4"/> Novo personagem
                        </CreateCharacterButton>
                    </div>
                </div>

                <CharacterFilterDashboard
                  counts={{current: activeCount, approved: approvedCount, linked: linkedCount}}
                  characters={characters.map(character => ({status: character.status, linked: Boolean(character.campaignId)}))}
                >
                <div className="characters-approved-body">
                  <div className="characters-approved-main">
                {characters.length === 0 ? (
                    <section className="login-panel mx-auto max-w-2xl text-center">
                        <Skull className="mx-auto size-12 text-primary" aria-hidden="true"/>
                        <p className="eyebrow mt-6">Nenhum registro encontrado</p>
                        <h3 className="mt-3 font-serif text-3xl uppercase tracking-[0.08em]">O arquivo está vazio</h3>
                        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
                            Comece criando seu primeiro personagem. O rascunho ficará vinculado à sua conta.
                        </p>
                        <CreateCharacterButton className="button-primary mt-7 inline-flex items-center gap-2">
                            Abrir criação <ArrowRight className="size-4"/>
                        </CreateCharacterButton>
                    </section>
                ) : (
                    <div className="flex flex-col gap-8">
                        {characterGroups.filter((group) => group.characters.length > 0).map((group) => <CharacterFilterGroup key={group.label} characters={group.characters.map(character => ({status: character.status, linked: Boolean(character.campaignId)}))}><section
                            aria-label={group.label}><h2 className="eyebrow mb-6">{group.label}</h2>
                            <div className="grid gap-5 lg:grid-cols-2">
                                {group.characters.map((character) => (
                                    <CharacterFilterCard key={character.id} character={{status: character.status, linked: Boolean(character.campaignId)}}>
                                    <div className="archive-character-card characters-ui-card characters-approved-card">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex min-w-0 items-center gap-3">
                                                <span className="characters-ui-avatar" aria-hidden="true">{character.name?.trim().charAt(0).toUpperCase() || <UserRound className="size-6"/>}</span>
                                                <h3 className="break-words font-serif text-2xl">{character.name}</h3>
                                            </div>
                                            <span className={`status ${character.status === 'APPROVED' ? 'active' : ''}`}>
                                                <span className="status-dot" aria-hidden="true" />
                                                {characterStatusLabels[character.status] ?? 'Não definido'}
                                            </span>
                                        </div>
                                        <div className="mt-5 rounded-lg border border-border bg-background/60 p-3"><p className="archive-label">Conceito</p><p
                                            className="mt-2 text-sm">{character.concept || 'Não definido'}</p></div>
                                        <dl className="mt-5 grid grid-cols-2 gap-5 border-t border-border pt-5 text-sm">
                                            <div>
                                                <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Clã</dt>
                                                <dd className="mt-1">{character.clan ?? 'Não definido'}</dd>
                                            </div>
                                            <div>
                                                <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Geração</dt>
                                                <dd className="mt-1">{character.generation ?? 'Não definida'}</dd>
                                            </div>
                                            <div className="col-span-2">
                                                <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Mesa</dt>
                                                <dd className="mt-1 break-words"
                                                    title={character.campaignName ?? 'Sem vínculo'}>
                                                    {character.campaignName ?? 'Sem vínculo'}
                                                </dd>
                                                {character.campaignName && (character.campaignTheme || character.campaignPrincipios) &&
                                                    <dd className="mt-2 text-xs leading-5 text-muted-foreground">
                                                        {character.campaignTheme && <p>{character.campaignTheme}</p>}
                                                        {character.campaignPrincipios &&
                                                            <p>{character.campaignPrincipios}</p>}
                                                    </dd>}
                                            </div>
                                            <div className="col-span-2">
                                                <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">XP
                                                    (Gasto/Total)
                                                </dt>
                                                <dd className="mt-1">{character.spentXp ?? '0'} / {character.totalXp ?? '0'}</dd>
                                            </div>
                                        </dl>
                                        {character.campaignId && character.characterType === 'PLAYER_VAMPIRE' && <Link href={`/campaigns/player/${character.campaignId}`} className="characters-access-campaign" aria-label={`Acessar a mesa ${character.campaignName ?? ''} como jogador`}><Layers3 className="size-4" aria-hidden="true"/><span>Acessar mesa</span><ArrowRight className="size-4" aria-hidden="true"/></Link>}
                                        <div className="archive-card-actions characters-ui-actions">
                                            {character.characterType === 'PLAYER_VAMPIRE' &&
                                                <GetResumeCharacterButton characterId={character.id}/>}
                                            {character.characterType === 'PLAYER_VAMPIRE' &&
                                                <DuplicateCharacterButton characterId={character.id}/>}
                                            {character.characterType === 'PLAYER_VAMPIRE' &&
                                                <EditCharacterButton characterId={character.id}/>}
                                            {character.characterType === 'PLAYER_VAMPIRE' &&
                                                <DeleteCharacterButton characterId={character.id} name={character.name}
                                                                       revision={character.revision}/>}
                                        </div>
                                    </div>
                                    </CharacterFilterCard>
                                ))}
                            </div>
                        </section></CharacterFilterGroup>)}
                    </div>
                )}

                  </div>
                  <aside className="characters-right-rail" aria-label="Agenda e atualizações dos personagens">
                    <section className="characters-encounters-panel" aria-labelledby="characters-encounters-heading">
                      <div className="characters-update-heading"><CalendarDays className="size-5 text-primary" aria-hidden="true"/><h2 id="characters-encounters-heading">Próximo encontro</h2></div>
                      <p className="characters-encounters-subtitle">Datas sugeridas pelo Narrador nas mesas em que você participa.</p>
                      {upcomingEncounters.length === 0 ? <p className="characters-updates-empty">Nenhuma data de encontro sugerida para suas mesas.</p> :
                        <ol className="characters-encounters-list">{upcomingEncounters.map(encounter => <li key={`${encounter.campaignId}:${encounter.date}`}>
                          <div className="characters-encounter-date" aria-hidden="true"><strong>{encounter.date.slice(8,10)}</strong><span>{new Intl.DateTimeFormat('pt-BR',{month:'short',timeZone:'UTC'}).format(new Date(`${encounter.date}T12:00:00Z`))}</span></div>
                          <div className="characters-encounter-details"><strong>{encounter.campaignName}</strong><time dateTime={encounter.date}>{new Intl.DateTimeFormat('pt-BR',{weekday:'long',day:'numeric',month:'long',timeZone:'UTC'}).format(new Date(`${encounter.date}T12:00:00Z`))}</time>{encounter.startTime && <span>Horário previsto: {encounter.startTime}{encounter.endTime ? `–${encounter.endTime}` : ''}</span>}<small>Data sugerida · não confirmada</small></div>
                        </li>)}</ol>}
                    </section>
                    <section className="characters-update-panel" aria-labelledby="characters-updates-heading">
                      <div className="characters-update-heading"><Clock3 className="size-5 text-primary" aria-hidden="true"/><h2 id="characters-updates-heading">Últimas atualizações</h2></div>
                      {latestUpdates.length === 0 ? <p className="characters-updates-empty">Ainda não há atualizações de personagens para mostrar.</p> : <ol className="characters-update-list">{latestUpdates.map(character => <li key={character.id}>
                        <span className="characters-update-icon"><Pencil className="size-4" aria-hidden="true"/></span>
                        <div><Link href={`/characters/${character.id}/resume`} className="characters-update-link">{character.name || 'Personagem sem nome'}</Link><p>Ficha atualizada · {characterStatusLabels[character.status] ?? 'Status não definido'}</p><time dateTime={character.updatedAt}>{new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short'}).format(new Date(character.updatedAt))}</time></div>
                      </li>)}</ol>}
                    </section>
                  </aside>
                </div>
                </CharacterFilterDashboard>

            </div>
        </main>
    )
}
