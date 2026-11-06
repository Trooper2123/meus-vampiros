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

      <div className="archive-content character-summary-page">
        <section className="summary-hero" aria-label="Identidade do personagem">
          <div className="summary-hero-portrait"><SheetMediaPanel compact subjectType="CHARACTER" subjectId={id}/></div>
          <div className="summary-hero-details">
            <p className="eyebrow">Dossiê do personagem</p>
            <h1>{characterData.name}</h1>
            <p className="summary-hero-subtitle">{[characterData.clan, characterData.generation ? `${characterData.generation}ª geração` : null, characterData.campaignTheme].filter(Boolean).join(' · ') || 'Ficha de personagem'}</p>
            <div className="summary-hero-tags">
              <span>{characterData.characterType === 'PLAYER_VAMPIRE' ? 'Vampiro jogador' : characterData.characterType === 'VAMPIRE_NPC' ? 'Vampiro NPC' : characterData.characterType === 'HUMAN_NPC' ? 'Humano NPC' : 'Personagem'}</span>
              {characterData.campaignName && <span>Mesa: {characterData.campaignName}</span>}
            </div>
          </div>
          <div className="summary-hero-actions">
            <Link className="button-ghost" href="/characters">Voltar aos personagens</Link>
            <Link href={`/characters/${id}/edit`} className="button-primary">Editar ficha completa</Link>
            <Link className="button-ghost" href={`/characters/${id}/narrative`}>Perfil, relações e mídias</Link>
          </div>
        </section>
        <CharacterSummaryClient data={characterData} />
      </div>
    </main>
  )
}
