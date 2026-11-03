import { NextResponse } from 'next/server'
import { getSessionOrDev } from '@/lib/auth0'
import { CharacterCommandError } from '@/lib/character-commands'

export async function smsActor(request: Request, mutation = false) {
  const auth = await getSessionOrDev()
  if (!auth?.user?.sub) throw new CharacterCommandError(401, 'Não autorizado.')
  if (mutation) {
    const origin = request.headers.get('origin')
    if (origin && origin !== new URL(request.url).origin || request.headers.get('sec-fetch-site') === 'cross-site') throw new CharacterCommandError(403,'Origem não permitida.')
    if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw new CharacterCommandError(400,'Envie dados JSON.')
  }
  return auth.user.sub
}
export async function smsBody(request:Request) {
  if(Number(request.headers.get('content-length'))>8192)throw new CharacterCommandError(413,'Mensagem muito grande.')
  const body=await request.text()
  if(body.length>8192)throw new CharacterCommandError(413,'Mensagem muito grande.')
  let value: unknown
  try{value=JSON.parse(body)}catch{throw new CharacterCommandError(400,'JSON inválido.')}
  if(!value||typeof value!=='object'||Array.isArray(value))throw new CharacterCommandError(400,'Corpo inválido.')
  return value as Record<string,unknown>
}
export function smsResponse(value:unknown,status=200){
  return NextResponse.json(value,{status,headers:{'Cache-Control':'private, no-store',Vary:'Cookie'}})
}
export function smsFailure(e:unknown){
  return smsResponse({error:e instanceof CharacterCommandError?e.message:'Não foi possível acessar o SMS.'}, e instanceof CharacterCommandError?e.status:500)
}
