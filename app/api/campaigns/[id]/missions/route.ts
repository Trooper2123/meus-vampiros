import { NextResponse } from 'next/server'
import { getSessionOrDev } from '@/lib/auth0'
import { CharacterCommandError } from '@/lib/character-commands'
import { listMissions,commandMission } from '@/lib/campaign-missions'
type Context={params:Promise<{id:string}>}
function failure(error:unknown){return NextResponse.json({error:error instanceof CharacterCommandError?error.message:'Falha no módulo de missões.'},{status:error instanceof CharacterCommandError?error.status:500,headers:{'Cache-Control':'private, no-store'}})}
export async function GET(_request:Request,context:Context){
 try{
  const actor=(await getSessionOrDev())?.user?.sub
  if(!actor)return NextResponse.json({error:'Não autorizado.'},{status:401})
  return NextResponse.json(await listMissions(actor,(await context.params).id),{headers:{'Cache-Control':'private, no-store'}})
 }catch(error){return failure(error)}
}
export async function POST(request:Request,context:Context){
 try{
  const actor=(await getSessionOrDev())?.user?.sub
  if(!actor)return NextResponse.json({error:'Não autorizado.'},{status:401})
  const origin=request.headers.get('origin')
  if((origin&&origin!==new URL(request.url).origin)||request.headers.get('sec-fetch-site')==='cross-site')return NextResponse.json({error:'Origem inválida.'},{status:403})
  if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))return NextResponse.json({error:'Envie JSON.'},{status:415})
  if(Number(request.headers.get('content-length')??0)>32768)return NextResponse.json({error:'Payload excessivo.'},{status:413})
  return NextResponse.json(await commandMission(actor,(await context.params).id,await request.json().catch(()=>null)),{headers:{'Cache-Control':'private, no-store'}})
 }catch(error){return failure(error)}
}
