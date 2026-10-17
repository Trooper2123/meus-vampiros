import { randomUUID } from 'node:crypto'
import { CharacterCommandError, type CommandCharacter } from './character-commands'
import { CLANS, normalizeDiscipline } from './vtm-v5/clans'
import { disciplineDefinition, type DisciplineId } from './vtm-v5/disciplines'
import { evaluateDisciplineAccess, type DisciplineAccessCharacter, type DisciplineAccessGrant, type DisciplineAcquisition } from './vtm-v5/discipline-access'
import type { CreationEffect } from './creation-effects'

export function disciplineContext(character: Pick<CommandCharacter, 'data' | 'gameState' | 'campaignId' | 'masterId'>): DisciplineAccessCharacter {
  const selection = character.data.clanSelection as { caitiffDisciplines?: string[] } | undefined
  const predator = character.data.predatorTypeSelection as { code?: string; discipline?: string } | undefined
  const clan = CLANS.find(entry => entry.code === character.data.clanCode || entry.name.toLocaleLowerCase('pt-BR') === String(character.data.cla ?? '').toLocaleLowerCase('pt-BR'))
  return { clanCode: clan?.code ?? (character.data.isCaitiff ? 'CAITIFF' : character.data.isThinBlood || character.data.creationType === 'THIN_BLOOD' ? 'THIN_BLOOD' : undefined),
    isThinBlood: character.data.creationType === 'THIN_BLOOD', caitiffDisciplines: selection?.caitiffDisciplines,
    predatorCode: predator?.code, predatorDiscipline: predator?.discipline, campaignId: character.campaignId, masterId: character.masterId,
    grants: Array.isArray(character.gameState.disciplineAccessGrants) ? character.gameState.disciplineAccessGrants as DisciplineAccessGrant[] : [] }
}
export function disciplineRows(data: Record<string, unknown>): Record<string, unknown>[] {
  if (data.disciplinas !== undefined && !Array.isArray(data.disciplinas)) throw new CharacterCommandError(422, 'Formato de Disciplinas inválido.')
  return (data.disciplinas ?? []) as Record<string, unknown>[]
}
export function xpAcquisitions(character: Pick<CommandCharacter, 'gameState'>): DisciplineAcquisition[] {
  return Array.isArray(character.gameState.disciplineAcquisitions) ? character.gameState.disciplineAcquisitions as DisciplineAcquisition[] : []
}
export function validateDisciplineAllocation(character: Pick<CommandCharacter, 'data' | 'gameState' | 'campaignId' | 'masterId' | 'characterType'>, complete = false) {
  if (character.characterType !== 'PLAYER_VAMPIRE') return
  const context = disciplineContext(character)
  const effects = (Array.isArray(character.gameState.creationEffects) ? character.gameState.creationEffects : []) as CreationEffect[]
  const clanEffects = effects.filter(effect => effect.origin === 'CLAN' && effect.kind === 'DISCIPLINE')
  const rows = disciplineRows(character.data)
  const ids = new Set<string>()
  const rowIds = new Set<string>()
  const initial: number[] = []
  const manualAcquisitions: DisciplineAcquisition[] = []
  for (const row of rows) {
    if (!row || typeof row !== 'object' || Array.isArray(row) || !Number.isSafeInteger(row.level) || Number(row.level) < 0 || Number(row.level) > 5) throw new CharacterCommandError(422, 'Nível de Disciplina inválido.')
    if (!row.name && row.level === 0) continue
    const definition = disciplineDefinition(row.disciplineId ?? row.name)
    if (!definition || row.name && disciplineDefinition(row.name)?.id !== definition.id || ids.has(definition.id)) throw new CharacterCommandError(422, 'Disciplina desconhecida, duplicada ou identificador incompatível.')
    const rowId = typeof row.id === 'string' && row.id ? row.id : `discipline:${definition.id}`
    if (rowIds.has(rowId)) throw new CharacterCommandError(422, 'Identificador de Disciplina duplicado.')
    rowIds.add(rowId)
    row.id = rowId
    ids.add(definition.id)
    row.disciplineId = definition.id
    row.name = normalizeDiscipline(definition.id)
    const predatorDots = effects.filter(effect => effect.origin === 'PREDATOR' && effect.kind === 'DISCIPLINE' && effect.id === row.id).reduce((sum, effect) => sum + effect.dots, 0)
    const xpDots = xpAcquisitions(character).filter(entry => entry.disciplineId === definition.id && entry.source === 'XP').length
    const clanDots = clanEffects.filter(effect => effect.id === row.id).reduce((sum, effect) => sum + effect.dots, 0)
    const initialDots = Number(row.level) - predatorDots - xpDots
    if (initialDots < 0 || (clanEffects.length > 0 && initialDots !== clanDots)) throw new CharacterCommandError(422, 'Altere pontos pelos seletores de origem ou pela evolução com XP.')
    if (initialDots > 0) {
      const access = evaluateDisciplineAccess({ character: context, disciplineId: definition.id, acquisitionSource: 'CLAN', targetLevel: initialDots })
      if (!access.eligible) throw new CharacterCommandError(422, access.blockers[0].message)
      initial.push(initialDots)
      if (!clanEffects.length) manualAcquisitions.push({ id: `CLAN:${definition.id}`, disciplineId: definition.id, source: 'CLAN', fromLevel: 0, targetLevel: initialDots, xpCost: 0 })
    }
  }
  for (const acquisition of xpAcquisitions(character).filter(entry => entry.source === 'XP')) {
    if (!rows.some(row => disciplineDefinition(row.disciplineId ?? row.name)?.id === acquisition.disciplineId && Number(row.level) >= xpAcquisitions(character).filter(entry => entry.source === 'XP' && entry.disciplineId === acquisition.disciplineId).length)) throw new CharacterCommandError(422, 'Pontos adquiridos com XP não podem ser removidos pela edição geral.')
  }
  if (initial.reduce((sum, dots) => sum + dots, 0) > 3 || initial.filter(dots => dots === 2).length > 1) throw new CharacterCommandError(422, 'Distribua os pontos iniciais em 2+1, somente nas Disciplinas disponíveis.')
  if (!clanEffects.length) character.gameState.disciplineAcquisitions = [...xpAcquisitions(character).filter(entry => entry.source !== 'CLAN'), ...manualAcquisitions]
  if (complete && context.clanCode !== 'THIN_BLOOD' && initial.sort().join(',') !== '1,2') throw new CharacterCommandError(422, 'A distribuição inicial exige 2 pontos em uma Disciplina e 1 em outra.')
}
export function recordDisciplinePurchase(character: CommandCharacter, disciplineId: DisciplineId, targetLevel: number, xpCost: number, actorId: string) {
  const rows = disciplineRows(character.data)
  let row = rows.find(entry => disciplineDefinition(entry.disciplineId ?? entry.name)?.id === disciplineId)
  if (!row) { row = { id: `discipline:${disciplineId}`, disciplineId, name: normalizeDiscipline(disciplineId), level: 0, powers: [] }; rows.push(row) }
  row.level = targetLevel
  row.disciplineId = disciplineId
  character.data.disciplinas = rows
  character.spentXp += xpCost
  character.gameState.disciplineAcquisitions = [...xpAcquisitions(character), { id: randomUUID(), disciplineId, source: 'XP', fromLevel: targetLevel - 1, targetLevel, xpCost, createdByUserId: actorId, createdAt: new Date().toISOString() } satisfies DisciplineAcquisition]
}

