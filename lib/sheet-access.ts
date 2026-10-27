import { sql } from 'drizzle-orm'
import { db } from './db'
import { npcFail } from './npc-domain'
import { npcId } from './npc-store'
import { SHEET_VISIBILITIES } from './npc-options'

export type SheetVisibility = keyof typeof SHEET_VISIBILITIES
export type SubjectType = 'CHARACTER' | 'NPC'
export type SheetContext = { id:string; campaign_id:string; subject_type:SubjectType|'ORGANIZATION'|'PLACE'; subject_id:string; name:string; created_by:string; visibility:SheetVisibility }
export type SheetAccess = { actorId:string; campaignId:string; ownerId:string; label:string; isOwner:boolean; isNarrator:boolean; isMember:boolean; canWrite:boolean; allowPlayerEdits:boolean }
export async function narrativeCampaignAccess(actorId:string,campaignId:string) {
  npcId(campaignId)
  const rows=await db.execute<{ master_user_id:string; allow_player_narrative_edits:boolean; member:boolean }>(sql`SELECT c.master_user_id,c.allow_player_narrative_edits,(c.master_user_id=${actorId} OR EXISTS(SELECT 1 FROM characters ch WHERE ch.campaign_id=c.id AND ch.user_id=${actorId})) AS member FROM campaigns c WHERE c.id=${campaignId}::uuid`)
  const row=rows.rows[0]
  if(!row?.member) { return npcFail(403,'Você não participa desta mesa.') }
  return {isNarrator:row.master_user_id===actorId,allowPlayerEdits:row.allow_player_narrative_edits}
}
export async function subjectAccess(actorId:string,campaignId:string,type:unknown,id:unknown):Promise<SheetAccess> {
  const subjectId=npcId(id),campaign=await narrativeCampaignAccess(actorId,campaignId)
  let ownerId:string,label:string
  if(type==='CHARACTER') {
    const rows=await db.execute<{ user_id:string; name:string; campaign_id:string|null;character_type:string;visibility:string }>(sql`SELECT user_id,name,campaign_id,character_type,visibility FROM characters WHERE id=${subjectId}::uuid AND status<>'DELETED'`)
    const row=rows.rows[0]
    if(row?.campaign_id!==campaignId) { return npcFail(404,'A ficha não pertence a esta mesa.') }
    if(row.character_type!=='PLAYER_VAMPIRE'&&row.visibility!=='PLAYER_VISIBLE'&&row.user_id!==actorId&&!campaign.isNarrator){ return npcFail(404,'Ficha não disponível.') }
    ownerId=row.user_id;label=row.name
  } else if(type==='NPC') {
    const rows=await db.execute<{ owner_id:string; name:string; revealed_fields:string[] }>(sql`SELECT n.owner_id,n.name,cn.revealed_fields FROM npc_definitions n JOIN campaign_npcs cn ON cn.npc_id=n.id WHERE n.id=${subjectId}::uuid AND cn.campaign_id=${campaignId}::uuid`)
    const row=rows.rows[0]
    if(!row || !campaign.isNarrator && row.owner_id!==actorId && !row.revealed_fields.some(field=>['name','identity'].includes(field))) { return npcFail(404,'NPC indisponível nesta mesa.') }
    ownerId=row.owner_id;label=row.name
  } else return npcFail(400,'Tipo de ficha inválido.')
  return {actorId,campaignId,ownerId,label,isOwner:ownerId===actorId,isNarrator:campaign.isNarrator,isMember:true,canWrite:campaign.isNarrator || ownerId===actorId&&campaign.allowPlayerEdits,allowPlayerEdits:campaign.allowPlayerEdits}
}
export function sheetVisibility(value:unknown):SheetVisibility {
  if(typeof value!=='string'||!Object.hasOwn(SHEET_VISIBILITIES,value)){ return npcFail(422,'Visibilidade inválida.') }
  return value as SheetVisibility
}
export function canReadSheetItem(access:SheetAccess,authorId:string,visibility:SheetVisibility) {
  if(access.isNarrator){ return true }
  if(visibility==='GM_ONLY'){ return false }
  if(visibility==='CAMPAIGN_VISIBLE'){ return access.isMember }
  if(visibility==='SHARED_WITH_OWNER'){ return access.isOwner }
  return access.isOwner || authorId===access.actorId
}
export function canEditSheetItem(access:SheetAccess,authorId:string) {return access.isNarrator||access.canWrite&&access.actorId===authorId}
export async function contextAccess(actorId:string,id:string):Promise<{context:SheetContext;access:SheetAccess}> {
  npcId(id)
  const rows=await db.execute<SheetContext>(sql`SELECT * FROM sheet_contexts WHERE id=${id}::uuid`)
  const context=rows.rows[0]
  if(!context){ return npcFail(404,'Contexto não encontrado.') }
  if(context.subject_type==='CHARACTER'||context.subject_type==='NPC'){ return {context,access:await subjectAccess(actorId,context.campaign_id,context.subject_type,context.subject_id)} }
  const campaign=await narrativeCampaignAccess(actorId,context.campaign_id)
  const access={actorId,campaignId:context.campaign_id,ownerId:context.created_by,label:context.name,isOwner:context.created_by===actorId,isNarrator:campaign.isNarrator,isMember:true,canWrite:campaign.isNarrator||context.created_by===actorId&&campaign.allowPlayerEdits,allowPlayerEdits:campaign.allowPlayerEdits}
  if(!canReadSheetItem(access,context.created_by,context.visibility)){ return npcFail(404,'Entidade não encontrada.') }
  return {context,access}
}
export async function ensureSheetContext(actorId:string,campaignId:string,type:SubjectType,id:string) {
  const access=await subjectAccess(actorId,campaignId,type,id)
  if(!access.canWrite){ return npcFail(403,'A edição narrativa desta ficha não está autorizada.') }
  const rows=await db.execute<SheetContext>(sql`INSERT INTO sheet_contexts(campaign_id,subject_type,subject_id,created_by) VALUES(${campaignId}::uuid,${type},${id}::uuid,${actorId}) ON CONFLICT(campaign_id,subject_type,subject_id) DO UPDATE SET subject_id=EXCLUDED.subject_id RETURNING *`)
  return {context:rows.rows[0],access}
}
export async function globalSubjectAccess(actorId:string,type:unknown,id:unknown,write=false) {
  const subjectId=npcId(id)
  if(type==='CHARACTER') { const result=await globalCharacterAccess(actorId,subjectId,write); if(result){ return result } } else if(type==='NPC') {
    const rows=await db.execute<{owner_id:string}>(sql`SELECT owner_id FROM npc_definitions WHERE id=${subjectId}::uuid`)
    const row=rows.rows[0]
    if(!row){ return npcFail(404,'NPC não encontrado.') }
    const campaigns=await db.execute<{campaign_id:string}>(sql`SELECT cn.campaign_id FROM campaign_npcs cn JOIN campaigns c ON c.id=cn.campaign_id WHERE cn.npc_id=${subjectId}::uuid AND (c.master_user_id=${actorId} OR EXISTS(SELECT 1 FROM characters ch WHERE ch.campaign_id=c.id AND ch.user_id=${actorId}) AND cn.revealed_fields ? 'portrait')`)
    if(row.owner_id===actorId || !write&&campaigns.rows.length){ return {ownerId:row.owner_id,isOwner:row.owner_id===actorId,isNarrator:row.owner_id===actorId,campaignIds:campaigns.rows.map(c=>c.campaign_id)} }
  }
  return npcFail(403,'Acesso à ficha não autorizado.')
}

async function globalCharacterAccess(actorId:string,subjectId:string,write:boolean){
    const rows=await db.execute<{user_id:string;campaign_id:string|null;character_type:string;visibility:string}>(sql`SELECT user_id,campaign_id,character_type,visibility FROM characters WHERE id=${subjectId}::uuid AND status<>'DELETED'`)
    const row=rows.rows[0]
    if(!row){ return npcFail(404,'Ficha não encontrada.') }
    if(row.user_id===actorId){ return {ownerId:row.user_id,isOwner:true,isNarrator:false,campaignIds:row.campaign_id?[row.campaign_id]:[]} }
    if(row.campaign_id){const access=await narrativeCampaignAccess(actorId,row.campaign_id);if((!write&&(row.character_type==='PLAYER_VAMPIRE'||row.visibility==='PLAYER_VISIBLE')||access.isNarrator)){ return {ownerId:row.user_id,isOwner:false,isNarrator:access.isNarrator,campaignIds:[row.campaign_id]} }}
  
}
