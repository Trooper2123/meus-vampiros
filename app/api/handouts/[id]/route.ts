import { notesActor,notesFailure,notesId,notesResponse } from '@/lib/notes-http'
import { deleteCampaignHandout } from '@/lib/session-handouts'
export async function DELETE(request:Request,context:{params:Promise<{id:string}>}){try{return notesResponse(await deleteCampaignHandout(await notesActor(request,true),notesId((await context.params).id)))}catch(error){return notesFailure(error)}}
