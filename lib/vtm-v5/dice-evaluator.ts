export function evaluateV5Roll(normalDice: readonly number[], hungerDice: readonly number[], difficulty: number) {
  const dice = [...normalDice, ...hungerDice]
  if (!Number.isSafeInteger(difficulty) || difficulty < 1 || difficulty > 50 || dice.length > 50 || dice.some(die => !Number.isInteger(die) || die < 1 || die > 10)) throw new Error('Rolagem inválida.')
  const tens = dice.filter(die => die === 10).length
  const critical = tens >= 2
  const successes = dice.filter(die => die >= 6).length + Math.floor(tens / 2) * 2
  const success = successes >= difficulty
  let outcomeValue
  if (success) {
    if (critical) {
      if (hungerDice.includes(10)) {
        outcomeValue = 'MESSY_CRITICAL'
      } else {
        outcomeValue = 'CRITICAL'
      }
    } else {
      outcomeValue = 'SUCCESS'
    }
  } else if (hungerDice.includes(1)) {
    outcomeValue = 'BESTIAL_FAILURE'
  } else {
    outcomeValue = 'FAILURE'
  }
  const outcome = outcomeValue
  return { normalDice: [...normalDice], hungerDice: [...hungerDice], difficulty, successes, success, outcome }
}
