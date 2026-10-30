import { CharacterCommandError } from './character-commands'
import { DrizzleQueryError } from 'drizzle-orm'
import { getSessionOrDev } from './auth0'
import { hasMasterAccess } from './campaigns'
import { notesActor,notesResponse } from './notes-http'

export async function narratorActor(request:Request,mutate=false){const actorId=await notesActor(request,mutate),session=await getSessionOrDev();if(!session?.user||!await hasMasterAccess(session.user)){ throw new CharacterCommandError(403,'Este módulo exige acesso de Narrador.'); }return actorId}
export function npcFailure(error:unknown){
  if(error instanceof CharacterCommandError){ return notesResponse({error:error.message},error.status) }
  const cause=error instanceof DrizzleQueryError?error.cause:error
  const code=cause&&typeof cause==='object'&&'code' in cause?String(cause.code):''
  if(code==='23505'){ return notesResponse({error:'Já existe um registro com essa identificação.'},409) }
  if(code==='23503'){ return notesResponse({error:'O registro ainda possui vínculos. Preserve ou arquive o histórico.'},409) }
  if(code==='42P01'||code==='42703'){ return notesResponse({error:'O módulo aguarda aplicação da migração de NPCs e fichas narrativas.'},503) }
  return notesResponse({error:'Não foi possível concluir a operação.'},500)
}
