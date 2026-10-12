import { redirect } from 'next/navigation'
import { getSessionOrDev } from '@/lib/auth0'
import { getCharacterById } from '@/lib/characters'
import { getCampaignById } from '@/lib/campaigns'
import { CharacterSummaryClient } from '../character-summary-client'
import Link from 'next/link'

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
    powers?: Array<{
      name?: string
      effect?: string
      cost?: string
      prerequisite?: string
      amalgam?: string
      duration?: string
      dicePool?: string
      opposingPool?: string
      additionalNotes?: string
      source?: string
    }>
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

  const parseIntSafe = (value: unknown): number => {
    const num = Number.parseInt(String(value), 10)
    return Number.isNaN(num) ? 0 : num
  }

  const getName = (): string => {
    if (data['nome'] && String(data['nome']).trim() !== '') return String(data['nome'])
    if (character.name && character.name.trim() !== '') return character.name
    return 'Personagem sem nome'
  }

  return {
    id: character.id,
    name: getName(),
    clan: data['cla'] ? String(data['cla']) : null,
    predator: data['predador'] ? String(data['predador']) : null,
    generation: data['geracao'] ? String(data['geracao']) : null,
    campaignName,
    campaignTheme,
    attributes: {
      forca: parseIntSafe(data['forca']),
      destreza: parseIntSafe(data['destreza']),
      vigor: parseIntSafe(data['vigor']),
      carisma: parseIntSafe(data['carisma']),
      manipulacao: parseIntSafe(data['manipulacao']),
      compostura: parseIntSafe(data['compostura']),
      inteligencia: parseIntSafe(data['inteligencia']),
      raciocinio: parseIntSafe(data['raciocinio']),
      determinacao: parseIntSafe(data['determinacao']),
    },
    skills: Object.fromEntries(
      [
        'Armas brancas', 'Armas de fogo', 'Atletismo', 'Briga', 'Condução', 'Furtividade', 'Ladroagem', 'Ofícios', 'Sobrevivência',
        'Empatia com animais', 'Etiqueta', 'Intimidação', 'Liderança', 'Manha', 'Performance', 'Persuasão', 'Sagacidade', 'Subterfúgio',
        'Ciência', 'Erudição', 'Finanças', 'Investigação', 'Medicina', 'Ocultismo', 'Percepção', 'Política', 'Tecnologia',
      ].map((skill) => [skill, parseIntSafe(data[skill])]),
    ),
    merits: Array.isArray(data['vantagens']) ? data['vantagens'] : [],
    flaws: Array.isArray(data['defeitos']) ? data['defeitos'] : [],
    disciplines,
    resources: {
      humanidade: parseIntSafe(data['humanidade']),
      vontade: parseIntSafe(data['vontade']),
      vitalidade: parseIntSafe(data['vitalidade']),
      fome: parseIntSafe(data['fome']),
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
          <Link href={`/characters/${id}/edit`} className="button-primary inline-flex items-center gap-2">
            <span className="text-xs">Editar ficha completa</span>
          </Link>
        </div>

        <CharacterSummaryClient data={characterData} />
      </div>
    </main>
  )
}
