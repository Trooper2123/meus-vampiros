import { NextResponse } from 'next/server'
import { getSessionOrDev } from '@/lib/auth0'
import { ensureAllTables } from '@/lib/db'
import { CharacterCommandError } from '@/lib/character-commands'
import { getCharacterDisciplineRolls, rollCharacterDiscipline, type DisciplineRollIntent } from '@/lib/character-discipline-rolls'

type Context={params:Promise<{id:string}>}
function fail(error:unknown) {return NextResponse.json({error:error instanceof CharacterCommandError?error.message:'Não foi possível processar a rolagem.'},{status:error instanceof CharacterCommandError?error.status:500,headers:{'Cache-Control':'no-store'}})}
export async function GET(_request:Request,context:Context) {
 try{const auth=await getSessionOrDev();if(!auth?.user?.sub)return NextResponse.json({error:'Não autorizado.'},{status:401});await ensureAllTables();return NextResponse.json(await getCharacterDisciplineRolls(auth.user.sub,(await context.params).id),{headers:{'Cache-Control':'no-store'}})}catch(error){return fail(error)}
}
export async function POST(request:Request,context:Context) {
 try{
 const auth=await getSessionOrDev();if(!auth?.user?.sub)return NextResponse.json({error:'Não autorizado.'},{status:401})
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return NextResponse.json({error:'Origem inválida.'},{status:403})
 if(Number(request.headers.get('content-length')??0)>8192)return NextResponse.json({error:'Payload excessivo.'},{status:413})
 const raw:unknown=await request.json().catch(()=>null)
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).some(key=>!['powerId','difficulty','expectedRevision','idempotencyKey','sessionId'].includes(key)))return NextResponse.json({error:'Rolagem inválida.'},{status:400})
 const input=raw as DisciplineRollIntent & {sessionId?:string}
 await ensureAllTables()
 if(input.sessionId) {await (await import('@/lib/game-sessions')).assertGameSessionCharacter(auth.user.sub,input.sessionId,(await context.params).id)}
 return NextResponse.json(await rollCharacterDiscipline(auth.user.sub,(await context.params).id,{powerId:input.powerId,difficulty:input.difficulty,expectedRevision:input.expectedRevision,idempotencyKey:input.idempotencyKey}),{headers:{'Cache-Control':'no-store'}})
 }catch(error){return fail(error)}
}
