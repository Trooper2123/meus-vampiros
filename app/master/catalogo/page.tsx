import { ArchiveHeader } from '@/components/archive-header'
import { MasterResearchCatalog } from '@/components/master-research-catalog'
import { getSessionOrDev } from '@/lib/auth0'
import { hasMasterAccess } from '@/lib/campaigns'
import { getMasterResearchCatalog } from '@/lib/db'
import { notFound, redirect } from 'next/navigation'

export default async function MasterResearchPage({ searchParams }: Readonly<{ searchParams?: Promise<{ embedded?: string }> }>) {
  const embedded = (await searchParams)?.embedded === '1'
  const session = await getSessionOrDev()
  if (!session?.user?.sub) redirect('/auth/login?returnTo=/master/catalogo')
  if (!await hasMasterAccess(session.user)) notFound()
  const catalog = await getMasterResearchCatalog()
  return <main className={embedded ? "catalog-ui-shell catalog-ui-embedded bg-background text-foreground" : "catalog-ui-shell min-h-screen bg-background text-foreground"}>
    <div className="noise" aria-hidden="true" />
    {!embedded && <ArchiveHeader title="Pesquisa do Narrador" />}
    <div className={embedded ? "catalog-ui-content catalog-ui-embedded-content" : "archive-content catalog-ui-content"}>
      
      {!embedded && <section className="archive-page-heading catalog-ui-heading">
        <p className="eyebrow">Acervo de regras · acesso restrito</p>
        <h1 className="font-serif text-4xl uppercase sm:text-6xl">Disciplinas e poderes</h1>
        <p className="text-sm leading-6 text-muted-foreground">Referência pesquisável com poderes, rituais, cerimônias e fórmulas, organizada por Disciplina e nível.</p>
        <p className="text-xs leading-5 text-muted-foreground">Fonte importada de <code>codex/catalogo-disciplinas-vtm-v5.html</code>. Situação e texto refletem a classificação e as notas do catálogo original; confirme a publicação adotada pela mesa antes de aplicar uma regra.</p>
      </section>}
      <div className="mb-6 flex flex-wrap gap-2" aria-label="Contagem do acervo">
        <span className="status active">{catalog.disciplines.length} Disciplinas</span>
        <span className="status active">{catalog.entries.length} conteúdos</span>
      </div>
      <div className="catalog-ui-body"><MasterResearchCatalog entries={catalog.entries} skills={catalog.skills} /></div>
    </div>
  </main>
}
