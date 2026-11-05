import { NextResponse } from 'next/server'
import { getSessionOrDev } from '@/lib/auth0'
import { db, ensureAllTables } from '@/lib/db'
import { sql } from 'drizzle-orm'

type Context = {params:Promise<{id:string}>}
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
type Limit = {id:string;category:'LINE'|'VEIL'|'OTHER';title:string;description:string}
const response=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store',Vary:'Cookie'}})
async function actor(request:Request,context:Context,mutate:boolean) {
 const session=await getSessionOrDev()
 if(!session?.user?.sub)return {error:response({error:'Não autorizado.'},401)} as const
 const {id}=await context.params
 if(!uuid.test(id))return {error:response({error:'Mesa inválida.'},400)} as const
 if(mutate){
  const origin=request.headers.get('origin')
  if((origin&&origin!==new URL(request.url).origin)||request.headers.get('sec-fetch-site')==='cross-site')return {error:response({error:'Origem não permitida.'},403)} as const
  if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))return {error:response({error:'Envie JSON.'},415)} as const
 }
 await ensureAllTables()
 const access=await db.execute<{master:boolean;member:boolean}>(sql`
  SELECT master_user_id=${session.user.sub} AS master,
   (master_user_id=${session.user.sub} OR EXISTS(
    SELECT 1 FROM characters WHERE campaign_id=campaigns.id AND user_id=${session.user.sub} AND status<>'DELETED'
   )) AS member FROM campaigns WHERE id=${id}::uuid
 `)
 const row=access.rows[0]
 if(!row?.member||mutate&&!row.master)return {error:response({error:'Acesso negado.'},403)} as const
 return {id} as const
}
function payload(value:unknown){
 if(!value||typeof value!=='object'||Array.isArray(value))return null
 const item=value as Record<string,unknown>
 if(Object.keys(item).some(key=>!['category','title','description'].includes(key)))return null
 if(!['LINE','VEIL','OTHER'].includes(String(item.category))||typeof item.title!=='string'||!item.title.trim()||item.title.trim().length>160||typeof item.description!=='string'||item.description.length>3000)return null
 return {category:item.category as Limit['category'],title:item.title.trim(),description:item.description.trim()}
}
export async function GET(request:Request,context:Context){
 try{
  const access=await actor(request,context,false)
  if('error' in access)return access.error
  const rows=await db.execute<Limit>(sql`SELECT id,category,title,description FROM campaign_limits WHERE campaign_id=${access.id}::uuid ORDER BY category,title,id`)
  return response({limits:rows.rows})
 }catch{return response({error:'Não foi possível consultar os limites.'},500)}
}
export async function POST(request:Request,context:Context){
 try{
  const access=await actor(request,context,true)
  if('error' in access)return access.error
  const data=payload(await request.json().catch(()=>null))
  if(!data)return response({error:'Limite inválido.'},422)
  const rows=await db.execute<Limit>(sql`INSERT INTO campaign_limits(campaign_id,category,title,description) VALUES(${access.id}::uuid,${data.category},${data.title},${data.description}) RETURNING id,category,title,description`)
  return response({limit:rows.rows[0]},201)
 }catch{return response({error:'Não foi possível criar o limite.'},500)}
}
