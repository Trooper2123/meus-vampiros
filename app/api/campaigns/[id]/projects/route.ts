import { NextResponse } from 'next/server'
import { getSessionOrDev } from '@/lib/auth0'
import { ensureAllTables } from '@/lib/db'
import { CharacterCommandError } from '@/lib/character-commands'
import { commandProject,getCampaignProjects,type ProjectCommand } from '@/lib/projects-service'

type Context={params:Promise<{id:string}>}
function fail(error:unknown){
 return NextResponse.json({error:error instanceof CharacterCommandError?error.message:'Não foi possível processar o Projeto.'},{status:error instanceof CharacterCommandError?error.status:500,headers:{'Cache-Control':'no-store'}})
}
export async function GET(_request:Request,context:Context){
 try{
  const auth=await getSessionOrDev()
  if(!auth?.user?.sub)return NextResponse.json({error:'Não autorizado.'},{status:401})
  await ensureAllTables()
  return NextResponse.json(await getCampaignProjects(auth.user.sub,(await context.params).id),{headers:{'Cache-Control':'no-store'}})
 }catch(error){return fail(error)}
}
export async function POST(request:Request,context:Context){
 try{
  const auth=await getSessionOrDev()
  if(!auth?.user?.sub)return NextResponse.json({error:'Não autorizado.'},{status:401})
  const origin=request.headers.get('origin')
  if(origin && origin!==new URL(request.url).origin)return NextResponse.json({error:'Origem inválida.'},{status:403})
  if(Number(request.headers.get('content-length')??0)>16384)return NextResponse.json({error:'Payload excessivo.'},{status:413})
  const value:unknown=await request.json().catch(()=>null)
  const allowed=new Set(['action','idempotencyKey','projectId','ownerCharacterId','coterieId','name','description','goalDescription','targetTrait','currentDots','finalDots','incrementUnit','incrementValue','launchPool','goalPool','rollingCharacterId','stakes','expectedRevision','reason'])
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(key=>!allowed.has(key)))return NextResponse.json({error:'Comando inválido.'},{status:400})
  await ensureAllTables()
  return NextResponse.json(await commandProject(auth.user.sub,(await context.params).id,value as ProjectCommand),{headers:{'Cache-Control':'no-store'}})
 }catch(error){return fail(error)}
}
