import { NextResponse } from 'next/server'
import { getSessionOrDev } from '@/lib/auth0'
import { db, ensureAllTables } from '@/lib/db'
import { sql } from 'drizzle-orm'

type Context={params:Promise<{id:string;limitId:string}>}
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const response=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store',Vary:'Cookie'}})
async function authorize(request:Request,context:Context){
 const session=await getSessionOrDev()
 if(!session?.user?.sub)return {error:response({error:'Não autorizado.'},401)} as const
 const {id,limitId}=await context.params
 if(!uuid.test(id)||!uuid.test(limitId))return {error:response({error:'Identificador inválido.'},400)} as const
 const origin=request.headers.get('origin')
 if((origin&&origin!==new URL(request.url).origin)||request.headers.get('sec-fetch-site')==='cross-site')return {error:response({error:'Origem não permitida.'},403)} as const
 await ensureAllTables()
 const rows=await db.execute<{id:string}>(sql`SELECT id FROM campaigns WHERE id=${id}::uuid AND master_user_id=${session.user.sub}`)
 if(!rows.rows[0])return {error:response({error:'Acesso negado.'},403)} as const
 return {id,limitId} as const
}
export async function PATCH(request:Request,context:Context){
 try{
  const access=await authorize(request,context)
  if('error' in access)return access.error
  if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))return response({error:'Envie JSON.'},415)
  const body:unknown=await request.json().catch(()=>null)
  if(!body||typeof body!=='object'||Array.isArray(body))return response({error:'Dados inválidos.'},422)
  const data=body as Record<string,unknown>
  if(!Object.keys(data).length||Object.keys(data).some(key=>!['category','title','description'].includes(key)))return response({error:'Campos inválidos.'},422)
  if(data.category!==undefined&&!['LINE','VEIL','OTHER'].includes(String(data.category))||data.title!==undefined&&(typeof data.title!=='string'||!data.title.trim()||data.title.trim().length>160)||data.description!==undefined&&(typeof data.description!=='string'||data.description.length>3000))return response({error:'Limite inválido.'},422)
  const category=data.category as string|undefined,title=data.title as string|undefined,description=data.description as string|undefined
  const rows=await db.execute<{id:string;category:string;title:string;description:string}>(sql`
   UPDATE campaign_limits SET
    category=COALESCE(${category??null},category),
    title=COALESCE(${title?.trim()??null},title),
    description=COALESCE(${description?.trim()??null},description),
    updated_at=now()
   WHERE id=${access.limitId}::uuid AND campaign_id=${access.id}::uuid
   RETURNING id,category,title,description
  `)
  return rows.rows[0]?response({limit:rows.rows[0]}):response({error:'Limite não encontrado.'},404)
 }catch{return response({error:'Não foi possível atualizar o limite.'},500)}
}
export async function DELETE(request:Request,context:Context){
 try{
  const access=await authorize(request,context)
  if('error' in access)return access.error
  const rows=await db.execute<{id:string}>(sql`DELETE FROM campaign_limits WHERE id=${access.limitId}::uuid AND campaign_id=${access.id}::uuid RETURNING id`)
  return rows.rows[0]?response({deleted:true}):response({error:'Limite não encontrado.'},404)
 }catch{return response({error:'Não foi possível excluir o limite.'},500)}
}
