import { npcFailure } from '@/lib/npc-http'
import { notesActor,notesBody,notesId,notesResponse } from '@/lib/notes-http'
import { getSessionNpcs,sessionNpcCommand } from '@/lib/npc-sessions'
type Context={params:Promise<{id:string}>}
export async function GET(request:Request,context:Context){try{return notesResponse(await getSessionNpcs(await notesActor(request),notesId((await context.params).id)))}catch(error){return npcFailure(error)}}
export async function POST(request:Request,context:Context){try{return notesResponse(await sessionNpcCommand(await notesActor(request,true),notesId((await context.params).id),await notesBody(request)))}catch(error){return npcFailure(error)}}
export const PATCH=POST
