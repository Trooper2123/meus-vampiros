import { npcFailure } from '@/lib/npc-http'
import { notesActor,notesBody,notesId,notesResponse } from '@/lib/notes-http'
import { listSheetReveals,revealSheetItem } from '@/lib/sheet-records'
type Context={params:Promise<{id:string}>}
export async function GET(request:Request,context:Context){try{return notesResponse(await listSheetReveals(await notesActor(request),notesId((await context.params).id)))}catch(error){return npcFailure(error)}}
export async function POST(request:Request,context:Context){try{return notesResponse(await revealSheetItem(await notesActor(request,true),notesId((await context.params).id),await notesBody(request)))}catch(error){return npcFailure(error)}}
