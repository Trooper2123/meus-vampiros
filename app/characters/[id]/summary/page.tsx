import { getCharacterSummaryData } from '@/lib/character-summary'
import { redirect } from 'next/navigation'
import { getSessionOrDev } from '@/lib/auth0'
import { CharacterSummaryClient } from '../character-summary-client'
import Link from 'next/link'

export default async function CharacterSummaryPage({
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
          <a href="/auth/logout" className="button-ghost inline-flex items-center gap-2">
            <span className="text-xs">Sair</span>
          </a>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 lg:py-14">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="eyebrow">Visualização inicial da ficha</p>
            <h2 className="mt-3 font-serif text-3xl uppercase tracking-[0.08em]">
              Visão Geral
            </h2>
          </div>
          <Link href={`/characters/${id}/edit`} className="button-primary inline-flex items-center gap-2">
            <span className="text-xs">Editar ficha completa</span>
          </Link>
        </div>

        <CharacterSummaryClient data={characterData} />
      </div>
    </main>
  )
}
