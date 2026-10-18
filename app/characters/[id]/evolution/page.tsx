import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArchiveHeader } from '@/components/archive-header'
import { CharacterSpecialties } from '@/components/character-summary/character-specialties'
import { CharacterDisciplineProgression } from '@/components/character-summary/character-discipline-progression'
import { getSessionOrDev } from '@/lib/auth0'
import { getCommandCharacter } from '@/lib/character-commands'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export default async function CharacterEvolutionPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  const session = await getSessionOrDev()
  if (!session?.user?.sub) redirect('/auth/login')
  const { id } = await params
  if (!UUID.test(id)) notFound()
  const character = await getCommandCharacter(id)
  if (character?.characterType !== 'PLAYER_VAMPIRE' || character.ownerId !== session.user.sub && character.masterId !== session.user.sub) notFound()
  return <main className="min-h-screen bg-background text-foreground">
    <div className="noise" aria-hidden="true" />
    <ArchiveHeader title="Evolução de personagem" />
    <div className="archive-content">
      <section className="archive-page-heading">
        <p className="eyebrow">Experiência e aprendizado</p>
        <h1 className="font-serif text-4xl uppercase sm:text-6xl">Evolução de {character.name}</h1>
        <p className="text-sm text-muted-foreground">Desenvolva especialidades e Disciplinas. Consulte os custos de XP e as condições de aprendizado.</p>
        <Link href={`/characters/${id}/summary`} className="button-ghost self-start">Voltar ao resumo da ficha</Link>
      </section>
      <div className="flex flex-col gap-6">
        <CharacterDisciplineProgression key={id} characterId={id} />
        <CharacterSpecialties key={id} characterId={id} />
      </div>
    </div>
  </main>
}

