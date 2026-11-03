import { NextResponse } from 'next/server'
import { getSessionOrDev } from '@/lib/auth0'
import { ensureAllTables } from '@/lib/db'
import { CharacterCommandError } from '@/lib/character-commands'
import { commandCoterie, getCampaignCoteries } from '@/lib/coterie-service'

type Context = {params: Promise<{id:string}>}
function fail(error:unknown){
  return NextResponse.json({error:error instanceof CharacterCommandError?error.message:'Falha no módulo de Coterie.'},{status:error instanceof CharacterCommandError?error.status:500,headers:{'Cache-Control':'no-store'}})
}
export async function GET(_request:Request,context:Context){
  try{
    const auth=await getSessionOrDev()
    if(!auth?.user?.sub)return NextResponse.json({error:'Não autorizado.'},{status:401})
    await ensureAllTables()
    return NextResponse.json(await getCampaignCoteries(auth.user.sub,(await context.params).id),{headers:{'Cache-Control':'no-store'}})
  }catch(error){return fail(error)}
}
export async function POST(request:Request,context:Context){
  try{
    const auth=await getSessionOrDev()
    if(!auth?.user?.sub)return NextResponse.json({error:'Não autorizado.'},{status:401})
    const origin=request.headers.get('origin')
    if(origin && origin!==new URL(request.url).origin)return NextResponse.json({error:'Origem inválida.'},{status:403})
    if(Number(request.headers.get('content-length')??0)>16384)return NextResponse.json({error:'Payload excessivo.'},{status:413})
    const input:unknown=await request.json().catch(()=>null)
    const allowed=new Set(['action','idempotencyKey','coterieId','characterId','memberId','goalId','havenId','name','typeId','city','chronicle','description','hasDomain','domainDescription','chasse','lien','portillon','domainResonance','chronicleTenets','expectedRevision','role','backgroundCode','dots','source','kind','catalogItemId','customName','location','isPrimary','counterparty','level','status','title'])
    if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(key=>!allowed.has(key)))return NextResponse.json({error:'Comando inválido.'},{status:400})
    await ensureAllTables()
    return NextResponse.json(await commandCoterie(auth.user.sub,(await context.params).id,input as Parameters<typeof commandCoterie>[2]),{headers:{'Cache-Control':'no-store'}})
  }catch(error){return fail(error)}
}
