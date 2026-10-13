export function evaluateV5Roll(normalDice: readonly number[], hungerDice: readonly number[], difficulty: number) {
  const dice = [...normalDice, ...hungerDice]
  if (!Number.isSafeInteger(difficulty) || difficulty < 1 || difficulty > 50 || dice.length > 50 || dice.some(die => !Number.isInteger(die) || die < 1 || die > 10)) throw new Error('Rolagem inválida.')
  const tens = dice.filter(die => die === 10).length
  const critical = tens >= 2
  const successes = dice.filter(die => die >= 6).length + Math.floor(tens / 2) * 2
  const success = successes >= difficulty
  const outcome = success ? critical ? hungerDice.includes(10) ? 'MESSY_CRITICAL' : 'CRITICAL' : 'SUCCESS' : hungerDice.includes(1) ? 'BESTIAL_FAILURE' : 'FAILURE'
  return { normalDice: [...normalDice], hungerDice: [...hungerDice], difficulty, successes, success, outcome }
}
