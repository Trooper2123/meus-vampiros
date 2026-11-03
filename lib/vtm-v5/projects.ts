import { drawD10, rollV5Pool } from './dice-roll-service'
import type { DiceProvider } from './dice-provider'
import { evaluateV5Roll } from './dice-evaluator'

export type LaunchOutcome = 'CRITICAL'|'WIN'|'FAILURE'|'TOTAL_FAILURE'
export function projectScope(currentDots:number,finalDots:number) {
  if(!Number.isSafeInteger(currentDots)||!Number.isSafeInteger(finalDots)||currentDots<0||finalDots>5||finalDots<=currentDots)throw new Error('Scope inválido.')
  return finalDots-currentDots
}
export function launchDifficulty(scope:number,failedAttempts=0) {
  if(!Number.isSafeInteger(scope)||scope<1||scope>5||!Number.isSafeInteger(failedAttempts)||failedAttempts<0||failedAttempts>50)throw new Error('Scope ou tentativas inválidos.')
  return scope+2+failedAttempts
}
export function resolveProjectLaunch(dice:DiceProvider,pool:number,hunger:number,scope:number,failedAttempts=0) {
  const difficulty=launchDifficulty(scope,failedAttempts)
  const result=rollV5Pool(dice,pool,hunger,difficulty)
  const outcome:LaunchOutcome=result.success ? result.critical?'CRITICAL':'WIN' : result.totalFailure?'TOTAL_FAILURE':'FAILURE'
  const stakeRequired=outcome==='CRITICAL'?0:outcome==='WIN'?Math.max(1,scope+1-result.margin):0
  return {...result,outcome,stakeRequired,launchDifficulty:difficulty}
}
export function advanceProjectDie(value:number) {
  if(!Number.isSafeInteger(value)||value<1||value>10)throw new Error('Project Die inválido.')
  const next=value-1
  return {previous:value,next:next<1?null:next,completed:next<1}
}
export function resolveProjectGoal(dice:DiceProvider,playerPool:number,oppositionPool:number,hunger=0) {
  if(!Number.isSafeInteger(playerPool)||playerPool<1||playerPool>50||!Number.isSafeInteger(oppositionPool)||oppositionPool<1||oppositionPool>10||!Number.isSafeInteger(hunger)||hunger<0||hunger>Math.min(5,playerPool))throw new Error('Pool do Goal Roll inválido.')
  const playerDice=drawD10(dice,playerPool)
  const oppositionDice=drawD10(dice,oppositionPool)
  // No Goal Roll, os 10 do atacante contam apenas um sucesso.
  const playerSuccesses=playerDice.filter(die=>die>=6).length
  // Os 10 da oposição contam críticos normalmente.
  const opposition=evaluateV5Roll(oppositionDice,[],1)
  const margin=playerSuccesses-opposition.successes
  const won=margin>0
  return {
    playerDice,oppositionDice,playerSuccesses,oppositionSuccesses:opposition.successes,
    opponentCriticalPairs:opposition.pairs,margin,won,
    projectDieDamage:won?margin:0,
    stakeDamage:won?0:Math.max(1,-margin),
    hungerDice:playerDice.slice(playerPool-hunger),
    normalDice:playerDice.slice(0,playerPool-hunger),
  }
}
