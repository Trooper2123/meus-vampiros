import { ArchiveHeader } from '@/components/archive-header'
import { getCharacterSummaryData } from '@/lib/character-summary'
import { redirect } from 'next/navigation'
import { getSessionOrDev } from '@/lib/auth0'
import { CharacterSummaryClient } from '../character-summary-client'
import Link from 'next/link'
import { SheetMediaPanel } from '@/components/sheet-media-panel'

export default async function CharacterSummaryPage({
  params,
}: Readonly<{
  params: Promise<{ id: string }>
}>) {
  const session = await getSessionOrDev()
  if (!session?.user) redirect('/auth/login')

  const { id } = await params
  const characterData = await getCharacterSummaryData(id, session.user.sub)
  if (!characterData) redirect('/characters')

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="noise" aria-hidden="true" />
      <ArchiveHeader title="Resumo da ficha" />

      <div className="archive-content">
        <div className="mb-4 flex flex-wrap justify-end gap-3">
          <Link href={`/characters/${id}/edit`} className="button-primary inline-flex items-center gap-2">
            <span className="text-xs">Editar ficha completa</span>
          </Link>
        </div>

        <section className="mb-6 flex flex-col gap-4"><SheetMediaPanel compact subjectType="CHARACTER" subjectId={id}/><Link className="button-ghost self-start" href={`/characters/${id}/narrative`}>Perfil, relações e mídias</Link></section>
        <CharacterSummaryClient data={characterData} />
      </div>
    </main>
  )
}
