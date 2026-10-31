import { archiveCampaign } from '@/lib/campaign-archive'
import { notesActor, notesBody, notesId, notesResponse, notesFailure } from '@/lib/notes-http'

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actorId = await notesActor(request, true)
    return notesResponse(await archiveCampaign(actorId, notesId((await context.params).id), await notesBody(request)))
  } catch (error) { return notesFailure(error) }
}
