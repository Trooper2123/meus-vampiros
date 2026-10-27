import { CharacterCommandError, type CommandCharacter } from './character-commands'
import { disciplineDefinition } from './vtm-v5/disciplines'

export type XpTransaction = {
  type: 'XP_GRANTED' | 'XP_SPENT' | 'XP_ADJUSTED' | 'XP_REFUNDED'
  campaignId: string | null
  category: 'DISCIPLINE' | 'SPECIALTY' | 'XP'
  traitCode: string | null
  traitName: string
  previousValue: number | null
  newValue: number | null
  xpAmount: number
  totalDelta: number
  spentDelta: number
  totalXp: number
  spentXp: number
  source: string | null
}

export function xpTransactionForCommand(type: string, payload: unknown, before: { totalXp: number; spentXp: number }, character: CommandCharacter): XpTransaction | null {
  const totalDelta = character.totalXp - before.totalXp
  const spentDelta = character.spentXp - before.spentXp
  if (!totalDelta && !spentDelta) return null
  if (![character.totalXp, character.spentXp].every(Number.isSafeInteger) || character.totalXp < 0 || character.spentXp < 0 || character.spentXp > character.totalXp) throw new CharacterCommandError(422, 'Saldo de XP inválido.')
  const input = payload as Record<string, unknown>
  const discipline = type === 'DISCIPLINE_PURCHASE' ? disciplineDefinition(String(input.disciplineId)) : null
  const specialty = type === 'SPECIALTY_PURCHASE'
  const category = discipline ? 'DISCIPLINE' : specialty ? 'SPECIALTY' : 'XP'
  const transactionType = type === 'XP_GRANTED' ? 'XP_GRANTED' : spentDelta > 0 && !totalDelta && (discipline || specialty) ? 'XP_SPENT' : spentDelta < 0 && !totalDelta ? 'XP_REFUNDED' : 'XP_ADJUSTED'
  return {
    type: transactionType, campaignId: character.campaignId, category,
    traitCode: discipline?.id ?? (specialty ? String(input.skillId) : null),
    traitName: discipline ? discipline.aliases[0] ?? discipline.name : specialty ? String(input.name).trim() : transactionType === 'XP_REFUNDED' ? 'Estorno de XP' : transactionType === 'XP_GRANTED' ? 'Concessão de XP' : 'Ajuste de XP',
    previousValue: discipline ? Number(input.targetLevel) - 1 : null,
    newValue: discipline ? Number(input.targetLevel) : null,
    xpAmount: Math.abs(spentDelta || totalDelta), totalDelta, spentDelta,
    totalXp: character.totalXp, spentXp: character.spentXp, source: type === 'STANDALONE_XP_IMPORTED' ? 'Importação histórica' : discipline || specialty ? 'XP' : null,
  }
}
