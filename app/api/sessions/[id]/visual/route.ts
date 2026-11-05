import { notesActor,notesBody,notesFailure,notesId,notesResponse } from '@/lib/notes-http'
import { getSessionVisual,selectSessionVisual } from '@/lib/session-visual'
export async function GET(request:Request,context:{params:Promise<{id:string}>}){try{return notesResponse(await getSessionVisual(await notesActor(request),notesId((await context.params).id)))}catch(error){return notesFailure(error)}}
export async function PATCH(request:Request,context:{params:Promise<{id:string}>}){try{return notesResponse(await selectSessionVisual(await notesActor(request,true),notesId((await context.params).id),await notesBody(request)))}catch(error){return notesFailure(error)}}
