export function countV5Dice(normalDice: readonly number[], hungerDice: readonly number[]) {
  const dice = [...normalDice, ...hungerDice]
  if (dice.length > 50 || dice.some(die => !Number.isSafeInteger(die) || die < 1 || die > 10)) { throw new Error('Dados inválidos.') }
  const pairs = Math.floor(dice.filter(die => die === 10).length / 2)
  return { normalDice: [...normalDice], hungerDice: [...hungerDice], pairs, successes: dice.filter(die => die >= 6).length + pairs * 2 }
}

function assertDifficulty(difficulty: number) {
  if (!Number.isSafeInteger(difficulty) || difficulty < 1 || difficulty > 50) { throw new Error('Dificuldade inválida.') }
}

function rollOutcome(success: boolean, messyCritical: boolean, critical: boolean, bestialFailure: boolean) {
  if (messyCritical) { return 'MESSY_CRITICAL' }
  if (critical) { return 'CRITICAL' }
  if (success) { return 'SUCCESS' }
  if (bestialFailure) { return 'BESTIAL_FAILURE' }
  return 'FAILURE'
}

export function resolveV5Count(count: ReturnType<typeof countV5Dice>, difficulty: number) {
  assertDifficulty(difficulty)
  const success = count.successes >= difficulty
  const critical = success && count.pairs > 0
  const messyCritical = critical && count.hungerDice.includes(10)
  const bestialFailure = !success && count.hungerDice.includes(1)
  const totalFailure = count.successes === 0
  const outcome = rollOutcome(success, messyCritical, critical, bestialFailure)
  return { ...count, difficulty, margin: count.successes - difficulty, success, critical, messyCritical, bestialFailure, totalFailure, outcome }
}

export function evaluateV5Roll(normalDice: readonly number[], hungerDice: readonly number[], difficulty: number) {
  return resolveV5Count(countV5Dice(normalDice, hungerDice), difficulty)
}

export function evaluateCheck(die: number) {
  countV5Dice([die], [])
  return { die, success: die >= 6, successes: die >= 6 ? 1 : 0, critical: false as const }
}

export function resolveTakingHalf(pool: number, difficulty: number) {
  assertPool(pool)
  assertDifficulty(difficulty)
  const successes = Math.floor(pool / 2)
  return { successes, margin: successes - difficulty, success: successes >= difficulty, critical: false as const }
}

export function resolveAutomaticWin(pool: number, difficulty: number) {
  assertPool(pool)
  assertDifficulty(difficulty)
  if (pool < difficulty * 2) { throw new Error('A parada precisa ser pelo menos o dobro da dificuldade.') }
  return { successes: difficulty, margin: 0, success: true as const, critical: false as const }
}

function assertPool(pool: number) {
  if (!Number.isSafeInteger(pool) || pool < 0 || pool > 50) { throw new Error('Parada inválida.') }
}

// Empate de disputa básica; conflitos físicos têm resolvedor próprio.
export function resolveBasicContest(actorSuccesses: number, opponentSuccesses: number) {
  if ([actorSuccesses, opponentSuccesses].some(value => !Number.isSafeInteger(value) || value < 0 || value > 100)) { throw new Error('Sucessos inválidos.') }
  return { success: actorSuccesses >= opponentSuccesses, margin: actorSuccesses - opponentSuccesses, tie: actorSuccesses === opponentSuccesses }
}
