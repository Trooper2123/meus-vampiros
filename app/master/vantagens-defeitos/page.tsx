import { ArchiveHeader } from '@/components/archive-header'
import { MeritsFlawsResearch } from '@/components/merits-flaws-research'
import { getSessionOrDev } from '@/lib/auth0'
import { hasMasterAccess } from '@/lib/campaigns'
import catalog from '@/lib/vtm-v5/merits-flaws-catalog.json'
import { notFound, redirect } from 'next/navigation'

export default async function MeritsFlawsResearchPage() {
  const session = await getSessionOrDev()
  if (!session?.user?.sub) redirect('/auth/login?returnTo=/master/vantagens-defeitos')
  if (!await hasMasterAccess(session.user)) notFound()
  return <main className="min-h-screen bg-background text-foreground">
    <div className="noise" aria-hidden="true" />
    <ArchiveHeader title="Pesquisa do Narrador" />
    <div className="archive-content">
      <section className="archive-page-heading"><p className="eyebrow">Acervo de regras · acesso restrito</p><h1 className="font-serif text-4xl uppercase sm:text-6xl">Vantagens e defeitos</h1><p className="text-sm leading-6 text-muted-foreground">Qualidades, defeitos, antecedentes e traços de domínio, organizados por categoria e pontos.</p><p className="text-sm leading-6 text-muted-foreground">{catalog.scope.pt} Consulte as fontes e os requisitos da mesa antes de aplicar as regras. Esta pesquisa não realiza compras nem concede pontos à ficha.</p></section>
      <MeritsFlawsResearch entries={catalog.entries} rules={catalog.general_rules} />
    </div>
  </main>
}
