import {ArchiveHeader} from '@/components/archive-header'
import Link from 'next/link'
import {redirect} from 'next/navigation'
import {getSessionOrDev} from '@/lib/auth0'
import {ArrowRight, BookOpen, Plus, Skull} from 'lucide-react'
import {getCharactersForUser} from '@/lib/characters'
import {getCampaignsForMaster, hasMasterAccess} from '@/lib/campaigns'
import {MasterPanel} from '@/components/master-panel'
import {DateAvailabilityCalendar} from '@/components/date-availability-calendar'
import {DuplicateCharacterButton} from '@/components/duplicate-character-button'
import {DeleteCharacterButton} from '@/components/delete-character-button'
import {LiveKitRoomLink} from '@/components/livekit/livekit-room-link'
import {EditCharacterButton} from "@/components/edit-character-button"
import {GetResumeCharacterButton} from "@/components/get-resume-character-button";

export default async function PersonagensPage() {
    if (!process.env.AUTH0_DOMAIN || !process.env.AUTH0_CLIENT_ID || !process.env.AUTH0_SECRET || !process.env.AUTH0_CLIENT_SECRET) {
        const session = await getSessionOrDev()
        if (!session?.user) redirect('/auth/login?returnTo=/characters')
    }

    const session = await getSessionOrDev()
    if (!session?.user) redirect('/auth/login?returnTo=/characters')

    const characters = await getCharactersForUser(session.user.sub)
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
    const userIsMaster = await hasMasterAccess(session.user)
    const campaigns = userIsMaster ? await getCampaignsForMaster(session.user.sub) : []

    const storyHref = userIsMaster ? '/campaigns' : '/master'

    return (
        <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
            <div className="noise" aria-hidden="true"/>
            <ArchiveHeader title="Personagens" showCampaigns={campaigns.length > 0}/>

            <div className="archive-content">
                <div
                    className="mb-8 flex flex-col gap-4">{[...new Map(characters.flatMap(character => character.campaignId ? [[character.campaignId, character.campaignName] as const] : []))].map(([campaignId, campaignName]) =>
                    <LiveKitRoomLink key={campaignId} campaignId={campaignId} campaignName={campaignName}
                                     master={false}/>)}</div>
                {/* Cabeçalho da seção com os dois botões */}
                <div className="archive-page-heading">
                    <div>
                        <p className="eyebrow">Arquivo pessoal / acesso autorizado</p>
                        <h1 className="mt-3 font-serif text-4xl uppercase tracking-[0.08em] sm:text-6xl">Suas
                            criaturas</h1>
                        <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
                            Um resumo dos personagens ligados à sua conta. Selecione uma ficha para continuar sua
                            história.
                        </p>
                    </div>
                    <div className="archive-page-actions">
                        {campaigns.length === 0 && <Link
                            href={storyHref}
                            id="btn-conte-historia"
                            className="button-ghost inline-flex items-center justify-center gap-2"
                        >
                            <BookOpen className="size-4"/> Conte sua história
                        </Link>}
                        <Link href="/create-characters"
                              className="button-primary inline-flex items-center justify-center gap-2">
                            <Plus className="size-4"/> Criar personagem
                        </Link>
                    </div>
                </div>

                {characters.length === 0 ? (
                    <section className="login-panel mx-auto max-w-2xl text-center">
                        <Skull className="mx-auto size-12 text-primary" aria-hidden="true"/>
                        <p className="eyebrow mt-6">Nenhum registro encontrado</p>
                        <h3 className="mt-3 font-serif text-3xl uppercase tracking-[0.08em]">O arquivo está vazio</h3>
                        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
                            Comece criando seu primeiro personagem. O rascunho ficará vinculado à sua conta.
                        </p>
                        <Link href="/create-characters" className="button-primary mt-7 inline-flex items-center gap-2">
                            Abrir criação <ArrowRight className="size-4"/>
                        </Link>
                    </section>
                ) : (
                    <div className="flex flex-col gap-8">
                        {characterGroups.filter((group) => group.characters.length > 0).map((group) => <section
                            key={group.label} aria-label={group.label}><h2 className="eyebrow mb-6">{group.label}</h2>
                            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                                {group.characters.map((character) => (
                                    <div key={character.id} className="archive-character-card">
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <h3 className="font-serif text-2xl">{character.name}</h3>
                                            </div>
                                            <span
                                                className={`status ${character.status === 'APPROVED' ? 'active' : ''}`}><span
                                                className="status-dot" aria-hidden="true"/>{({
                                                DRAFT: 'Rascunho',
                                                IN_REVIEW: 'Em revisão',
                                                APPROVED: 'Aprovada',
                                                ARCHIVED: 'Arquivada',
                                                REJECTED: 'Devolvida'
                                            } as Record<string, string>)[character.status] ?? 'Não definido'}</span>
                                        </div>
                                        <div className="mt-5"><p className="archive-label">Conceito</p><p
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
                                                <dd className="mt-1 truncate"
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
                                        <div className="archive-card-actions">
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
                                ))}
                            </div>
                        </section>)}
                    </div>
                )}

                {Array.from(new Set(characters.map((character) => character.campaignId).filter((campaignId): campaignId is string => Boolean(campaignId)))).map((campaignId) => (
                    <section key={campaignId} className="mt-10">
                        <DateAvailabilityCalendar campaignId={campaignId}/>
                    </section>
                ))}

                {userIsMaster && campaigns.length > 0 && (
                    <section className="mt-14 border-t border-border pt-10">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <p className="eyebrow">Painel do Narrador</p>
                                <h3 className="font-serif text-2xl uppercase tracking-[0.08em] mt-1">Gerenciamento de
                                    Mesas</h3>
                            </div>
                            <Link href="/campaigns" className="button-ghost text-xs">Ver tela cheia</Link>
                        </div>
                        <MasterPanel initialCampaigns={campaigns}/>
                    </section>
                )}
            </div>
        </main>
    )
}
