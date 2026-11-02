import { NextResponse } from 'next/server'
import { getSessionOrDev } from '@/lib/auth0'
import { CharacterCommandError } from '@/lib/character-commands'
import { executeSessionRoll,type SessionRollInput } from '@/lib/session-rolls'

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function POST(request:Request,context:{params:Promise<{id:string}>}){
 try{
  const auth=await getSessionOrDev();if(!auth?.user?.sub)return NextResponse.json({error:'Não autorizado.'},{status:401})
  const {id}=await context.params;const body=await request.json() as Record<string,unknown>
  if(!uuid.test(id)||typeof body.campaignId!=='string'||!uuid.test(body.campaignId)||typeof body.idempotencyKey!=='string'||!uuid.test(body.idempotencyKey)||Object.keys(body).some(key=>!['campaignId','pool','hunger','difficulty','visibility','reason','idempotencyKey'].includes(key))) return NextResponse.json({error:'Intenção de rolagem inválida.'},{status:400})
  const {campaignId,...input}=body as unknown as SessionRollInput&{campaignId:string}
  return NextResponse.json(await executeSessionRoll(auth.user.sub,id,campaignId,input))
 }catch(error){return NextResponse.json({error:error instanceof CharacterCommandError?error.message:'Não foi possível rolar os dados.'},{status:error instanceof CharacterCommandError?error.status:500})}
}
