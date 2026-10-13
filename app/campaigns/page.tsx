import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSessionOrDev } from '@/lib/auth0'
import { ArrowLeft, BookOpen, LogOut, Plus } from 'lucide-react'
import { getCampaignsForMaster, hasMasterAccess } from '@/lib/campaigns'
import { MasterPanel } from '@/components/master-panel'

export default async function CampaignsPage() {
  if (!process.env.AUTH0_DOMAIN || !process.env.AUTH0_CLIENT_ID || !process.env.AUTH0_SECRET || !process.env.AUTH0_CLIENT_SECRET) {
    const session = await getSessionOrDev()
    if (!session?.user) redirect('/auth/login?returnTo=/campaigns')
  }

  const session = await getSessionOrDev()
  if (!session?.user) redirect('/auth/login?returnTo=/campaigns')

  const userIsMaster = await hasMasterAccess(session.user)

  // Quem não é modelo.md não tem o que ver aqui
  if (!userIsMaster) redirect('/master')

  const campaigns = await getCampaignsForMaster(session.user.sub)
  const displayName = session.user.name ?? session.user.email ?? 'Guardião'

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="noise" aria-hidden="true" />

      <header className="sheet-header">
        <div>
          <p className="eyebrow">Crônicas / acesso restrito</p>
          <h1 className="mt-2 font-serif text-2xl uppercase tracking-[0.12em]">Suas mesas</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden text-sm text-muted-foreground sm:inline">{displayName}</span>
          <Link href="/characters" className="button-ghost inline-flex items-center gap-2">
            <ArrowLeft className="size-4" /> Personagens
          </Link>
          <a href="/auth/logout" className="button-ghost inline-flex items-center gap-2">
            <LogOut className="size-4" /> Sair
          </a>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 lg:py-14">
        {/* Cabeçalho */}
        <div className="mb-10 flex flex-col justify-between gap-6 border-b border-border pb-8 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow">Painel do Narrador</p>
            <h2 className="mt-3 font-serif text-4xl uppercase tracking-[0.08em] sm:text-6xl">Suas histórias</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
              Um resumo das campanhas que você narra. Clique em "Gerenciar mesa" para expandir os personagens e pertences da crônica.
            </p>
          </div>
          <Link href="/campaigns/new" id="btn-nova-campanha" className="button-primary inline-flex items-center justify-center gap-2">
            <Plus className="size-4" /> Nova campanha
          </Link>
        </div>

        {campaigns.length === 0 ? (
          <section className="login-panel mx-auto max-w-2xl text-center">
            <BookOpen className="mx-auto size-12 text-primary" aria-hidden="true" />
            <p className="eyebrow mt-6">Nenhuma crônica registrada</p>
            <h3 className="mt-3 font-serif text-3xl uppercase tracking-[0.08em]">A noite ainda não começou</h3>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
              Crie sua primeira campanha e comece a tecer sua história. Os jogadores poderão se vincular a ela.
            </p>
            <Link href="/campaigns/new" className="button-primary mt-7 inline-flex items-center gap-2">
              Criar primeira mesa <Plus className="size-4" />
            </Link>
          </section>
        ) : (
          <MasterPanel initialCampaigns={campaigns} />
        )}
      </div>
    </main>
  )
}
