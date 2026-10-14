import { redirect } from 'next/navigation'
import { characterText } from '@/lib/vtm-v5/text'
import { getSessionOrDev } from '@/lib/auth0'
import { getCharacterForViewer } from '@/lib/characters'
import { getCampaignById } from '@/lib/campaigns'
import { CharacterSummaryClient } from './character-summary-client'
import Link from 'next/link'
import { BookOpen, Edit, FileText } from 'lucide-react'
import { PREDATOR_TYPE_BY_CODE, normalizePredatorType, type PredatorTypeSelection } from '@/lib/vtm-v5/predator-types'

async function getCharacterData(id: string, userId: string) {
  const character = await getCharacterForViewer(id, userId)
  if (!character) return null

  const data = character.data as Record<string, unknown>
  const predatorDefinition = PREDATOR_TYPE_BY_CODE.get(normalizePredatorType(data.predatorTypeCode ?? data.predador)!)
  
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
    const num = Number.parseInt(characterText(value), 10)
    return Number.isNaN(num) ? 0 : num
  }

  const getName = (): string => {
    if (data['nome'] && characterText(data['nome']).trim() !== '') return characterText(data['nome'])
    if (character.name && character.name.trim() !== '') return character.name
    return 'Personagem sem nome'
  }

  return {
    id: character.id,
    characterType: character.characterType,
    name: getName(),
    clan: data['cla'] ? characterText(data['cla']) : null,
    predator: data['predador'] ? characterText(data['predador']) : null,
    predatorRoll: predatorDefinition?.predatorRoll ?? null,
    predatorSource: predatorDefinition?.source ?? null,
    predatorSelection: data.predatorTypeSelection && typeof data.predatorTypeSelection === 'object' ? data.predatorTypeSelection as Partial<PredatorTypeSelection> : null,
    generation: data['geracao'] ? characterText(data['geracao']) : null,
    creationGrants: character.creationGrants,
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
    skills: {
      'Armas brancas': parseIntSafe(data['habilidade-armas brancas']),
      'Armas de fogo': parseIntSafe(data['habilidade-armas de fogo']),
      'Atletismo': parseIntSafe(data['habilidade-atletismo']),
      'Briga': parseIntSafe(data['habilidade-briga']),
      'Condução': parseIntSafe(data['habilidade-condução']),
      'Furtividade': parseIntSafe(data['habilidade-furtividade']),
      'Ladroagem': parseIntSafe(data['habilidade-ladroagem']),
      'Ofícios': parseIntSafe(data['habilidade-ofícios']),
      'Sobrevivência': parseIntSafe(data['habilidade-sobrevivência']),
      'Empatia com animais': parseIntSafe(data['habilidade-empatia com animais']),
      'Etiqueta': parseIntSafe(data['habilidade-etiqueta']),
      'Intimidação': parseIntSafe(data['habilidade-intimidação']),
      'Liderança': parseIntSafe(data['habilidade-liderança']),
      'Manha': parseIntSafe(data['habilidade-manha']),
      'Performance': parseIntSafe(data['habilidade-performance']),
      'Persuasão': parseIntSafe(data['habilidade-persuasão']),
      'Sagacidade': parseIntSafe(data['habilidade-sagacidade']),
      'Subterfúgio': parseIntSafe(data['habilidade-subterfúgio']),
      'Ciência': parseIntSafe(data['habilidade-ciência']),
      'Erudição': parseIntSafe(data['habilidade-erudição']),
      'Finanças': parseIntSafe(data['habilidade-finanças']),
      'Investigação': parseIntSafe(data['habilidade-investigação']),
      'Medicina': parseIntSafe(data['habilidade-medicina']),
      'Ocultismo': parseIntSafe(data['habilidade-ocultismo']),
      'Percepção': parseIntSafe(data['habilidade-percepção']),
      'Política': parseIntSafe(data['habilidade-política']),
      'Tecnologia': parseIntSafe(data['habilidade-tecnologia']),
    },
    merits: Array.isArray(data['vantagens']) ? data['vantagens'] as Array<{ name?: string; level?: number; description?: string }> : [],
    flaws: Array.isArray(data['defeitos']) ? data['defeitos'] as Array<{ name?: string; level?: number; description?: string }> : [],
    disciplines,
    resources: {
      humanidade: parseIntSafe(data['humanidade']),
      vontade: parseIntSafe(data['vontade']),
      vitalidade: parseIntSafe(data['vitalidade']),
      fome: parseIntSafe(data['fome']),
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
