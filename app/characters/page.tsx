import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSessionOrDev } from '@/lib/auth0'
import { ArrowRight, BookOpen, LogOut, Plus, Skull, Crown } from 'lucide-react'
import { getCharactersForUser } from '@/lib/characters'
import { getCampaignsForMaster, hasMasterAccess } from '@/lib/campaigns'
import { MasterPanel } from '@/components/master-panel'

export default async function PersonagensPage() {
  if (!process.env.AUTH0_DOMAIN || !process.env.AUTH0_CLIENT_ID || !process.env.AUTH0_SECRET || !process.env.AUTH0_CLIENT_SECRET) {
    const session = await getSessionOrDev()
    if (!session?.user) redirect('/auth/login?returnTo=/characters' as any)
  }

  const session = await getSessionOrDev()
  if (!session?.user) redirect('/auth/login?returnTo=/characters')

  const characters = await getCharactersForUser(session.user.sub)
  const userIsMaster = await hasMasterAccess(session.user)
  const campaigns = userIsMaster ? await getCampaignsForMaster(session.user.sub) : []
  const displayName = session.user.name ?? session.user.email ?? 'Guardião'

  const storyHref = userIsMaster ? '/campaigns' : '/master'

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="noise" aria-hidden="true" />
      <header className="sheet-header">
        <div>
          <p className="eyebrow">Arquivos da Noite</p>
          <h1 className="mt-2 font-serif text-2xl uppercase tracking-[0.12em]">Personagens</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden text-sm text-muted-foreground sm:inline">{displayName}</span>
          {!userIsMaster && (
            <Link href="/master" className="button-ghost inline-flex items-center gap-2">
              <Crown className="size-4" /> Sou Mestre
            </Link>
          )}
          {userIsMaster && <MasterPanel initialCampaigns={campaigns} />}
          <a href="/auth/logout" className="button-ghost inline-flex items-center gap-2">
            <LogOut className="size-4" /> Sair
          </a>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 lg:py-14">
        {/* Cabeçalho da seção com os dois botões */}
        <div className="mb-10 flex flex-col justify-between gap-6 border-b border-border pb-8 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow">Arquivo pessoal / acesso autorizado</p>
            <h2 className="mt-3 font-serif text-4xl uppercase tracking-[0.08em] sm:text-6xl">Suas criaturas</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
              Um resumo dos personagens ligados à sua conta. Selecione uma ficha para continuar sua história.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={storyHref}
              id="btn-conte-historia"
              className="button-ghost inline-flex items-center justify-center gap-2"
            >
              <BookOpen className="size-4" /> Conte sua história
            </Link>
            <Link href="/create-characters" className="button-primary inline-flex items-center justify-center gap-2">
              <Plus className="size-4" /> Criar personagem
            </Link>
          </div>
        </div>

        {characters.length === 0 ? (
          <section className="login-panel mx-auto max-w-2xl text-center">
            <Skull className="mx-auto size-12 text-primary" aria-hidden="true" />
            <p className="eyebrow mt-6">Nenhum registro encontrado</p>
            <h3 className="mt-3 font-serif text-3xl uppercase tracking-[0.08em]">O arquivo está vazio</h3>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
              Comece criando seu primeiro personagem. O rascunho ficará vinculado à sua conta.
            </p>
            <Link href="/create-characters" className="button-primary mt-7 inline-flex items-center gap-2">
              Abrir criação <ArrowRight className="size-4" />
            </Link>
          </section>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {characters.map((character) => (
              <Link
                href={`/create-characters?id=${character.id}`}
                key={character.id}
                className="group border border-border bg-card p-6 transition-colors hover:border-primary"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="eyebrow">{character.status}</p>
                    <h3 className="mt-3 font-serif text-2xl uppercase tracking-[0.06em]">{character.name}</h3>
                  </div>
                  <Skull className="size-6 text-primary" aria-hidden="true" />
                </div>
                <dl className="mt-7 grid grid-cols-2 gap-4 border-t border-border pt-5 text-sm">
                  <div>
                    <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Clã</dt>
                    <dd className="mt-1">{character.clan ?? 'Não definido'}</dd>
                  </div>
                  <div>
                    <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Geração</dt>
                    <dd className="mt-1">{character.generation ?? 'Não definida'}</dd>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Mesa</dt>
                    <dd className="mt-1 truncate" title={character.campaignName ?? 'Sem vínculo'}>
                      {character.campaignName ?? 'Sem vínculo'}
                    </dd>
                    {character.campaignName && (character.campaignTheme || character.campaignPrincipios) && <dd className="mt-2 text-xs leading-5 text-muted-foreground">
                      {character.campaignTheme && <p>{character.campaignTheme}</p>}
                      {character.campaignPrincipios && <p>{character.campaignPrincipios}</p>}
                    </dd>}
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">XP (Gasto/Total)</dt>
                    <dd className="mt-1">{character.spentXp ?? '0'} / {character.totalXp ?? '0'}</dd>
                  </div>
                </dl>
                <span className="mt-6 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-primary">
                  Abrir ficha <ArrowRight className="size-3 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
