import { NextResponse } from 'next/server'
import { getSessionOrDev } from '@/lib/auth0'
import { ensureAllTables } from '@/lib/db'
import { CharacterCommandError } from '@/lib/character-commands'
import { getSessionSoundtrack, updateSessionSoundtrack, type SoundtrackCommand } from '@/lib/session-soundtrack'
type Context={params:Promise<{id:string}>}
function fail(error:unknown){return NextResponse.json({error:error instanceof CharacterCommandError?error.message:'Não foi possível processar a trilha sonora.'},{status:error instanceof CharacterCommandError?error.status:500,headers:{'Cache-Control':'no-store'}})}
export async function GET(_request:Request,context:Context){
 try{const session=await getSessionOrDev();if(!session?.user?.sub)return NextResponse.json({error:'Não autorizado.'},{status:401});await ensureAllTables();return NextResponse.json(await getSessionSoundtrack(session.user.sub,(await context.params).id),{headers:{'Cache-Control':'no-store'}})}catch(error){return fail(error)}
}
export async function POST(request:Request,context:Context){
 try{
 const session=await getSessionOrDev();if(!session?.user?.sub)return NextResponse.json({error:'Não autorizado.'},{status:401})
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return NextResponse.json({error:'Origem inválida.'},{status:403})
 if(Number(request.headers.get('content-length')??0)>8192)return NextResponse.json({error:'Requisição excessiva.'},{status:413})
 const body:unknown=await request.json().catch(()=>null)
 if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(key=>!['mood','playing','source','youtubeVideoId','youtubePlaylistId','positionSeconds','expectedRevision','idempotencyKey'].includes(key)))return NextResponse.json({error:'Comando inválido.'},{status:400})
 await ensureAllTables()
 return NextResponse.json(await updateSessionSoundtrack(session.user.sub,(await context.params).id,body as SoundtrackCommand),{headers:{'Cache-Control':'no-store'}})
 }catch(error){return fail(error)}
}
