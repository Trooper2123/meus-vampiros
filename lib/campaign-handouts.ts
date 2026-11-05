import { randomUUID } from 'node:crypto'
import { get, put, del } from '@vercel/blob'
import { db, ensureAllTables } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { configurePrivateBlobToken } from '@/lib/private-blob-token'
import { CharacterCommandError } from '@/lib/character-commands'

const MAX_BYTES = 10 * 1024 * 1024
const allowed = new Set(['application/pdf','image/png','image/jpeg','image/webp','text/plain'])
export const uuid = (s:string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
export function storage() { if(!configurePrivateBlobToken()) throw new CharacterCommandError(503,'Vercel Blob privado não configurado.') }
export async function access(actor:string,campaign:string,master=false) {
 await ensureAllTables()
 const r=await db.execute<{owner:boolean}>(sql`SELECT master_user_id=${actor} AS owner FROM campaigns WHERE id=${campaign}::uuid AND (master_user_id=${actor} OR EXISTS(SELECT 1 FROM characters WHERE campaign_id=${campaign}::uuid AND user_id=${actor} AND status<>'DELETED'))`)
 if(!r.rows[0] || (master&&!r.rows[0].owner))throw new CharacterCommandError(403,'Sem acesso aos handouts.')
 return r.rows[0].owner
}
export async function list(actor:string,campaign:string) {
 const owner=await access(actor,campaign)
 const rows=await db.execute<{id:string;name:string;mime_type:string;byte_size:number;visibility:string;created_at:string;recipients:string[]}>(sql`
 SELECT h.id,h.name,h.mime_type,h.byte_size,h.visibility,h.created_at,
 COALESCE((SELECT array_agg(r.character_id::text) FROM campaign_handout_recipients r WHERE r.handout_id=h.id),ARRAY[]::text[]) recipients
 FROM campaign_handouts h WHERE h.campaign_id=${campaign}::uuid AND
 (${owner} OR h.visibility='ALL' OR (h.visibility='SELECTED' AND EXISTS (
 SELECT 1 FROM campaign_handout_recipients r JOIN characters c ON c.id=r.character_id
 WHERE r.handout_id=h.id AND c.user_id=${actor} AND c.campaign_id=${campaign}::uuid AND c.status<>'DELETED'
 ))) ORDER BY h.created_at DESC`)
 const players=owner?(await db.execute<{id:string;name:string}>(sql`SELECT id,name FROM characters WHERE campaign_id=${campaign}::uuid AND status<>'DELETED' ORDER BY name`)).rows:[]
 return {owner,handouts:rows.rows.map(row=>({...row,recipients:owner?row.recipients:[]})),players}
}
export async function upload(actor:string,campaign:string,file:File,visibility:string,recipients:string[]) {
 await access(actor,campaign,true)
 if(!allowed.has(file.type))throw new CharacterCommandError(415,'Formato permitido: PDF, PNG, JPEG, WebP ou TXT.')
 if(file.size<1||file.size>MAX_BYTES)throw new CharacterCommandError(413,'Arquivo deve ter até 10 MB.')
 if(!['NARRATOR','ALL','SELECTED'].includes(visibility))throw new CharacterCommandError(422,'Visibilidade inválida.')
 if(recipients.length>100||recipients.some(id=>!uuid(id)))throw new CharacterCommandError(422,'Destinatários inválidos.')
 if(visibility==='SELECTED'&&!recipients.length)throw new CharacterCommandError(422,'Selecione ao menos um personagem.')
 const name=file.name.replace(/[\\/\x00-\x1f]/g,'').trim().slice(0,180)
 if(!name)throw new CharacterCommandError(422,'Nome inválido.')
 if(visibility==='SELECTED') {
 const valid=await db.execute<{id:string}>(sql`SELECT id FROM characters WHERE campaign_id=${campaign}::uuid AND status<>'DELETED' AND id::text=ANY(${recipients}::text[])`)
 if(valid.rows.length!==new Set(recipients).size)throw new CharacterCommandError(422,'Destinatário fora da campanha.')
 }
 storage()
 const id=randomUUID(),key=`campaign-handouts/${campaign}/${id}`
 const bytes=Buffer.from(await file.arrayBuffer())
 const signatures:Record<string,boolean>={
 'application/pdf':bytes.subarray(0,5).toString()==='%PDF-',
 'image/png':bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),
 'image/jpeg':bytes[0]===255&&bytes[1]===216&&bytes[2]===255,
 'image/webp':bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP',
 'text/plain':!bytes.includes(0)
 }
 if(!signatures[file.type])throw new CharacterCommandError(422,'Conteúdo não corresponde ao formato informado.')
 await put(key,bytes,{access:'private',contentType:file.type,addRandomSuffix:false,allowOverwrite:false})
 try {
 await db.execute(sql`INSERT INTO campaign_handouts(id,campaign_id,storage_key,name,mime_type,byte_size,visibility) VALUES (${id}::uuid,${campaign}::uuid,${key},${name},${file.type},${file.size},${visibility})`)
 if(visibility==='SELECTED') for(const recipient of new Set(recipients))await db.execute(sql`INSERT INTO campaign_handout_recipients(handout_id,character_id) VALUES (${id}::uuid,${recipient}::uuid)`)
 }catch(e){await db.execute(sql`DELETE FROM campaign_handouts WHERE id=${id}::uuid`).catch(()=>{});await del(key).catch(()=>{});throw e}
 return {id}
}
export async function permitted(actor:string,campaign:string,id:string) {
 const owner=await access(actor,campaign)
 const r=await db.execute<{storage_key:string;mime_type:string;name:string}>(sql`SELECT h.storage_key,h.mime_type,h.name FROM campaign_handouts h WHERE h.id=${id}::uuid AND h.campaign_id=${campaign}::uuid AND (${owner} OR h.visibility='ALL' OR (h.visibility='SELECTED' AND EXISTS(SELECT 1 FROM campaign_handout_recipients r JOIN characters c ON c.id=r.character_id WHERE r.handout_id=h.id AND c.user_id=${actor} AND c.campaign_id=${campaign}::uuid AND c.status<>'DELETED')))`)
 if(!r.rows[0])throw new CharacterCommandError(404,'Arquivo não encontrado.')
 return r.rows[0]
}
export async function download(actor:string,campaign:string,id:string) {
 const row=await permitted(actor,campaign,id)
 storage()
 const blob=await get(row.storage_key,{access:'private',useCache:false})
 if(!blob||blob.statusCode!==200)throw new CharacterCommandError(404,'Arquivo indisponível.')
 if(blob.blob.size>MAX_BYTES){await blob.stream.cancel();throw new CharacterCommandError(413,'Arquivo excede o limite.')}
 const reader=blob.stream.getReader(),parts:Uint8Array[]=[];let total=0
 try {while(true){const item=await reader.read();if(item.done)break;total+=item.value.byteLength;if(total>MAX_BYTES)throw new CharacterCommandError(413,'Arquivo excede o limite.');parts.push(item.value)}}finally{await reader.cancel().catch(()=>{})}
 return {row,bytes:Buffer.concat(parts)}
}
export async function remove(actor:string,campaign:string,id:string) {
 await access(actor,campaign,true)
 const r=await db.execute<{storage_key:string}>(sql`DELETE FROM campaign_handouts WHERE id=${id}::uuid AND campaign_id=${campaign}::uuid RETURNING storage_key`)
 if(!r.rows[0])throw new CharacterCommandError(404,'Arquivo não encontrado.')
 storage();await del(r.rows[0].storage_key)
}
