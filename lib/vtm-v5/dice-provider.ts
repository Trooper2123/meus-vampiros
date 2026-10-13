import { randomBytes } from 'node:crypto'
import { DiceRoll, NumberGenerator } from '@dice-roller/rpg-dice-roller'

export type DiceProvider = { rollD10(count: number): number[] }

NumberGenerator.generator.engine = { next: () => randomBytes(4).readInt32LE(0) }

export const serverDiceProvider: DiceProvider = {
  rollD10(count) {
    if (!Number.isSafeInteger(count) || count < 0 || count > 50) throw new Error('Quantidade de dados inválida.')
    return Array.from({ length: count }, () => new DiceRoll('1d10').total)
  },
}
