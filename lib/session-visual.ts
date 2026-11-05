import { sql } from 'drizzle-orm'
import { CharacterCommandError } from '@/lib/character-commands'
import { db } from '@/lib/db'
import { getGameSession } from '@/lib/game-sessions'

async function sessionAccess(actorId:string,sessionId:string){
  const access=await getGameSession(actorId,sessionId)
  if(access.session.status!=='ACTIVE'){throw new CharacterCommandError(409,'A Mesa Visual está disponível durante uma sessão ativa.')}
  const member=await db.execute(sql`SELECT 1 FROM campaigns c WHERE c.id=${access.session.campaignId}::uuid AND (c.master_user_id=${actorId} OR EXISTS(SELECT 1 FROM characters ch WHERE ch.campaign_id=c.id AND ch.user_id=${actorId} AND ch.character_type='PLAYER_VAMPIRE' AND ch.status='APPROVED'))`)
  if(!member.rows.length){throw new CharacterCommandError(403,'Apenas participantes aprovados podem acessar a Mesa Visual.')}
  return access
}
export async function getSessionVisual(actorId:string,sessionId:string){
  const access=await sessionAccess(actorId,sessionId)
  const rows=await db.execute<{id:string|null;title:string|null;file_name:string|null;content_type:string|null;revision:number}>(sql`SELECT h.id,h.title,h.file_name,h.content_type,v.revision FROM session_shared_visuals v LEFT JOIN campaign_handouts h ON h.id=v.handout_id AND h.deleted_at IS NULL AND h.upload_completed_at IS NOT NULL AND h.campaign_id=${access.session.campaignId}::uuid AND (${access.canManage} OR h.share_mode='ALL') WHERE v.session_id=${sessionId}::uuid`)
  const row=rows.rows[0]
  return {canManage:access.canManage,revision:row?.revision??0,handout:row?.id?{id:row.id,title:row.title!,fileName:row.file_name!,contentType:row.content_type,url:`/api/handouts/${row.id}/file?view=1`}:null}
}
export async function selectSessionVisual(actorId:string,sessionId:string,input:unknown){
  const access=await sessionAccess(actorId,sessionId)
  if(!access.canManage){throw new CharacterCommandError(403,'Somente o Narrador pode alterar a Mesa Visual.')}
  if(!input||typeof input!=='object'||Array.isArray(input)){throw new CharacterCommandError(400,'Seleção inválida.')}
  const value=input as Record<string,unknown>
  if(Object.keys(value).some(key=>!['handoutId','expectedRevision'].includes(key))||typeof value.expectedRevision!=='number'||!Number.isSafeInteger(value.expectedRevision)||value.expectedRevision<0||(value.handoutId!==null&&typeof value.handoutId!=='string')){throw new CharacterCommandError(400,'Seleção inválida.')}
  return await db.transaction(async tx=>{
    const active=await tx.execute(sql`SELECT id FROM game_sessions WHERE id=${sessionId}::uuid AND status='ACTIVE' FOR UPDATE`)
    if(!active.rows.length){throw new CharacterCommandError(409,'A sessão foi encerrada.')}
    const current=await tx.execute<{revision:number}>(sql`SELECT revision FROM session_shared_visuals WHERE session_id=${sessionId}::uuid FOR UPDATE`)
    const revision=current.rows[0]?.revision??0
    if(revision!==value.expectedRevision){throw new CharacterCommandError(409,'A Mesa Visual foi alterada. Atualize para continuar.')}
    if(value.handoutId!==null){const item=await tx.execute(sql`SELECT id FROM campaign_handouts WHERE id=${value.handoutId}::uuid AND campaign_id=${access.session.campaignId}::uuid AND share_mode='ALL' AND deleted_at IS NULL AND upload_completed_at IS NOT NULL`);if(!item.rows.length){throw new CharacterCommandError(422,'Escolha um handout compartilhado com toda a mesa.')}}
    await tx.execute(sql`INSERT INTO session_shared_visuals(session_id,handout_id,updated_by_actor_id,revision) VALUES(${sessionId}::uuid,${value.handoutId}::uuid,${actorId},${revision+1}) ON CONFLICT(session_id) DO UPDATE SET handout_id=EXCLUDED.handout_id,updated_by_actor_id=EXCLUDED.updated_by_actor_id,revision=EXCLUDED.revision,updated_at=now()`)
    return {ok:true,revision:revision+1}
  })
}
