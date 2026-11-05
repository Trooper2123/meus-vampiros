import { notesActor,notesBody,notesFailure,notesId,notesResponse } from '@/lib/notes-http'
import { shareCampaignHandout } from '@/lib/session-handouts'
export async function PATCH(request:Request,context:{params:Promise<{id:string}>}){try{return notesResponse(await shareCampaignHandout(await notesActor(request,true),notesId((await context.params).id),await notesBody(request)))}catch(error){return notesFailure(error)}}
