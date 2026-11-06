import { createHash } from 'node:crypto'
import { sql } from 'drizzle-orm'
import { db } from './db'
import { CharacterCommandError } from './character-commands'
import { assertGameSessionManager, getGameSession } from './game-sessions'

export const SOUNDTRACK_MOODS=['DREAD','NOIR','RITUAL'] as const
export type SoundtrackMood=typeof SOUNDTRACK_MOODS[number]
export type SoundtrackSource='AMBIENT'|'YOUTUBE'
export type SoundtrackCommand={
 mood:SoundtrackMood;playing:boolean;expectedRevision:number;idempotencyKey:string;
 source?:SoundtrackSource;youtubeVideoId?:string|null;youtubePlaylistId?:string|null;positionSeconds?:number
}
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const videoId=/^[A-Za-z0-9_-]{11}$/
const playlistId=/^[A-Za-z0-9_-]{12,80}$/
type Row={mood:SoundtrackMood;source:SoundtrackSource;youtube_video_id:string|null;youtube_playlist_id:string|null;position_seconds:number;playing:boolean;started_at:Date|null;revision:number}
function position(row:Row,now=Date.now()):number{
 const base=Number(row.position_seconds)||0
 return Math.max(0,base+(row.playing&&row.started_at?Math.max(0,(now-new Date(row.started_at).getTime())/1000):0))
}
function present(row:Row,canManage:boolean,active:boolean,now=Date.now()){
 return {mood:row.mood,source:row.source,youtubeVideoId:row.youtube_video_id,youtubePlaylistId:row.youtube_playlist_id,positionSeconds:position(row,now),playing:active&&row.playing,startedAt:row.started_at?new Date(row.started_at).toISOString():null,revision:row.revision,canManage,active,serverNow:new Date(now).toISOString()}
}
const empty:Row={mood:'DREAD',source:'AMBIENT',youtube_video_id:null,youtube_playlist_id:null,position_seconds:0,playing:false,started_at:null,revision:0}
export async function getSessionSoundtrack(actorId:string,sessionId:string){
 if(!uuid.test(sessionId))throw new CharacterCommandError(400,'Sessão inválida.')
 const access=await getGameSession(actorId,sessionId)
 const rows=await db.execute<Row>(sql`SELECT mood,source,youtube_video_id,youtube_playlist_id,position_seconds,playing,started_at,revision FROM session_soundtrack_state WHERE session_id=${sessionId}::uuid`)
 return present(rows.rows[0]??empty,access.canManage,access.session.status==='ACTIVE')
}
export async function updateSessionSoundtrack(actorId:string,sessionId:string,input:SoundtrackCommand){
 if(!uuid.test(sessionId)||!input||!SOUNDTRACK_MOODS.includes(input.mood)||typeof input.playing!=='boolean'||!Number.isSafeInteger(input.expectedRevision)||input.expectedRevision<0||!uuid.test(input.idempotencyKey))throw new CharacterCommandError(400,'Comando de trilha inválido.')
 const source=input.source??'AMBIENT'
 if(!['AMBIENT','YOUTUBE'].includes(source))throw new CharacterCommandError(400,'Fonte inválida.')
 if(input.youtubePlaylistId!=null&&!playlistId.test(input.youtubePlaylistId))throw new CharacterCommandError(400,'Playlist do YouTube inválida.')
 if(input.youtubeVideoId!=null&&!videoId.test(input.youtubeVideoId))throw new CharacterCommandError(400,'Vídeo do YouTube inválido.')
 if(input.positionSeconds!==undefined&&(!Number.isFinite(input.positionSeconds)||input.positionSeconds<0||input.positionSeconds>86400))throw new CharacterCommandError(400,'Posição inválida.')
 if(source==='YOUTUBE'&&!input.youtubeVideoId&&!input.youtubePlaylistId)throw new CharacterCommandError(400,'Selecione uma playlist ou vídeo do YouTube.')
 if(input.youtubeVideoId&&input.youtubePlaylistId)throw new CharacterCommandError(400,'Selecione apenas uma mídia por vez.')
 if(source==='AMBIENT'&&(input.youtubeVideoId||input.youtubePlaylistId))throw new CharacterCommandError(400,'Vídeo não permitido na fonte ambiente.')
 const access=await getGameSession(actorId,sessionId)
 await assertGameSessionManager(actorId,sessionId,access.session.campaignId)
 const hash=createHash('sha256').update(JSON.stringify({mood:input.mood,playing:input.playing,source,youtubeVideoId:input.youtubeVideoId??null,youtubePlaylistId:input.youtubePlaylistId??null,positionSeconds:input.positionSeconds??null})).digest('hex')
 return db.transaction(async tx=>{
  const session=await tx.execute<{status:string}>(sql`SELECT status FROM game_sessions WHERE id=${sessionId}::uuid FOR SHARE`)
  if(session.rows[0]?.status!=='ACTIVE')throw new CharacterCommandError(409,'A sessão precisa estar ativa.')
  const previous=await tx.execute<{actor_user_id:string;request_hash:string;result:Record<string,unknown>}>(sql`SELECT actor_user_id,request_hash,result FROM session_soundtrack_commands WHERE session_id=${sessionId}::uuid AND command_key=${input.idempotencyKey}::uuid`)
  if(previous.rows[0]){
   if(previous.rows[0].actor_user_id!==actorId||previous.rows[0].request_hash!==hash)throw new CharacterCommandError(409,'Chave de operação já utilizada.')
   return previous.rows[0].result
  }
  await tx.execute(sql`INSERT INTO session_soundtrack_state (session_id) VALUES (${sessionId}::uuid) ON CONFLICT DO NOTHING`)
  const current=await tx.execute<Row>(sql`SELECT mood,source,youtube_video_id,position_seconds,playing,started_at,revision FROM session_soundtrack_state WHERE session_id=${sessionId}::uuid FOR UPDATE`)
  const row=current.rows[0]
  if(row.revision!==input.expectedRevision)throw new CharacterCommandError(409,'A trilha mudou. Recarregue os controles.')
  const mediaChanged=row.source!==source||row.youtube_video_id!==(source==='YOUTUBE'?(input.youtubeVideoId??null):null)||row.youtube_playlist_id!==(source==='YOUTUBE'?(input.youtubePlaylistId??null):null)||row.mood!==input.mood
  const nextPosition=input.positionSeconds??(mediaChanged?0:position(row))
  const startedAt=input.playing?new Date():null
  const next:Row={mood:input.mood,source,youtube_video_id:source==='YOUTUBE'?(input.youtubeVideoId??null):null,youtube_playlist_id:source==='YOUTUBE'?(input.youtubePlaylistId??null):null,position_seconds:nextPosition,playing:input.playing,started_at:startedAt,revision:row.revision+1}
  await tx.execute(sql`UPDATE session_soundtrack_state SET mood=${next.mood},source=${next.source},youtube_video_id=${next.youtube_video_id},youtube_playlist_id=${next.youtube_playlist_id},position_seconds=${next.position_seconds},playing=${next.playing},started_at=${startedAt},revision=revision+1,updated_by_user_id=${actorId},updated_at=NOW() WHERE session_id=${sessionId}::uuid`)
  const result=present(next,true,true)
  await tx.execute(sql`INSERT INTO session_soundtrack_commands (session_id,command_key,actor_user_id,request_hash,result) VALUES (${sessionId}::uuid,${input.idempotencyKey}::uuid,${actorId},${hash},${JSON.stringify(result)}::jsonb)`)
  return result
 })
}
