import { redirect } from 'next/navigation'
import { getSessionOrDev } from '@/lib/auth0'
import { getCharacterById } from '@/lib/characters'
import { getCampaignById } from '@/lib/campaigns'
import { CharacterSummaryClient } from '../character-summary-client'
import Link from 'next/link'
import { FileText } from 'lucide-react'

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

export default async function CharacterSummaryPage({
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
          <a href={`/create-characters?id=${params.id}`} className="button-primary inline-flex items-center gap-2">
            <span className="text-xs">Editar ficha completa</span>
          </a>
        </div>

        <CharacterSummaryClient data={characterData} />
      </div>
    </main>
  )
}
