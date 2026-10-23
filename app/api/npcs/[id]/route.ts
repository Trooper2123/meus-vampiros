import { narratorActor,npcFailure } from '@/lib/npc-http'
import { notesBody,notesId,notesResponse } from '@/lib/notes-http'
import { changeNpc,getNpc } from '@/lib/npc-store'
type Context={params:Promise<{id:string}>}
export async function GET(request:Request,context:Context){try{return notesResponse(await getNpc(await narratorActor(request),notesId((await context.params).id)))}catch(error){return npcFailure(error)}}
export async function PATCH(request:Request,context:Context){try{return notesResponse(await changeNpc(await narratorActor(request,true),notesId((await context.params).id),await notesBody(request)))}catch(error){return npcFailure(error)}}
export async function DELETE(request:Request,context:Context){try{return notesResponse(await changeNpc(await narratorActor(request,true),notesId((await context.params).id),{...await notesBody(request),action:'DELETE'}))}catch(error){return npcFailure(error)}}
