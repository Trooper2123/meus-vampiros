import { characterClan, type ClanCode } from './clans'
import type { RuleSourceId } from './rule-profile'

export const CLAN_CONDITION_LABELS = {
  COMPULSION_PENALTY: 'Compulsão: penalidade aplicável (Lasombra: ativar somente após a falha)',
  BRIGHT_LIGHT: 'Luz intensa dirigida ao personagem',
  ELECTRONIC_DETECTION: 'Tentativa de evitar detecção eletrônica de vampiros',
} as const
export type ClanCondition = keyof typeof CLAN_CONDITION_LABELS
export type ClanRollContext = { communication?: boolean; pursuingCompulsion?: boolean }
type CharacterContext = { data: Record<string, unknown>; gameState: Record<string, unknown>; campaignId: string | null }
export type ClanModifiers = { clanCode: ClanCode; dicePenalty: number; labels: string[]; sourceIds: RuleSourceId[] }

export function clanConditionOptions(data: Record<string, unknown>): ClanCondition[] {
  const clan = characterClan(data)
  return [
    ...(typeof clan?.compulsionRule?.mechanics.dicePenalty === 'number' ? ['COMPULSION_PENALTY' as const] : []),
    ...(clan?.code === 'MINISTRY' ? ['BRIGHT_LIGHT' as const] : []),
    ...(clan?.code === 'LASOMBRA' ? ['ELECTRONIC_DETECTION' as const] : []),
  ]
}

export function readClanConditions(character: CharacterContext): ClanCondition[] {
  const stored = character.gameState.clanConditions as { clanCode?: string; campaignId?: string; active?: unknown } | undefined
  const clan = characterClan(character.data)
  if (!character.campaignId || stored?.campaignId !== character.campaignId || !clan || stored.clanCode !== clan.code || !Array.isArray(stored.active)) return []
  const allowed = clanConditionOptions(character.data)
  const active = stored.active
  return allowed.filter(condition => active.includes(condition))
}

export function validClanRollContext(value: unknown): value is ClanRollContext {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value) && Object.entries(value).every(([key, flag]) => ['communication', 'pursuingCompulsion'].includes(key) && typeof flag === 'boolean'))
}

export function clanRollAdjustment(character: CharacterContext, severity: number | null, context: ClanRollContext = {}) {
  const clan = characterClan(character.data)
  const active = readClanConditions(character)
  const modifiers: ClanModifiers | undefined = clan?.baneRule && clan.compulsionRule ? { clanCode: clan.code, dicePenalty: 0, labels: [], sourceIds: [] } : undefined
  let difficulty: number | undefined
  if ((active.some(condition => condition !== 'COMPULSION_PENALTY') || context.communication) && (!Number.isSafeInteger(severity) || severity === null || severity < 0)) throw new Error('Gravidade da Perdição indisponível.')
  if (context.communication && clan?.code !== 'LASOMBRA') throw new Error('Comunicação tecnológica exige Lasombra.')
  if (context.pursuingCompulsion && (!active.includes('COMPULSION_PENALTY') || ['BANU_HAQIM', 'LASOMBRA'].includes(clan?.code ?? ''))) throw new Error('Esta compulsão não permite essa exceção por rolagem.')
  if (modifiers && clan) {
    if (active.includes('COMPULSION_PENALTY') && !context.pursuingCompulsion) {
      modifiers.dicePenalty += Number(clan.compulsionRule!.mechanics.dicePenalty)
      modifiers.labels.push(`Compulsão: ${clan.compulsionRule!.name}`)
      modifiers.sourceIds.push(clan.compulsionRule!.sourceId)
    }
    if (active.includes('BRIGHT_LIGHT') || active.includes('ELECTRONIC_DETECTION')) {
      modifiers.dicePenalty += severity!
      modifiers.labels.push(`Perdição: ${clan.baneRule!.name}`)
      modifiers.sourceIds.push(clan.baneRule!.sourceId)
    }
    if (context.communication) {
      difficulty = clan.baneRule!.mechanics.difficultyBase! + severity!
      modifiers.labels.push('Perdição: comunicação tecnológica')
      modifiers.sourceIds.push(clan.baneRule!.sourceId)
    }
    if (context.pursuingCompulsion) {
      modifiers.labels.push('Ação voltada à compulsão: exceção confirmada pelo Narrador')
      modifiers.sourceIds.push(clan.compulsionRule!.sourceId)
    }
    modifiers.sourceIds = [...new Set(modifiers.sourceIds)]
  }
  return { modifiers: modifiers?.labels.length ? modifiers : undefined, difficulty }
}
