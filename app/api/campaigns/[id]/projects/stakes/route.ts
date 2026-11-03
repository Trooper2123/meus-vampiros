import { NextResponse } from 'next/server'
import { getSessionOrDev } from '@/lib/auth0'
import { ensureAllTables } from '@/lib/db'
import { CharacterCommandError } from '@/lib/character-commands'
import { getProjectStakeOptions } from '@/lib/project-stake-options'
type Context={params:Promise<{id:string}>}
export async function GET(request:Request,context:Context){
 try {
  const session=await getSessionOrDev()
  if(!session?.user?.sub)return NextResponse.json({error:'Não autorizado.'},{status:401})
  const projectId=new URL(request.url).searchParams.get('projectId')??''
  await ensureAllTables()
  return NextResponse.json(await getProjectStakeOptions(session.user.sub,(await context.params).id,projectId),{headers:{'Cache-Control':'no-store'}})
 }catch(error){
  return NextResponse.json({error:error instanceof CharacterCommandError?error.message:'Não foi possível consultar os pontos disponíveis.'},{status:error instanceof CharacterCommandError?error.status:500,headers:{'Cache-Control':'no-store'}})
 }
}
