import { evaluateV5Roll } from './dice-evaluator'
import type { DiceProvider } from './dice-provider'

export function drawD10(provider: DiceProvider, count: number): number[] {
  if (!Number.isSafeInteger(count) || count < 0 || count > 50) throw new Error('Quantidade de dados inválida.')
  const dice = provider.rollD10(count)
  if (!Array.isArray(dice) || dice.length !== count || dice.some(die => !Number.isSafeInteger(die) || die < 1 || die > 10)) throw new Error('O provedor de dados retornou resultados inválidos.')
  return dice
}

export function rollV5Pool(provider: DiceProvider, pool: number, hunger: number, difficulty: number) {
  if (!Number.isSafeInteger(pool) || pool < 0 || pool > 50 || !Number.isSafeInteger(hunger) || hunger < 0 || hunger > pool) throw new Error('Parada de dados inválida.')
  const dice = drawD10(provider, pool)
  const normalDice = dice.slice(0, pool - hunger)
  const hungerDice = dice.slice(pool - hunger)
  return evaluateV5Roll(normalDice, hungerDice, difficulty)
}
