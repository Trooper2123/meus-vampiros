import { randomUUID } from 'node:crypto'
import { sql } from 'drizzle-orm'
import { db } from './db'
import { getGameSession } from './game-sessions'
import { npcFail, npcInteger, npcKeys, npcObject, npcText } from './npc-domain'
import { npcId } from './npc-store'
import { SHEET_SECTIONS, RELATION_TYPES } from './npc-options'
import { canEditSheetItem, canReadSheetItem, contextAccess, ensureSheetContext, narrativeCampaignAccess, sheetVisibility, subjectAccess, type SubjectType, type SheetVisibility, type SheetAccess, type SheetContext } from './sheet-access'
import { SPECIALTY_SKILL_NAMES } from './vtm-v5/skills'
import { disciplineDefinition } from './vtm-v5/disciplines'
import { DISCIPLINE_RESEARCH } from './vtm-v5/research-catalog'

export type SheetRecord = {id:string;context_id:string;section:keyof typeof SHEET_SECTIONS;title:string;body:string;fields:Record<string,unknown>;author_id:string;visibility:SheetVisibility;archived:boolean;revision:number;created_at:Date;updated_at:Date}
type SheetRelation = {id:string;source_id:string;target_id:string;relation_type:keyof typeof RELATION_TYPES;reciprocal:boolean;description:string;intensity:number|null;author_id:string;visibility:SheetVisibility;revision:number}
function projection(row:SheetRecord,access:SheetAccess) {return {id:row.id,section:row.section,title:row.title,body:row.body,fields:row.fields,visibility:row.visibility,archived:row.archived,revision:row.revision,createdAt:row.created_at,updatedAt:row.updated_at,canEdit:canEditSheetItem(access,row.author_id)}}
function validateRecord(input:unknown,access:SheetAccess) {
  const value=npcObject(input);npcKeys(value,['section','title','body','fields','visibility'])
  if(!Object.hasOwn(SHEET_SECTIONS,String(value.section))){ npcFail(422,'Seção inválida.') }
  const visibility=sheetVisibility(value.visibility)
  if(visibility==='GM_ONLY'&&!access.isNarrator){ npcFail(403,'Somente o Narrador pode criar registros exclusivos.') }
  const fields=npcObject(value.fields??{});npcKeys(fields,['quantity','location','condition','tags','referenceType','referenceId','organizationType','role','since','until','status','dueDate','assigneeId','customType'])
  const normalized:Record<string,string|number|string[]>={}
  for(const [key,field] of Object.entries(fields)) {
    if(key==='quantity'){normalized[key]=npcInteger(field,0,1000000);continue}
    if(key==='tags'){if(!Array.isArray(field)||field.length>20){ npcFail(422,'Tags inválidas.'); }normalized[key]=field.map(t=>npcText(t,60,true));continue}
    normalized[key]=npcText(field,500)
  }
  validateRecordReferences(normalized,value)
  return {section:String(value.section),title:npcText(value.title,120,true),body:npcText(value.body??'',20000),fields:normalized,visibility}
}
function validateRecordReferences(normalized: Record<string,string|number|string[]>,value: Record<string,unknown>) {
  validateRecordDates(normalized)
  if(value.section==='REMINDERS'&&!['OPEN','DONE','CANCELLED'].includes(npcText(normalized.status??'OPEN',20,true))) { npcFail(422,'Status do lembrete inválido.')} 
  if(value.section==='REMINDERS') { normalized.status??='OPEN'} 
  if(normalized.referenceId) { const ref=npcText(normalized.referenceId,500,true),type=normalized.referenceType; const valid=type==='SKILL'? Object.hasOwn(SPECIALTY_SKILL_NAMES,ref):type==='DISCIPLINE'? !!disciplineDefinition(ref):type==='POWER'? DISCIPLINE_RESEARCH.some(p => p.id===ref):false; if(!valid) { npcFail(422,'Referência de capacidade inválida.')}  }
}

function validateRecordDates(normalized: Record<string,string|number|string[]>) {
  for(const key of ['since','until','dueDate']) if(normalized[key]) { const text=npcText(normalized[key],10,true),date=new Date(text); if(!/^\d{4}-\d{2}-\d{2}$/.test(text)||!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==text) { npcFail(422,'Data inválida.')}  }
}

async function validateAssignee(campaignId:string,fields:Record<string,unknown>) {if(fields.assigneeId){ await narrativeCampaignAccess(npcText(fields.assigneeId,120,true),campaignId) }}
export async function sheetTargets(actorId:string,campaignId:string) {
  const campaign=await narrativeCampaignAccess(actorId,campaignId)
  const chars=await db.execute<{id:string;name:string}>(sql`SELECT id,name FROM characters WHERE campaign_id=${campaignId}::uuid AND character_type='PLAYER_VAMPIRE' ORDER BY name LIMIT 200`)
  const npcs=await db.execute<{id:string;name:string}>(sql`SELECT n.id,n.name FROM npc_definitions n JOIN campaign_npcs cn ON cn.npc_id=n.id WHERE cn.campaign_id=${campaignId}::uuid AND (${campaign.isNarrator} OR cn.revealed_fields ? 'name' OR cn.revealed_fields ? 'identity') ORDER BY n.name LIMIT 200`)
  const entities=await db.execute<SheetContext>(sql`SELECT * FROM sheet_contexts WHERE campaign_id=${campaignId}::uuid AND subject_type IN ('ORGANIZATION','PLACE') AND (${campaign.isNarrator} OR created_by=${actorId} OR visibility='CAMPAIGN_VISIBLE') ORDER BY name LIMIT 200`)
  return [...chars.rows.map(r=>({subjectType:'CHARACTER',subjectId:r.id,label:r.name})),...npcs.rows.map(r=>({subjectType:'NPC',subjectId:r.id,label:r.name})),...entities.rows.map(r=>({subjectType:r.subject_type,subjectId:r.subject_id,contextId:r.id,label:r.name}))]
}
export async function getSheetData(actorId:string,campaignId:string,type:SubjectType,id:string,query='') {
  const access=await subjectAccess(actorId,campaignId,type,id)
  const contexts=await db.execute<SheetContext>(sql`SELECT * FROM sheet_contexts WHERE campaign_id=${campaignId}::uuid AND subject_type=${type} AND subject_id=${id}::uuid`)
  const context=contexts.rows[0]
  const records:ReturnType<typeof projection>[]=[],relations:Record<string,unknown>[]=[]
  if(context){
    const rows=await db.execute<SheetRecord>(sql`SELECT * FROM sheet_records WHERE context_id=${context.id}::uuid AND (${query}='' OR title ILIKE ${'%'+npcText(query,120)+'%'} OR body ILIKE ${'%'+query+'%'}) ORDER BY updated_at DESC LIMIT 200`)
    for(const row of rows.rows)if(canReadSheetItem(access,row.author_id,row.visibility)){ records.push(projection(row,access)) }
    await readSheetRelations(context,actorId,relations)
  }
  const responsibles=access.canWrite?await db.execute<{id:string;label:string}>(sql`SELECT DISTINCT user_id AS id,name AS label FROM characters WHERE campaign_id=${campaignId}::uuid AND character_type='PLAYER_VAMPIRE' UNION SELECT master_user_id AS id,'Narrador' AS label FROM campaigns WHERE id=${campaignId}::uuid`):{rows:[]}
  return {contextId:context?.id??null,subjectType:type,subjectId:id,campaignId,label:access.label,canEdit:access.canWrite,isNarrator:access.isNarrator,allowPlayerEdits:access.allowPlayerEdits,records,relations,targets:access.canWrite?await sheetTargets(actorId,campaignId):[],responsibles:responsibles.rows}
}
async function readSheetRelations(context: SheetContext,actorId: string,relations: Record<string,unknown>[]) {
  const rels=await db.execute<SheetRelation>(sql`SELECT * FROM sheet_relations WHERE source_id=${context.id}::uuid OR target_id=${context.id}::uuid ORDER BY created_at DESC LIMIT 200`)
  for(const row of rels.rows) {
    const source=await contextAccess(actorId,row.source_id).catch(() => null),target=await contextAccess(actorId,row.target_id).catch(() => null)
    if(!source||!target||!canReadSheetItem(source.access,row.author_id,row.visibility)||!canReadSheetItem(target.access,row.author_id,row.visibility)) { continue} 
    const outgoing=row.source_id===context.id,other=outgoing? target:source
    relations.push({ id: row.id,relationType: row.relation_type,reciprocal: row.reciprocal,description: row.description,intensity: row.intensity,visibility: row.visibility,revision: row.revision,outgoing,target: { subjectType: other.context.subject_type,subjectId: other.context.subject_id,label: other.access.label },canEdit: canEditSheetItem(source.access,row.author_id)||canEditSheetItem(target.access,row.author_id) })
  }
}

export async function sheetRecordCommand(actorId:string,campaignId:string,type:SubjectType,id:string,input:unknown) {
  const value=npcObject(input);npcKeys(value,['action','data','id','expectedRevision','archived','target','relationType','reciprocal','description','intensity','visibility','name','kind','allowPlayerEdits'])
  const access=await subjectAccess(actorId,campaignId,type,id)
  if(!access.canWrite){ npcFail(403,'A edição narrativa desta ficha não está autorizada.') }
  if(value.action==='SET_POLICY'){
    if(!access.isNarrator||typeof value.allowPlayerEdits!=='boolean'){ npcFail(403,'Somente o Narrador pode definir esta política.') }
    await db.execute(sql`UPDATE campaigns SET allow_player_narrative_edits=${value.allowPlayerEdits} WHERE id=${campaignId}::uuid AND master_user_id=${actorId}`);return {ok:true}
  }
  const {context}=await ensureSheetContext(actorId,campaignId,type,id)
  if(value.action==='CREATE_RECORD'){
    const record=validateRecord(value.data,access);await validateAssignee(campaignId,record.fields)
    const rows=await db.execute(sql`INSERT INTO sheet_records(context_id,section,title,body,fields,author_id,visibility) VALUES(${context.id}::uuid,${record.section},${record.title},${record.body},${JSON.stringify(record.fields)}::jsonb,${actorId},${record.visibility}) RETURNING id`)
    return {id:rows.rows[0].id}
  }
  if(['EDIT_RECORD','ARCHIVE_RECORD','DELETE_RECORD'].includes(String(value.action))){
    return await updateSheetRecord(value,context,access,campaignId)
  }
  if(value.action==='CREATE_ENTITY'){
    return await createSheetEntity(value,access,campaignId,actorId)
  }
  if(value.action==='CREATE_RELATION'){
    return await createSheetRelation(value,actorId,campaignId,context,access)
  }
  if(value.action==='DELETE_RELATION'||value.action==='EDIT_RELATION'){
    const rows=await db.execute<SheetRelation>(sql`SELECT * FROM sheet_relations WHERE id=${npcId(value.id)}::uuid AND (source_id=${context.id}::uuid OR target_id=${context.id}::uuid)`),row=rows.rows[0]
    if(!row){ npcFail(404,'Relação não encontrada.') }
    const source=await contextAccess(actorId,row.source_id)
    const target=await contextAccess(actorId,row.target_id)
    if(!canEditSheetItem(source.access,row.author_id)&&!canEditSheetItem(target.access,row.author_id)){ npcFail(403,'Relação somente para leitura.') }
    let deleted
    if(value.action==='EDIT_RELATION'){
      const visibility=sheetVisibility(value.visibility),relationType=String(value.relationType)
      if(!Object.hasOwn(RELATION_TYPES,relationType)||visibility==='GM_ONLY'&&!source.access.isNarrator||row.reciprocal&&!['ALLY','ENEMY','CONTACT','OTHER'].includes(relationType)){ npcFail(422,'Tipo ou visibilidade inválida. Para alterar a direção, crie outro relacionamento.') }
      deleted=await db.execute(sql`UPDATE sheet_relations SET relation_type=${relationType},description=${npcText(value.description,5000)},intensity=${value.intensity==null?null:npcInteger(value.intensity,0,5)},visibility=${visibility},revision=revision+1 WHERE id=${row.id}::uuid AND revision=${npcInteger(value.expectedRevision,0,2147483647)} RETURNING id`)
    }else deleted=await db.execute(sql`DELETE FROM sheet_relations WHERE id=${row.id}::uuid AND revision=${npcInteger(value.expectedRevision,0,2147483647)} RETURNING id`)
    if(!deleted.rows.length){ npcFail(409,'A relação foi alterada.') }
    return {ok:true}
  }
  return npcFail(400,'Operação narrativa inválida.')
}
async function createSheetEntity(value: Record<string,unknown>,access: SheetAccess,campaignId: string,actorId: string) {
  if(!['ORGANIZATION','PLACE'].includes(String(value.kind))) { npcFail(422,'Entidade inválida.')} 
  const visibility=sheetVisibility(value.visibility)
  if(visibility==='GM_ONLY'&&!access.isNarrator) { npcFail(403,'Visibilidade reservada ao Narrador.')} 
  const rows=await db.execute(sql`INSERT INTO sheet_contexts(campaign_id,subject_type,subject_id,name,created_by,visibility) VALUES(${campaignId}::uuid,${String(value.kind)},${randomUUID()}::uuid,${npcText(value.name,120,true)},${actorId},${visibility}) RETURNING id`)
  return { id: rows.rows[0].id }
}

async function updateSheetRecord(value: Record<string,unknown>,context: SheetContext,access: SheetAccess,campaignId: string) {
  const recordId=npcId(value.id),revision=npcInteger(value.expectedRevision,0,2147483647)
  const rows=await db.execute<SheetRecord>(sql`SELECT * FROM sheet_records WHERE id=${recordId}::uuid AND context_id=${context.id}::uuid`),row=rows.rows[0]
  if(!row||!canReadSheetItem(access,row.author_id,row.visibility)) { npcFail(404,'Registro não encontrado.')} 
  if(!canEditSheetItem(access,row.author_id)) { npcFail(403,'Este registro permite somente leitura.')} 
  let changed
  if(value.action==='DELETE_RECORD') { changed=await db.execute(sql`DELETE FROM sheet_records WHERE id=${recordId}::uuid AND revision=${revision} RETURNING id`)} 
  else if(value.action==='ARCHIVE_RECORD') { if(typeof value.archived!=='boolean') { npcFail(422,'Estado de arquivo inválido.')}  changed=await db.execute(sql`UPDATE sheet_records SET archived=${value.archived},revision=revision+1,updated_at=now() WHERE id=${recordId}::uuid AND revision=${revision} RETURNING id`)} 
  else { const record=validateRecord(value.data,access); await validateAssignee(campaignId,record.fields); changed=await db.execute(sql`UPDATE sheet_records SET section=${record.section},title=${record.title},body=${record.body},fields=${JSON.stringify(record.fields)}::jsonb,visibility=${record.visibility},revision=revision+1,updated_at=now() WHERE id=${recordId}::uuid AND revision=${revision} RETURNING id`)} 
  if(!changed.rows.length) { npcFail(409,'O registro foi alterado. Recarregue antes de salvar.')} 
  return { ok: true }
}

async function createSheetRelation(value: Record<string,unknown>,actorId: string,campaignId: string,context: SheetContext,access: SheetAccess) {
  const target=npcObject(value.target); npcKeys(target,['subjectType','subjectId','contextId'])
  let other: SheetContext
  if(target.contextId) { const resolved=await contextAccess(actorId,npcId(target.contextId)); other=resolved.context} 
  else { const targetAccess=await subjectAccess(actorId,campaignId,target.subjectType,target.subjectId); const exists=await db.execute<SheetContext>(sql`SELECT * FROM sheet_contexts WHERE campaign_id=${campaignId}::uuid AND subject_type=${String(target.subjectType)} AND subject_id=${npcId(target.subjectId)}::uuid`); other=exists.rows[0]; if(!other) { const inserted=await db.execute<SheetContext>(sql`INSERT INTO sheet_contexts(campaign_id,subject_type,subject_id,created_by) VALUES(${campaignId}::uuid,${String(target.subjectType)},${npcId(target.subjectId)}::uuid,${targetAccess.ownerId}) ON CONFLICT(campaign_id,subject_type,subject_id) DO UPDATE SET subject_id=EXCLUDED.subject_id RETURNING *`); other=inserted.rows[0]}  }
  if(other.campaign_id!==campaignId||other.id===context.id) { npcFail(422,'Relacionamento deve ligar duas entidades diferentes da mesma mesa.')} 
  const relationType=String(value.relationType),visibility=sheetVisibility(value.visibility),reciprocal=value.reciprocal===true
  if(!Object.hasOwn(RELATION_TYPES,relationType)||typeof value.reciprocal!=='boolean'||reciprocal&&!['ALLY','ENEMY','CONTACT','OTHER'].includes(relationType)) { npcFail(422,'Tipo ou direção do relacionamento inválido.')} 
  if(visibility==='GM_ONLY'&&!access.isNarrator) { npcFail(403,'Visibilidade reservada ao Narrador.')} 
  const pair=reciprocal? [context.id,other.id].sort((first,second) => first.localeCompare(second)):[context.id,other.id]
  const rows=await db.execute(sql`INSERT INTO sheet_relations(source_id,target_id,relation_type,reciprocal,description,intensity,author_id,visibility) VALUES(${pair[0]}::uuid,${pair[1]}::uuid,${relationType},${reciprocal},${npcText(value.description,5000)},${value.intensity==null? null:npcInteger(value.intensity,0,5)},${actorId},${visibility}) ON CONFLICT(source_id,target_id,relation_type) DO NOTHING RETURNING id`)
  if(!rows.rows.length) { npcFail(409,'Esse relacionamento já existe.')} 
  return { id: rows.rows[0].id }
}

export async function revealSheetItem(actorId:string,sessionId:string,input:unknown) {
  const session=await getGameSession(actorId,npcId(sessionId))
  if(!session.canManage){ npcFail(403,'Somente o Narrador controla revelações.') }
  const value=npcObject(input);npcKeys(value,['action','id','kind','targetId','title','body'])
  const revealId=npcId(value.id)
  if(!['CREATE','REVEAL','SHOW','HIDE'].includes(String(value.action))){ npcFail(422,'Revelação inválida.') }
  let snapshot:Record<string,unknown>={},kind='NOTE',targetId=revealId
  if(value.action==='CREATE'){
    snapshot={title:npcText(value.title,120,true),body:npcText(value.body,20000)}
  }else if(value.action==='REVEAL'){
    kind=String(value.kind);targetId=npcId(value.targetId)
    if(kind==='RECORD'){
      const rows=await db.execute<SheetRecord>(sql`SELECT * FROM sheet_records WHERE id=${targetId}::uuid`),row=rows.rows[0]
      if(!row){ npcFail(404,'Registro não encontrado.') }
      const {context}=await contextAccess(actorId,row.context_id)
      if(context.campaign_id!==session.session.campaignId){ npcFail(403,'Registro de outra mesa.') }
      snapshot={title:row.title,body:row.body,section:row.section}
    }else if(kind==='MEDIA'){
      const rows=await db.execute<{id:string;context_id:string;title:string;description:string}>(sql`SELECT id,context_id,title,description FROM sheet_media WHERE id=${targetId}::uuid AND deleted_at IS NULL`),row=rows.rows[0]
      if(!row?.context_id){ npcFail(404,'Mídia de campanha não encontrada.') }
      const {context}=await contextAccess(actorId,row.context_id)
      if(context.campaign_id!==session.session.campaignId){ npcFail(403,'Mídia de outra mesa.') }
      snapshot={mediaId:row.id,title:row.title,description:row.description}
    }else npcFail(422,'Revelação inválida.')
  }
  return db.transaction(async tx=>{
    const campaign=await tx.execute<{master_user_id:string}>(sql`SELECT master_user_id FROM campaigns WHERE id=${session.session.campaignId}::uuid FOR SHARE`)
    if(campaign.rows[0]?.master_user_id!==actorId){ npcFail(403,'Somente o Narrador atual controla revelações.') }
    const locked=await tx.execute<{status:string}>(sql`SELECT status FROM game_sessions WHERE id=${sessionId}::uuid FOR SHARE`)
    if(!locked.rows[0]){ npcFail(404,'Sessão não encontrada.') }
    if(value.action==='SHOW'||value.action==='HIDE'){
      const rows=await tx.execute(sql`UPDATE sheet_reveals SET revoked_at=${value.action==='HIDE'?new Date():null} WHERE id=${revealId}::uuid AND session_id=${sessionId}::uuid RETURNING id`)
      if(!rows.rows.length){ npcFail(404,'Revelação não encontrada nesta sessão.') }
      return {id:revealId,ok:true}
    }
    if(locked.rows[0].status!=='ACTIVE'){ npcFail(403,'Novas revelações exigem sessão ativa.') }
    const inserted=await tx.execute(sql`INSERT INTO sheet_reveals(id,session_id,kind,target_id,snapshot,revealed_by,revoked_at) VALUES(${revealId}::uuid,${sessionId}::uuid,${kind},${targetId}::uuid,${JSON.stringify(snapshot)}::jsonb,${actorId},${value.action==='CREATE'?new Date():null}) ON CONFLICT(id) DO NOTHING RETURNING id`)
    if(!inserted.rows.length){
      const prior=await tx.execute<{session_id:string;kind:string;target_id:string;snapshot:Record<string,unknown>}>(sql`SELECT session_id,kind,target_id,snapshot FROM sheet_reveals WHERE id=${revealId}::uuid`),row=prior.rows[0]
      if(!row||row.session_id!==sessionId||row.kind!==kind||row.target_id!==targetId||row.snapshot.title!==snapshot.title||row.snapshot.body!==snapshot.body||row.snapshot.description!==snapshot.description){ npcFail(409,'Identificador já utilizado em outra revelação.') }
      return {id:revealId}
    }
    const links=[{targetType:'SESSION',targetId:sessionId}]
    await tx.execute(sql`INSERT INTO notes(id,author_user_id,campaign_id,visibility,title,body,links) VALUES(${revealId}::uuid,${actorId},${session.session.campaignId}::uuid,'PRIVATE',${String(snapshot.title)},${String(snapshot.body??snapshot.description??'')},${JSON.stringify(links)}::jsonb)`)
    return {id:revealId}
  })
}
export async function listSheetReveals(actorId:string,sessionId:string) {
  const {canManage}=await getGameSession(actorId,npcId(sessionId))
  const rows=await db.execute<{id:string;kind:string;snapshot:Record<string,unknown>;revealed_at:Date;revealed:boolean}>(sql`SELECT r.id,r.kind,r.snapshot || jsonb_build_object('title',n.title,'body',n.body) AS snapshot,r.revealed_at,r.revoked_at IS NULL AS revealed FROM sheet_reveals r JOIN notes n ON n.id=r.id WHERE r.session_id=${sessionId}::uuid AND (${canManage} OR r.revoked_at IS NULL) ORDER BY r.revealed_at DESC LIMIT 100`)
  return {reveals:rows.rows,canManage}
}
