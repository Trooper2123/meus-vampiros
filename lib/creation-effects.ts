import { CharacterCommandError, type CommandCharacter } from './character-commands'
import { normalizeDiscipline } from './vtm-v5/clans'

export type CreationEffect = { origin: 'CLAN' | 'PREDATOR'; kind: 'DISCIPLINE' | 'MERIT' | 'FLAW'; id: string; name: string; dots: number; baseDots: number }
type TraitGrant = { kind: 'MERIT' | 'FLAW'; name: string; dots: number }

export function creationEffects(character: CommandCharacter): CreationEffect[] {
  return Array.isArray(character.gameState.creationEffects) ? character.gameState.creationEffects as CreationEffect[] : []
}

export function removeCreationEffects(character: CommandCharacter, origin: CreationEffect['origin']) {
  const effects = creationEffects(character)
  const disciplines = (Array.isArray(character.data.disciplinas) ? character.data.disciplinas : []) as Record<string, unknown>[]
  for (const effect of effects.filter(entry => entry.origin === origin)) {
    if (effect.kind === 'DISCIPLINE') {
      const row = disciplines.find(entry => entry.id === effect.id)
      if (!row) throw new CharacterCommandError(409, 'Uma disciplina concedida foi alterada. Revise suas origens antes de trocar a escolha.')
      const others = effects.filter(entry => entry.origin !== origin && entry.kind === 'DISCIPLINE' && entry.id === effect.id).reduce((sum, entry) => sum + entry.dots, 0)
      row.level = Number(row.level) - Math.min(effect.dots, Math.max(0, Number(row.level) - others - effect.baseDots))
    } else {
      const field = effect.kind === 'MERIT' ? 'vantagens' : 'defeitos'
      const rows = (Array.isArray(character.data[field]) ? character.data[field] : []) as Record<string, unknown>[]
      const row = rows.find(entry => entry.id === effect.id)
      if (row && (row.name !== effect.name || row.level !== effect.dots)) throw new CharacterCommandError(409, 'Um traço concedido foi alterado. Revise sua origem antes de remover.')
      character.data[field] = rows.filter(entry => entry.id !== effect.id)
    }
  }
  character.data.disciplinas = disciplines.filter(entry => Number(entry.level) > 0 || (Array.isArray(entry.powers) && entry.powers.length > 0))
  character.gameState.creationEffects = effects.filter(entry => entry.origin !== origin)
  character.data.creationAdvantageDots = creationEffects(character).filter(entry => entry.kind === 'MERIT').reduce((sum, entry) => sum + entry.dots, 0)
  character.data.creationFlawDots = creationEffects(character).filter(entry => entry.kind === 'FLAW').reduce((sum, entry) => sum + entry.dots, 0)
}

export function applyCreationEffects(character: CommandCharacter, origin: CreationEffect['origin'], grants: Record<string, number>, traits: TraitGrant[], adopt = false) {
  removeCreationEffects(character, origin)
  const effects = [...creationEffects(character)]
  const disciplines = (Array.isArray(character.data.disciplinas) ? character.data.disciplinas : []) as Record<string, unknown>[]
  for (const [name, dots] of Object.entries(grants)) {
    let row = disciplines.find(entry => typeof entry.name === 'string' && normalizeDiscipline(entry.name) === name)
    if (!row) { row = { id: `discipline:${name}`, name, level: 0, powers: [] }; disciplines.push(row) }
    if (typeof row.id !== 'string') row.id = `discipline:${name}`
    row.name = name
    const otherDots = effects.filter(entry => entry.kind === 'DISCIPLINE' && entry.id === row!.id).reduce((sum, entry) => sum + entry.dots, 0)
    const baseDots = Math.max(0, Number(row.level) - otherDots - (adopt ? dots : 0))
    const level = Number(row.level) + (adopt ? 0 : dots)
    if (!Number.isSafeInteger(level) || level > 5 || level < dots + otherDots) throw new CharacterCommandError(422, 'Pontos de disciplina incompatíveis com a concessão.')
    row.level = level
    effects.push({ origin, kind: 'DISCIPLINE', id: row.id as string, name, dots, baseDots })
  }
  character.data.disciplinas = disciplines
  for (const trait of traits) {
    const field = trait.kind === 'MERIT' ? 'vantagens' : 'defeitos'
    const id = `grant:${origin}:${trait.kind}:${trait.name}`
    const rows = Array.isArray(character.data[field]) ? [...character.data[field]] : []
    rows.push({ id, name: trait.name, level: trait.dots, description: `Concessão de ${origin === 'CLAN' ? 'clã' : 'predação'}.` })
    character.data[field] = rows
    effects.push({ ...trait, origin, id, baseDots: 0 })
  }
  character.gameState.creationEffects = effects
  character.data.creationAdvantageDots = effects.filter(entry => entry.kind === 'MERIT').reduce((sum, entry) => sum + entry.dots, 0)
  character.data.creationFlawDots = effects.filter(entry => entry.kind === 'FLAW').reduce((sum, entry) => sum + entry.dots, 0)
}

export function validateCreationEffects(character: CommandCharacter) {
  for (const effect of creationEffects(character)) {
    const field = effect.kind === 'DISCIPLINE' ? 'disciplinas' : effect.kind === 'MERIT' ? 'vantagens' : 'defeitos'
    const rows = Array.isArray(character.data[field]) ? character.data[field] as Record<string, unknown>[] : []
    const row = rows.find(entry => entry.id === effect.id)
    const minimum = effect.kind === 'DISCIPLINE' ? creationEffects(character).filter(entry => entry.kind === 'DISCIPLINE' && entry.id === effect.id).reduce((sum, entry) => sum + entry.dots, 0) : effect.dots
    if (!row || row.name !== effect.name || !Number.isSafeInteger(row.level) || Number(row.level) < minimum) throw new CharacterCommandError(422, 'Concessões devem ser alteradas pelos seletores de clã/predação, não pela edição geral.')
  }
}
