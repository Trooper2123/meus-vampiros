import { redirect } from 'next/navigation'
import { getSessionOrDev } from '@/lib/auth0'
import { getCharacterById } from '@/lib/characters'
import { getCampaignById } from '@/lib/campaigns'
import { CharacterSummaryClient } from './character-summary-client'
import Link from 'next/link'
import { ArrowRight, BookOpen, Edit, FileText } from 'lucide-react'

async function getCharacterData(id: string, userId: string) {
  const character = await getCharacterById(id, userId)
  if (!character) return null

  const data = character.data as Record<string, unknown>
  
  // Normalizar disciplinas (converter formato legado para array)
  const rawDisciplines = data['disciplinas']
  interface LegacyDiscipline {
    id?: string
    name?: string
    level?: number
    powers?: any[]
  }
  const disciplines = Array.isArray(rawDisciplines) 
    ? (rawDisciplines as LegacyDiscipline[]).map((d) => ({
        id: d.id || `disc-${d.name?.toLowerCase()}`,
        name: d.name || '',
        level: d.level || 0,
        powers: Array.isArray(d.powers) ? d.powers : [],
      }))
    : []

  // Buscar dados da mesa se existir
  let campaignName = null
  let campaignTheme = null
  if (character.campaignId) {
    const campaign = await getCampaignById(character.campaignId)
    if (campaign) {
      campaignName = campaign.name
      campaignTheme = campaign.theme
    }
  }

  return {
    id: character.id,
    name: character.name,
    clan: data['cla'] as string | null,
    predator: data['predador'] as string | null,
    generation: data['geracao'] as string | null,
    campaignName,
    campaignTheme,
    attributes: {
      forca: data['forca'] as number,
      destreza: data['destreza'] as number,
      vigor: data['vigor'] as number,
      carisma: data['carisma'] as number,
      manipulacao: data['manipulacao'] as number,
      compostura: data['compostura'] as number,
      inteligencia: data['inteligencia'] as number,
      raciocinio: data['raciocinio'] as number,
      determinacao: data['determinacao'] as number,
    },
    skills: {},
    disciplines,
    resources: {
      humanidade: data['humanidade'] as number ?? 0,
      vontade: data['vontade'] as number ?? 0,
      vitalidade: data['vitalidade'] as number ?? 0,
      fome: data['fome'] as number ?? 1,
    },
  }
}

export default async function CharacterPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getSessionOrDev()
  if (!session?.user) redirect('/auth/login')

  const { id } = await params
  const characterData = await getCharacterData(id, session.user.sub)
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
            href={`/characters/${params.id}`}
            className="px-4 py-2 text-sm font-medium text-primary"
          >
            <div className="flex items-center gap-2">
              <BookOpen className="size-4" />
              Ficha Completa
            </div>
          </Link>
          <Link
            href={`/characters/${params.id}/summary`}
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
            href={`/create-characters?id=${params.id}`}
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
