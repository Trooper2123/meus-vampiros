import { del, get } from '@vercel/blob'
import { configurePrivateBlobToken } from '@/lib/private-blob-token'
import { randomUUID } from 'node:crypto'
import { sql } from 'drizzle-orm'
import { CharacterCommandError } from '@/lib/character-commands'
import { db } from '@/lib/db'

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const configuredMax = Number(process.env.SESSION_HANDOUT_MAX_BYTES ?? 100 * 1024 * 1024)
export const MAX_SESSION_HANDOUT_BYTES = Number.isSafeInteger(configuredMax) && configuredMax > 0 ? configuredMax : 100 * 1024 * 1024
function requireBlob() { if (!configurePrivateBlobToken()) { throw new CharacterCommandError(503, 'Configure um Vercel Blob privado para usar os handouts.') } }
function requireUuid(value: unknown) { if (typeof value !== 'string' || !uuid.test(value)) { throw new CharacterCommandError(400, 'Identificador inválido.') } return value }
function object(value: unknown): Record<string, unknown> { if (!value || typeof value !== 'object' || Array.isArray(value)) { throw new CharacterCommandError(400, 'Dados inválidos.') } return value as Record<string, unknown> }
async function campaignAccess(actorId: string, campaignId: string) {
  const result = await db.execute<{ master: boolean; member: boolean }>(sql`SELECT c.master_user_id=${actorId} AS master, (c.master_user_id=${actorId} OR EXISTS(SELECT 1 FROM characters ch WHERE ch.campaign_id=c.id AND ch.user_id=${actorId} AND ch.character_type='PLAYER_VAMPIRE' AND ch.status='APPROVED')) AS member FROM campaigns c WHERE c.id=${campaignId}::uuid`)
  const row = result.rows[0]
  if (!row?.member) { throw new CharacterCommandError(404, 'Arquivo não encontrado.') }
  return row
}
function handoutPath(campaignId: string, id: string) { return `campaigns/${campaignId}/handouts/${id}` }

export async function listCampaignHandouts(actorId: string, campaignId: string) {
  const access = await campaignAccess(actorId, requireUuid(campaignId))
  const result = await db.execute<{id:string;title:string;file_name:string;content_type:string|null;size_bytes:string|null;share_mode:'PRIVATE'|'ALL'|'SELECTED';revision:number;created_at:Date|string;recipient_ids:string[]}>(sql`
    SELECT h.id,h.title,h.file_name,h.content_type,h.size_bytes,h.share_mode,h.revision,h.created_at,
      COALESCE(array_agg(r.actor_id) FILTER(WHERE r.actor_id IS NOT NULL),ARRAY[]::text[]) AS recipient_ids
    FROM campaign_handouts h LEFT JOIN campaign_handout_recipients r ON r.handout_id=h.id
    WHERE h.campaign_id=${campaignId}::uuid AND h.deleted_at IS NULL AND h.upload_completed_at IS NOT NULL
      AND (${access.master} OR h.share_mode='ALL' OR (h.share_mode='SELECTED' AND EXISTS(SELECT 1 FROM campaign_handout_recipients mine WHERE mine.handout_id=h.id AND mine.actor_id=${actorId})))
    GROUP BY h.id ORDER BY h.created_at DESC LIMIT 200
  `)
  const recipients = access.master ? await db.execute<{actor_id:string;name:string}>(sql`SELECT DISTINCT ch.user_id AS actor_id,ch.name FROM characters ch WHERE ch.campaign_id=${campaignId}::uuid AND ch.character_type='PLAYER_VAMPIRE' AND ch.status='APPROVED' ORDER BY ch.name LIMIT 200`) : { rows: [] }
  return { canManage: access.master, recipients: recipients.rows, handouts: result.rows.map(row=>({id:row.id,title:row.title,fileName:row.file_name,contentType:row.content_type,sizeBytes:Number(row.size_bytes),shareMode:row.share_mode,revision:row.revision,createdAt:new Date(row.created_at).toISOString(),recipientActorIds:access.master?row.recipient_ids:undefined,url:`/api/handouts/${row.id}/file`})) }
}

export async function prepareCampaignHandout(actorId: string, campaignId: string, input: unknown) {
  campaignId=requireUuid(campaignId)
  const access=await campaignAccess(actorId,campaignId); if(!access.master) { throw new CharacterCommandError(403,'Somente o Narrador pode enviar handouts.') }
  requireBlob()
  const value=object(input)
  if(Object.keys(value).some(key=>!['fileName','idempotencyKey'].includes(key))) { throw new CharacterCommandError(400,'Envio inválido.') }
  const fileName=typeof value.fileName==='string'?value.fileName.trim():''
  const key=requireUuid(value.idempotencyKey)
  if(!fileName||fileName.length>255||/[\\/]/.test(fileName)||[...fileName].some(char=>char.charCodeAt(0)<32||char.charCodeAt(0)===127)) { throw new CharacterCommandError(422,'Nome de arquivo inválido.') }
  const title=fileName.replace(/\.[^.]+$/,'').slice(0,200)||fileName.slice(0,200)
  return await db.transaction(async tx=>{
    const campaign=await tx.execute<{master_user_id:string}>(sql`SELECT master_user_id FROM campaigns WHERE id=${campaignId}::uuid FOR SHARE`)
    if(campaign.rows[0]?.master_user_id!==actorId){throw new CharacterCommandError(403,'Somente o Narrador pode enviar handouts.')}
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${campaignId+':'+actorId+':handouts'},0))`)
    const prior=await tx.execute<{id:string;file_name:string;deleted_at:Date|null}>(sql`SELECT id,file_name,deleted_at FROM campaign_handouts WHERE campaign_id=${campaignId}::uuid AND uploaded_by_actor_id=${actorId} AND idempotency_key=${key}::uuid`)
    if(prior.rows[0]){if(prior.rows[0].deleted_at){throw new CharacterCommandError(409,'Este envio já foi removido.')}if(prior.rows[0].file_name!==fileName){throw new CharacterCommandError(409,'A chave já foi usada para outro arquivo.')}return {uploadId:prior.rows[0].id,pathname:handoutPath(campaignId,prior.rows[0].id)}}
    const recent=await tx.execute<{count:string}>(sql`SELECT count(*) AS count FROM campaign_handouts WHERE campaign_id=${campaignId}::uuid AND uploaded_by_actor_id=${actorId} AND created_at>now()-interval '15 minutes'`)
    if(Number(recent.rows[0].count)>=10){throw new CharacterCommandError(429,'Limite de dez envios em 15 minutos. Aguarde para enviar outro arquivo.')}
    const id=randomUUID(),path=handoutPath(campaignId,id)
    await tx.execute(sql`INSERT INTO campaign_handouts(id,campaign_id,title,file_name,blob_pathname,uploaded_by_actor_id,idempotency_key) VALUES(${id}::uuid,${campaignId}::uuid,${title},${fileName},${path},${actorId},${key}::uuid)`)
    return {uploadId:id,pathname:path}
  })
}

export async function authorizeCampaignHandoutUpload(actorId:string,campaignId:string,id:string,pathname:string) {
  campaignId=requireUuid(campaignId);id=requireUuid(id)
  const access=await campaignAccess(actorId,campaignId)
  const row=await db.execute(sql`SELECT id FROM campaign_handouts WHERE id=${id}::uuid AND campaign_id=${campaignId}::uuid AND uploaded_by_actor_id=${actorId} AND upload_completed_at IS NULL AND deleted_at IS NULL AND created_at>now()-interval '1 hour'`)
  if(!access.master||!row.rows.length||pathname!==handoutPath(campaignId,id)) { throw new CharacterCommandError(403,'Envio não autorizado.') }
  requireBlob()
}

export async function confirmCampaignHandout(actorId:string,campaignId:string,id:string) {
  campaignId=requireUuid(campaignId);id=requireUuid(id)
  const access=await campaignAccess(actorId,campaignId);if(!access.master) { throw new CharacterCommandError(403,'Somente o Narrador pode confirmar o envio.') }
  requireBlob()
  return await db.transaction(async tx=>{
    const campaign=await tx.execute<{master_user_id:string}>(sql`SELECT master_user_id FROM campaigns WHERE id=${campaignId}::uuid FOR SHARE`)
    if(campaign.rows[0]?.master_user_id!==actorId){throw new CharacterCommandError(403,'Somente o Narrador pode confirmar o envio.')}
    const locked=await tx.execute<{blob_pathname:string;upload_completed_at:Date|null}>(sql`SELECT blob_pathname,upload_completed_at FROM campaign_handouts WHERE id=${id}::uuid AND campaign_id=${campaignId}::uuid AND uploaded_by_actor_id=${actorId} AND deleted_at IS NULL FOR UPDATE`),row=locked.rows[0]
    if(!row) { throw new CharacterCommandError(404,'Envio não encontrado.') }
    if(row.upload_completed_at) { return {id,shareMode:'PRIVATE'} }
    const blob=await get(row.blob_pathname,{access:'private',useCache:false})
    if(!blob||blob.statusCode!==200||blob.blob.size<1||blob.blob.size>MAX_SESSION_HANDOUT_BYTES) { throw new CharacterCommandError(blob?.statusCode===200?413:409,'O arquivo não está disponível ou excede o limite configurado.') }
    await tx.execute(sql`UPDATE campaign_handouts SET blob_url=${blob.blob.url},content_type=${blob.blob.contentType},size_bytes=${blob.blob.size},upload_completed_at=now(),updated_at=now() WHERE id=${id}::uuid`)
    return {id,shareMode:'PRIVATE'}
  })
}

export async function shareCampaignHandout(actorId:string,id:string,input:unknown) {
  id=requireUuid(id);const value=object(input),mode=value.shareMode
  if(Object.keys(value).some(key=>!['shareMode','recipientActorIds','expectedRevision'].includes(key))||!['PRIVATE','ALL','SELECTED'].includes(String(mode))||!Number.isSafeInteger(value.expectedRevision)||!Array.isArray(value.recipientActorIds)||value.recipientActorIds.length>100||value.recipientActorIds.some(item=>typeof item!=='string'||item.length>255)||new Set(value.recipientActorIds).size!==value.recipientActorIds.length) { throw new CharacterCommandError(400,'Compartilhamento inválido.') }
  const recipients=value.recipientActorIds as string[]
  if(mode==='SELECTED'?!recipients.length:recipients.length>0) { throw new CharacterCommandError(422,'Selecione destinatários apenas para compartilhamento individual.') }
  return await db.transaction(async tx=>{
    const rows=await tx.execute<{campaign_id:string;revision:number}>(sql`SELECT campaign_id,revision FROM campaign_handouts WHERE id=${id}::uuid AND deleted_at IS NULL AND upload_completed_at IS NOT NULL FOR UPDATE`),row=rows.rows[0]
    if(!row) { throw new CharacterCommandError(404,'Handout não encontrado.') }
    const campaign=await tx.execute<{master_user_id:string}>(sql`SELECT master_user_id FROM campaigns WHERE id=${row.campaign_id}::uuid FOR SHARE`)
    if(campaign.rows[0]?.master_user_id!==actorId) { throw new CharacterCommandError(403,'Somente o Narrador pode alterar o compartilhamento.') }
    if(row.revision!==value.expectedRevision) { throw new CharacterCommandError(409,'O compartilhamento foi alterado. Atualize a lista.') }
    if(recipients.length){const valid=await tx.execute(sql`SELECT DISTINCT user_id FROM characters WHERE campaign_id=${row.campaign_id}::uuid AND character_type='PLAYER_VAMPIRE' AND status='APPROVED' AND user_id IN (${sql.join(recipients.map(actor=>sql`${actor}`),sql`, `)})`);if(valid.rows.length!==recipients.length){throw new CharacterCommandError(422,'Um destinatário não participa mais da mesa.')}}
    await tx.execute(sql`DELETE FROM campaign_handout_recipients WHERE handout_id=${id}::uuid`)
    if(mode==='SELECTED'){const values=sql.join(recipients.map(actor=>sql`(${id}::uuid,${actor})`),sql`, `);await tx.execute(sql`INSERT INTO campaign_handout_recipients(handout_id,actor_id) VALUES ${values}`)}
    await tx.execute(sql`UPDATE campaign_handouts SET share_mode=${mode},revision=revision+1,updated_at=now() WHERE id=${id}::uuid`)
    return {ok:true,revision:row.revision+1}
  })
}

async function authorizedHandout(actorId:string,id:string,managerOnly=false) {
  id=requireUuid(id)
  const rows=await db.execute<{campaign_id:string;blob_pathname:string;file_name:string;content_type:string|null;share_mode:'PRIVATE'|'ALL'|'SELECTED';uploaded_by_actor_id:string}>(sql`SELECT campaign_id,blob_pathname,file_name,content_type,share_mode,uploaded_by_actor_id FROM campaign_handouts WHERE id=${id}::uuid AND deleted_at IS NULL AND upload_completed_at IS NOT NULL`),row=rows.rows[0]
  if(!row) { throw new CharacterCommandError(404,'Handout não encontrado.') }
  const access=await campaignAccess(actorId,row.campaign_id)
  if(managerOnly&&!access.master) { throw new CharacterCommandError(403,'Somente o Narrador pode remover handouts.') }
  const granted=row.share_mode==='ALL'||row.share_mode==='SELECTED'&&(await db.execute(sql`SELECT 1 FROM campaign_handout_recipients WHERE handout_id=${id}::uuid AND actor_id=${actorId} LIMIT 1`)).rows.length>0
  if(!access.master&&!granted) { throw new CharacterCommandError(404,'Handout não encontrado.') }
  return row
}

export async function readCampaignHandout(actorId:string,id:string,inline=false) {
  const row=await authorizedHandout(actorId,id);requireBlob();const blob=await get(row.blob_pathname,{access:'private',useCache:false})
  if(!blob||blob.statusCode!==200) { throw new CharacterCommandError(404,'Handout não encontrado.') }
  if(inline&&!['image/jpeg','image/png','image/webp','image/gif'].includes(row.content_type??'')){throw new CharacterCommandError(415,'Este tipo de arquivo não pode ser exibido na Mesa Visual.')}
  const safeName=row.file_name.replace(/[\r\n"\\]/g,'_')
  return new Response(blob.stream,{headers:{'Content-Type':row.content_type||'application/octet-stream','Content-Disposition':`${inline?'inline':'attachment'}; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(row.file_name)}`,'X-Content-Type-Options':'nosniff','Cache-Control':'private, no-store','Content-Security-Policy':"default-src 'none'; sandbox"}})
}

export async function deleteCampaignHandout(actorId:string,id:string) {
  id=requireUuid(id)
  const row=await db.transaction(async tx=>{
    const rows=await tx.execute<{campaign_id:string;blob_pathname:string}>(sql`SELECT h.campaign_id,h.blob_pathname FROM campaign_handouts h JOIN campaigns c ON c.id=h.campaign_id WHERE h.id=${id}::uuid AND c.master_user_id=${actorId} FOR SHARE OF c FOR UPDATE OF h`)
    const item=rows.rows[0]
    if(!item){const exists=await tx.execute(sql`SELECT 1 FROM campaign_handouts WHERE id=${id}::uuid`);if(exists.rows.length){throw new CharacterCommandError(403,'Somente o Narrador pode remover handouts.')}throw new CharacterCommandError(404,'Handout não encontrado.')}
    await tx.execute(sql`UPDATE campaign_handouts SET deleted_at=COALESCE(deleted_at,now()),updated_at=now() WHERE id=${id}::uuid`)
    await tx.execute(sql`DELETE FROM campaign_handout_recipients WHERE handout_id=${id}::uuid`)
    return item
  })
  try{if(configurePrivateBlobToken()){await del(row.blob_pathname)}}catch{throw new CharacterCommandError(503,'Arquivo removido da mesa; a limpeza do armazenamento será repetida ao tentar novamente.')}
  return {ok:true}
}
