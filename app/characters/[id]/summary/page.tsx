import { ArchiveHeader } from '@/components/archive-header'
import { getCharacterSummaryData } from '@/lib/character-summary'
import { redirect } from 'next/navigation'
import { getSessionOrDev } from '@/lib/auth0'
import { CharacterSummaryClient } from '../character-summary-client'
import Link from 'next/link'
import { CampaignNotesDialog } from '@/components/notes/campaign-notes-dialog'

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
      <ArchiveHeader title="Resumo da ficha" />

      <div className="archive-content">
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

        <CharacterSummaryClient data={characterData} headerActions={characterData.campaignId && characterData.characterType === 'PLAYER_VAMPIRE' ? <CampaignNotesDialog campaignId={characterData.campaignId} actorId={session.user.sub} player compact /> : undefined} />
      </div>
    </main>
  )
}
