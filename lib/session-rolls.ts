import { CharacterCommandError } from '@/lib/character-commands'
import { serverDiceProvider, type DiceProvider } from '@/lib/vtm-v5/dice-provider'
import { rollV5Pool } from '@/lib/vtm-v5/dice-roll-service'
import { assertGameSessionManager } from '@/lib/game-sessions'

export type SessionRollInput={pool:number;hunger:number;difficulty:number;visibility:'PUBLIC'|'SECRET';reason:string;idempotencyKey:string}

export async function executeSessionRoll(actorId:string,sessionId:string,campaignId:string,input:SessionRollInput,provider:DiceProvider=serverDiceProvider){
  await assertGameSessionManager(actorId,sessionId,campaignId)
  if(!Number.isSafeInteger(input.pool)||input.pool<1||input.pool>50||!Number.isSafeInteger(input.hunger)||input.hunger<0||input.hunger>5||input.hunger>input.pool||!Number.isSafeInteger(input.difficulty)||input.difficulty<1||input.difficulty>50||!['PUBLIC','SECRET'].includes(input.visibility)||!input.reason.trim()||input.reason.length>500) throw new CharacterCommandError(400,'Contexto de rolagem avulsa inválido.')
  const result=rollV5Pool(provider,input.pool,Math.min(input.pool,input.hunger),input.difficulty)
  return {ok:true,pool:input.pool,hunger:input.hunger,visibility:input.visibility,reason:input.reason.trim(),result}
}
