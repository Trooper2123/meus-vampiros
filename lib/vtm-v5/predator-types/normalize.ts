import { PREDATOR_TYPES } from './catalog'
import { characterText } from '../text'
import type { PredatorTypeCode } from './types'

const normalizeKey = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '').toUpperCase()
const aliases = new Map<string, PredatorTypeCode>()
for (const definition of PREDATOR_TYPES) {
  aliases.set(normalizeKey(definition.code), definition.code)
  aliases.set(normalizeKey(definition.name), definition.code)
  if (definition.originalName) aliases.set(normalizeKey(definition.originalName), definition.code)
  for (const alias of definition.aliases ?? []) aliases.set(normalizeKey(alias), definition.code)
}
aliases.set('SEREIA', 'SIREN')
aliases.set('GATO_DE_BECO', 'ALLEYCAT')
aliases.set('RAINHA_DA_CENA', 'SCENE_QUEEN')
aliases.set('SANGUESSUGA', 'BLOOD_LEECH')

export function normalizePredatorType(value: unknown): PredatorTypeCode | null {
  if (typeof value !== 'string' || !value.trim()) return null
  return aliases.get(normalizeKey(value)) ?? null
}

export function normalizePredatorTypeWithWarning(value: unknown) {
  const code = normalizePredatorType(value)
  return { code, warning: value && !code ? { code: 'PREDATOR_TYPE_LEGACY_UNKNOWN', message: `Tipo de predação legado não reconhecido: ${characterText(value) || 'valor inválido'}`, blocking: false as const } : null }
}
