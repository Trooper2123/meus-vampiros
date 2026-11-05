import { notesActor,notesFailure,notesId } from '@/lib/notes-http'
import { readCampaignHandout } from '@/lib/session-handouts'
export async function GET(request:Request,context:{params:Promise<{id:string}>}){try{return await readCampaignHandout(await notesActor(request),notesId((await context.params).id),new URL(request.url).searchParams.get('view')==='1')}catch(error){return notesFailure(error)}}
