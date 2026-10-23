import { createHash,randomUUID } from 'node:crypto'
import { get,put,del } from '@vercel/blob'
import sharp from 'sharp'
import { sql } from 'drizzle-orm'
import { db } from './db'
import { npcFail,npcInteger,npcKeys,npcObject,npcText } from './npc-domain'
import { npcId } from './npc-store'
import { canReadSheetItem,canEditSheetItem,contextAccess,ensureSheetContext,globalSubjectAccess,sheetVisibility,subjectAccess,type SheetVisibility,type SubjectType } from './sheet-access'

export const MAX_SHEET_IMAGE_BYTES=5*1024*1024
export type MediaStore={read:(key:string)=>Promise<Uint8Array|null>;write:(key:string,data:Uint8Array)=>Promise<void>;remove:(key:string)=>Promise<void>}
export type MediaRow={id:string;context_id:string|null;subject_type:SubjectType;subject_id:string;storage_key:string;mime_type:string;size_bytes:number;width:number;height:number;title:string;description:string;category:string;is_portrait:boolean;position_x:number;position_y:number;visibility:SheetVisibility;author_id:string;revision:number;deleted_at:Date|null;created_at:Date}
type UploadRow={id:string;author_id:string;context_id:string|null;subject_type:SubjectType;subject_id:string;metadata:ReturnType<typeof validateMetadata>;created_at:Date;completed_at:Date|null}
export function requireBlobConfiguration(){if(!process.env.BLOB_READ_WRITE_TOKEN)npcFail(503,'Configure um Vercel Blob privado e BLOB_READ_WRITE_TOKEN para enviar imagens.')}
async function boundedStream(stream:ReadableStream<Uint8Array>){const reader=stream.getReader(),chunks:Uint8Array[]=[];let size=0;try{while(true){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>MAX_SHEET_IMAGE_BYTES)npcFail(413,'A imagem excede 5 MB.');chunks.push(part.value)}}finally{await reader.cancel().catch(()=>{})}return Buffer.concat(chunks)}
export const privateBlobStore:MediaStore={
  async read(key){requireBlobConfiguration();const result=await get(key,{access:'private',useCache:false});if(!result||result.statusCode!==200)return null;if(result.blob.size>MAX_SHEET_IMAGE_BYTES){await result.stream.cancel();return npcFail(413,'A imagem excede 5 MB.')}return boundedStream(result.stream)},
  async write(key,data){requireBlobConfiguration();await put(key,Buffer.from(data),{access:'private',contentType:'image/webp',addRandomSuffix:false,allowOverwrite:true})},
  async remove(key){requireBlobConfiguration();await del(key)},
}
export function mediaStagingKey(actorId:string,id:string){return `sheet-staging/${createHash('sha256').update(actorId).digest('hex')}/${npcId(id)}`}
export async function sanitizeSheetImage(bytes:Uint8Array){
  if(!bytes.length||bytes.length>MAX_SHEET_IMAGE_BYTES)npcFail(413,'Envie uma imagem de até 5 MB.')
  try{
    const image=sharp(bytes,{limitInputPixels:32000000,animated:false}),metadata=await image.metadata()
    if(!['jpeg','png','webp'].includes(metadata.format??'')||!metadata.width||!metadata.height||metadata.width<32||metadata.height<32||metadata.width>8192||metadata.height>8192||(metadata.pages??1)>1)npcFail(422,'Envie JPEG, PNG ou WebP estático, entre 32 e 8192 pixels por dimensão.')
    const result=await image.rotate().resize({width:4096,height:4096,fit:'inside',withoutEnlargement:true}).webp({quality:85}).toBuffer({resolveWithObject:true})
    if(result.data.length>MAX_SHEET_IMAGE_BYTES)npcFail(413,'A imagem processada excede 5 MB.')
    return {bytes:result.data,width:result.info.width,height:result.info.height,mimeType:'image/webp'}
  }catch(error){if(error instanceof Error&&'status' in error)throw error;return npcFail(422,'O arquivo não contém uma imagem válida ou excede o limite de pixels.')}
}
function validateMetadata(input:unknown){const value=npcObject(input);npcKeys(value,['title','description','category','isPortrait','visibility','positionX','positionY']);if(typeof value.isPortrait!=='boolean')npcFail(422,'Escolha o uso da imagem.');return {title:npcText(value.title,120,true),description:npcText(value.description??'',2000),category:npcText(value.category??'',120),isPortrait:value.isPortrait,visibility:sheetVisibility(value.visibility),positionX:npcInteger(value.positionX??50,0,100),positionY:npcInteger(value.positionY??50,0,100)}}
export async function prepareSheetUpload(actorId:string,input:unknown,configured=true){
  if(configured)requireBlobConfiguration()
  const value=npcObject(input);npcKeys(value,['subjectType','subjectId','campaignId','data'])
  if(!['CHARACTER','NPC'].includes(String(value.subjectType)))npcFail(422,'Tipo de ficha inválido.')
  const type=value.subjectType as SubjectType,id=npcId(value.subjectId),metadata=validateMetadata(value.data)
  let contextId:string|null=null
  if(value.campaignId){const resolved=await ensureSheetContext(actorId,npcId(value.campaignId),type,id);contextId=resolved.context.id;if(metadata.visibility==='GM_ONLY'&&!resolved.access.isNarrator)npcFail(403,'Apenas o Narrador define mídia exclusiva.')}
  else {await globalSubjectAccess(actorId,type,id,true);if(!metadata.isPortrait||!['OWNER_ONLY','CAMPAIGN_VISIBLE'].includes(metadata.visibility))npcFail(422,'Imagens globais são retratos; escolha visibilidade do dono ou dos participantes.')}
  return db.transaction(async tx=>{
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${actorId+':uploads'},0))`)
    const recent=await tx.execute<{count:string}>(sql`SELECT count(*) AS count FROM sheet_upload_requests WHERE author_id=${actorId} AND created_at>now()-interval '15 minutes'`)
    if(Number(recent.rows[0].count)>=10)npcFail(429,'Limite de 10 envios em 15 minutos. Aguarde antes de tentar novamente.')
    const count=await tx.execute<{count:string}>(sql`SELECT count(*) AS count FROM sheet_media WHERE subject_type=${type} AND subject_id=${id}::uuid AND context_id IS NOT DISTINCT FROM ${contextId}::uuid AND deleted_at IS NULL`)
    if(Number(count.rows[0].count)>=100)npcFail(422,'Limite de 100 imagens neste contexto. Remova uma imagem antes de enviar outra.')
    const uploadId=randomUUID()
    await tx.execute(sql`INSERT INTO sheet_upload_requests(id,author_id,context_id,subject_type,subject_id,metadata) VALUES(${uploadId}::uuid,${actorId},${contextId}::uuid,${type},${id}::uuid,${JSON.stringify(metadata)}::jsonb)`)
    return {uploadId,pathname:mediaStagingKey(actorId,uploadId)}
  })
}
export async function authorizeSheetUpload(actorId:string,id:string){
  const rows=await db.execute<UploadRow>(sql`SELECT * FROM sheet_upload_requests WHERE id=${npcId(id)}::uuid AND author_id=${actorId} AND completed_at IS NULL AND created_at>now()-interval '1 hour'`),row=rows.rows[0]
  if(!row)npcFail(403,'Envio expirado ou não autorizado.')
  if(row.context_id){const {access}=await contextAccess(actorId,row.context_id);if(!access.canWrite)npcFail(403,'Envio não autorizado.')}
  else await globalSubjectAccess(actorId,row.subject_type,row.subject_id,true)
  return row
}
function mediaProjection(row:MediaRow,canEdit:boolean){return {id:row.id,title:row.title,description:row.description,category:row.category,isPortrait:row.is_portrait,positionX:row.position_x,positionY:row.position_y,visibility:row.visibility,width:row.width,height:row.height,sizeBytes:row.size_bytes,revision:row.revision,canEdit,url:`/api/sheet-media/${row.id}`}}
export async function confirmSheetUpload(actorId:string,id:string,store:MediaStore=privateBlobStore){
  npcId(id)
  return db.transaction(async tx=>{
    const uploads=await tx.execute<UploadRow>(sql`SELECT * FROM sheet_upload_requests WHERE id=${id}::uuid AND author_id=${actorId} FOR UPDATE`),upload=uploads.rows[0]
    if(!upload)npcFail(403,'Envio não autorizado.')
    const prior=await tx.execute<MediaRow>(sql`SELECT * FROM sheet_media WHERE id=${id}::uuid AND deleted_at IS NULL`)
    if(prior.rows[0]){await authorizeMedia(actorId,prior.rows[0],true);return mediaProjection(prior.rows[0],true)}
    await authorizeSheetUpload(actorId,id)
    const staging=mediaStagingKey(actorId,id),raw=await store.read(staging)
    if(!raw)npcFail(409,'O upload ainda não está disponível. Tente confirmar novamente.')
    let image:Awaited<ReturnType<typeof sanitizeSheetImage>>
    try{image=await sanitizeSheetImage(raw)}catch(error){await store.remove(staging).catch(()=>{});throw error}
    const storageKey=`sheet-images/${id}.webp`,meta=upload.metadata
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${upload.subject_type+':'+upload.subject_id+':'+(upload.context_id??'global')},0))`)
    const old=meta.isPortrait?await tx.execute<MediaRow>(sql`UPDATE sheet_media SET is_portrait=false,deleted_at=CASE WHEN context_id IS NULL THEN now() ELSE deleted_at END,revision=revision+1 WHERE subject_type=${upload.subject_type} AND subject_id=${upload.subject_id}::uuid AND context_id IS NOT DISTINCT FROM ${upload.context_id}::uuid AND is_portrait AND deleted_at IS NULL RETURNING *`):{rows:[]}
    await store.write(storageKey,image.bytes)
    const rows=await tx.execute<MediaRow>(sql`INSERT INTO sheet_media(id,context_id,subject_type,subject_id,storage_key,mime_type,size_bytes,width,height,title,description,category,is_portrait,position_x,position_y,visibility,author_id) VALUES(${id}::uuid,${upload.context_id}::uuid,${upload.subject_type},${upload.subject_id}::uuid,${storageKey},${image.mimeType},${image.bytes.length},${image.width},${image.height},${meta.title},${meta.description},${meta.category},${meta.isPortrait},${meta.positionX},${meta.positionY},${meta.visibility},${actorId}) RETURNING *`)
    await tx.execute(sql`UPDATE sheet_upload_requests SET completed_at=now() WHERE id=${id}::uuid`)
    await store.remove(staging).catch(()=>{})
    for(const row of old.rows)if(!row.context_id)await store.remove(row.storage_key).catch(()=>{})
    return mediaProjection(rows.rows[0],true)
  })
}
async function authorizeMedia(actorId:string,row:MediaRow,write=false){
  if(row.deleted_at)npcFail(404,'Imagem não encontrada.')
  if(!write){const revealed=await db.execute(sql`SELECT r.id FROM sheet_reveals r JOIN game_sessions s ON s.id=r.session_id JOIN campaigns c ON c.id=s.campaign_id WHERE r.kind='MEDIA' AND r.target_id=${row.id}::uuid AND r.revoked_at IS NULL AND s.status='ACTIVE' AND (c.master_user_id=${actorId} OR EXISTS(SELECT 1 FROM characters ch WHERE ch.campaign_id=c.id AND ch.user_id=${actorId})) LIMIT 1`);if(revealed.rows.length)return {canEdit:false}}
  if(row.context_id){const {access}=await contextAccess(actorId,row.context_id);if(!canReadSheetItem(access,row.author_id,row.visibility))npcFail(404,'Imagem não encontrada.');const canEdit=canEditSheetItem(access,row.author_id);if(write&&!canEdit)npcFail(403,'Mídia somente para leitura.');return {canEdit}}
  const access=await globalSubjectAccess(actorId,row.subject_type,row.subject_id,write)
  const visible=access.isOwner||access.isNarrator||row.visibility==='CAMPAIGN_VISIBLE'&&access.campaignIds.length>0
  if(!visible)npcFail(404,'Imagem não encontrada.')
  return {canEdit:access.isOwner||access.isNarrator}
}
export async function listSheetMedia(actorId:string,campaignId:string,type:SubjectType,id:string){
  await subjectAccess(actorId,campaignId,type,id)
  const rows=await db.execute<MediaRow>(sql`SELECT m.* FROM sheet_media m LEFT JOIN sheet_contexts c ON c.id=m.context_id WHERE m.subject_type=${type} AND m.subject_id=${id}::uuid AND m.deleted_at IS NULL AND (c.campaign_id=${campaignId}::uuid OR m.context_id IS NULL AND m.is_portrait) ORDER BY m.created_at DESC LIMIT 100`)
  const visible=[]
  for(const row of rows.rows){const allowed=await authorizeMedia(actorId,row).catch(()=>null);if(allowed)visible.push({...mediaProjection(row,allowed.canEdit),global:!row.context_id})}
  return {media:visible,portrait:visible.find(m=>m.isPortrait&&!m.global)??visible.find(m=>m.isPortrait)??null,storageConfigured:!!process.env.BLOB_READ_WRITE_TOKEN}
}
export async function listGlobalSheetMedia(actorId:string,type:unknown,id:string){
  if(type!=='CHARACTER'&&type!=='NPC')npcFail(400,'Tipo de ficha inválido.')
  const access=await globalSubjectAccess(actorId,type,id)
  const rows=await db.execute<MediaRow>(sql`SELECT * FROM sheet_media WHERE subject_type=${String(type)} AND subject_id=${id}::uuid AND context_id IS NULL AND is_portrait AND deleted_at IS NULL LIMIT 1`)
  const visible=[]
  for(const row of rows.rows){const allowed=await authorizeMedia(actorId,row).catch(()=>null);if(allowed)visible.push({...mediaProjection(row,allowed.canEdit),global:true})}
  return {media:visible,portrait:visible[0]??null,canEdit:access.isOwner||access.isNarrator,storageConfigured:!!process.env.BLOB_READ_WRITE_TOKEN}
}
export async function readSheetMedia(actorId:string,id:string,store:MediaStore=privateBlobStore){const rows=await db.execute<MediaRow>(sql`SELECT * FROM sheet_media WHERE id=${npcId(id)}::uuid AND deleted_at IS NULL`),row=rows.rows[0];if(!row)npcFail(404,'Imagem não encontrada.');await authorizeMedia(actorId,row);const bytes=await store.read(row.storage_key);if(!bytes)npcFail(404,'Imagem não encontrada.');return {bytes,mimeType:row.mime_type}}
export async function editSheetMedia(actorId:string,id:string,input:unknown,store:MediaStore=privateBlobStore){
  const value=npcObject(input);npcKeys(value,['action','data','expectedRevision'])
  const rows=await db.execute<MediaRow>(sql`SELECT * FROM sheet_media WHERE id=${npcId(id)}::uuid AND deleted_at IS NULL`),row=rows.rows[0]
  if(!row)npcFail(404,'Imagem não encontrada.')
  await authorizeMedia(actorId,row,true)
  const revision=npcInteger(value.expectedRevision,0,2147483647)
  if(value.action==='DELETE'){
    const changed=await db.execute(sql`UPDATE sheet_media SET deleted_at=now(),is_portrait=false,revision=revision+1 WHERE id=${id}::uuid AND revision=${revision} RETURNING id`)
    if(!changed.rows.length)npcFail(409,'A imagem foi alterada.')
    const removed=await store.remove(row.storage_key).then(()=>true).catch(()=>false)
    return {ok:true,storageDeletionPending:!removed}
  }
  if(value.action!=='EDIT')npcFail(400,'Operação de mídia inválida.')
  const meta=validateMetadata(value.data)
  if(row.context_id){const {access}=await contextAccess(actorId,row.context_id);if(meta.visibility==='GM_ONLY'&&!access.isNarrator)npcFail(403,'Visibilidade reservada ao Narrador.')}
  else if(!['OWNER_ONLY','CAMPAIGN_VISIBLE'].includes(meta.visibility))npcFail(422,'Visibilidade de retrato global inválida.')
  return db.transaction(async tx=>{
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${row.subject_type+':'+row.subject_id+':'+(row.context_id??'global')},0))`)
    const current=await tx.execute<MediaRow>(sql`SELECT * FROM sheet_media WHERE id=${id}::uuid FOR UPDATE`)
    if(current.rows[0]?.revision!==revision||current.rows[0]?.deleted_at)npcFail(409,'A imagem foi alterada.')
    if(meta.isPortrait)await tx.execute(sql`UPDATE sheet_media SET is_portrait=false,revision=revision+1 WHERE id<>${id}::uuid AND subject_type=${row.subject_type} AND subject_id=${row.subject_id}::uuid AND context_id IS NOT DISTINCT FROM ${row.context_id}::uuid AND deleted_at IS NULL AND is_portrait`)
    const changed=await tx.execute<MediaRow>(sql`UPDATE sheet_media SET title=${meta.title},description=${meta.description},category=${meta.category},is_portrait=${meta.isPortrait},position_x=${meta.positionX},position_y=${meta.positionY},visibility=${meta.visibility},revision=revision+1 WHERE id=${id}::uuid RETURNING *`)
    return mediaProjection(changed.rows[0],true)
  })
}
