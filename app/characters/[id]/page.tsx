import { getCharacterSummaryData } from '@/lib/character-summary'
import { redirect } from 'next/navigation'
import { getSessionOrDev } from '@/lib/auth0'
import { CharacterSummaryClient } from './character-summary-client'
import Link from 'next/link'
import { BookOpen, Edit, FileText } from 'lucide-react'

export default async function CharacterPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getSessionOrDev()
  if (!session?.user) redirect('/auth/login')

  const { id } = await params
  const characterData = await getCharacterSummaryData(id, session.user.sub)
  if (!characterData) redirect('/characters')

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="noise" aria-hidden="true" />
      <header className="sheet-header">
        <div>
          <p className="eyebrow">Arquivos da Noite</p>
          <h1 className="mt-2 font-serif text-2xl uppercase tracking-[0.12em]">
            {characterData.name}
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden text-sm text-muted-foreground sm:inline">
            {session.user.name ?? session.user.email ?? 'Guardião'}
          </span>
          <Link href="/characters" className="button-ghost inline-flex items-center gap-2">
            <FileText className="size-4" /> Arquivo
          </Link>
          <a href="/auth/logout" className="button-ghost inline-flex items-center gap-2">
            <span className="text-xs">Sair</span>
          </a>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 lg:py-14">
        {/* Navegação entre Resumo e Ficha Completa */}
        <div className="mb-8 flex items-center gap-2 border-b border-border pb-4">
          <Link
            href={`/characters/${id}`}
            className="px-4 py-2 text-sm font-medium text-primary"
          >
            <div className="flex items-center gap-2">
              <BookOpen className="size-4" />
              Ficha Completa
            </div>
          </Link>
          <Link
            href={`/characters/${id}/summary`}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <div className="flex items-center gap-2">
              <FileText className="size-4" />
              Resumo
            </div>
          </Link>
        </div>

        {/* Conteúdo da Ficha */}
        <CharacterSummaryClient data={characterData} />
        
        {/* Botão para editar ficha completa */}
        <div className="mt-8 border-t border-border pt-6 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            Edite todos os detalhes da ficha em uma página interativa
          </p>
          <Link
            href={`/characters/${id}/edit`}
            className="button-primary inline-flex items-center gap-2"
          >
            <Edit className="size-4" />
            Editar ficha completa
          </Link>
        </div>
      </div>
    </main>
  )
}
