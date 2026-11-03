import { createHash } from 'node:crypto'
import { sql } from 'drizzle-orm'
import { db } from './db'
import { CharacterCommandError } from './character-commands'
import { assertGameSessionManager, getGameSession } from './game-sessions'

export const SOUNDTRACK_MOODS=['DREAD','NOIR','RITUAL'] as const
export type SoundtrackMood=typeof SOUNDTRACK_MOODS[number]
export type SoundtrackCommand={mood:SoundtrackMood;playing:boolean;expectedRevision:number;idempotencyKey:string}
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function getSessionSoundtrack(actorId:string,sessionId:string) {
 if(!uuid.test(sessionId))throw new CharacterCommandError(400,'Sessão inválida.')
 const access=await getGameSession(actorId,sessionId)
 const rows=await db.execute<{mood:SoundtrackMood;playing:boolean;started_at:Date|null;revision:number}>(sql`SELECT mood,playing,started_at,revision FROM session_soundtrack_state WHERE session_id=${sessionId}::uuid`)
 const state=rows.rows[0]
 return {mood:state?.mood??'DREAD',playing:access.session.status==='ACTIVE'&&(state?.playing??false),startedAt:state?.started_at?new Date(state.started_at).toISOString():null,revision:state?.revision??0,canManage:access.canManage,active:access.session.status==='ACTIVE'}
}
export async function updateSessionSoundtrack(actorId:string,sessionId:string,input:SoundtrackCommand) {
 if(!uuid.test(sessionId)||!input||!SOUNDTRACK_MOODS.includes(input.mood)||typeof input.playing!=='boolean'||!Number.isSafeInteger(input.expectedRevision)||input.expectedRevision<0||!uuid.test(input.idempotencyKey)) throw new CharacterCommandError(400,'Comando de trilha inválido.')
 const access=await getGameSession(actorId,sessionId)
 await assertGameSessionManager(actorId,sessionId,access.session.campaignId)
 const hash=createHash('sha256').update(JSON.stringify({mood:input.mood,playing:input.playing})).digest('hex')
 return db.transaction(async tx=>{
   const session=await tx.execute<{status:string}>(sql`SELECT status FROM game_sessions WHERE id=${sessionId}::uuid FOR SHARE`)
   if(session.rows[0]?.status!=='ACTIVE')throw new CharacterCommandError(409,'A sessão precisa estar ativa.')
   const previous=await tx.execute<{actor_user_id:string;request_hash:string;result:Record<string,unknown>}>(sql`SELECT actor_user_id,request_hash,result FROM session_soundtrack_commands WHERE session_id=${sessionId}::uuid AND command_key=${input.idempotencyKey}::uuid`)
   if(previous.rows[0]){
     if(previous.rows[0].actor_user_id!==actorId||previous.rows[0].request_hash!==hash)throw new CharacterCommandError(409,'Chave de operação já utilizada.')
     return previous.rows[0].result
   }
   await tx.execute(sql`INSERT INTO session_soundtrack_state (session_id) VALUES (${sessionId}::uuid) ON CONFLICT DO NOTHING`)
   const current=await tx.execute<{mood:SoundtrackMood;playing:boolean;started_at:Date|null;revision:number}>(sql`SELECT mood,playing,started_at,revision FROM session_soundtrack_state WHERE session_id=${sessionId}::uuid FOR UPDATE`)
   const row=current.rows[0]
   if(row.revision!==input.expectedRevision)throw new CharacterCommandError(409,'A trilha mudou. Recarregue os controles.')
   const startedAt=input.playing&&(!row.playing||row.mood!==input.mood)?new Date():row.started_at
   await tx.execute(sql`UPDATE session_soundtrack_state SET mood=${input.mood},playing=${input.playing},started_at=${startedAt},revision=revision+1,updated_by_user_id=${actorId},updated_at=NOW() WHERE session_id=${sessionId}::uuid`)
   const result={mood:input.mood,playing:input.playing,startedAt:startedAt?.toISOString()??null,revision:row.revision+1,canManage:true,active:true}
   await tx.execute(sql`INSERT INTO session_soundtrack_commands (session_id,command_key,actor_user_id,request_hash,result) VALUES (${sessionId}::uuid,${input.idempotencyKey}::uuid,${actorId},${hash},${JSON.stringify(result)}::jsonb)`)
   return result
 })
}
