import { NextResponse } from 'next/server'
import { getSessionOrDev } from '@/lib/auth0'
import { db, ensureAllTables } from '@/lib/db'
import { sql } from 'drizzle-orm'

type Context={params:Promise<{id:string}>}
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const reply=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store',Vary:'Cookie'}})
async function access(context:Context){
 const user=(await getSessionOrDev())?.user?.sub
 if(!user)return {error:reply({error:'Não autorizado.'},401)} as const
 const {id}=await context.params
 if(!uuid.test(id))return {error:reply({error:'Mesa inválida.'},400)} as const
 await ensureAllTables()
 const rows=await db.execute<{master:boolean;member:boolean;enabled:boolean}>(sql`
  SELECT master_user_id=${user} AS master,
   (master_user_id=${user} OR EXISTS(SELECT 1 FROM characters ch WHERE ch.campaign_id=campaigns.id AND ch.user_id=${user} AND ch.status<>'DELETED')) AS member,
   npc_global_catalog_enabled AS enabled FROM campaigns WHERE id=${id}::uuid
 `)
 if(!rows.rows[0]?.member)return {error:reply({error:'Acesso negado.'},403)} as const
 return {id,master:rows.rows[0].master,enabled:rows.rows[0].enabled} as const
}
export async function GET(_request:Request,context:Context){
 try{
  const result=await access(context)
  if('error' in result)return result.error
  return reply({enabled:result.enabled,canManage:result.master})
 }catch{return reply({error:'Não foi possível consultar o catálogo.'},500)}
}
export async function PATCH(request:Request,context:Context){
 try{
  const origin=request.headers.get('origin')
  if((origin&&origin!==new URL(request.url).origin)||request.headers.get('sec-fetch-site')==='cross-site')return reply({error:'Origem não permitida.'},403)
  if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))return reply({error:'Envie JSON.'},415)
  const result=await access(context)
  if('error' in result)return result.error
  if(!result.master)return reply({error:'Somente o Narrador pode alterar esta opção.'},403)
  const body:unknown=await request.json().catch(()=>null)
  if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).length!==1||typeof (body as Record<string,unknown>).enabled!=='boolean')return reply({error:'Opção inválida.'},422)
  const enabled=(body as {enabled:boolean}).enabled
  await db.execute(sql`UPDATE campaigns SET npc_global_catalog_enabled=${enabled},updated_at=now() WHERE id=${result.id}::uuid`)
  // Disabling the catalog must not delete already imported or linked NPCs.
  return reply({enabled})
 }catch{return reply({error:'Não foi possível alterar o catálogo.'},500)}
}
