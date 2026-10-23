import { closeGameSession, getGameSession } from '@/lib/game-sessions'
import { notesActor, notesBody, notesFailure, notesId, notesResponse } from '@/lib/notes-http'

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actorId = await notesActor(request)
    return notesResponse(await getGameSession(actorId, notesId((await context.params).id)))
  } catch (error) { return notesFailure(error) }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actorId = await notesActor(request, true)
    return notesResponse({ session: await closeGameSession(actorId, notesId((await context.params).id), await notesBody(request)) })
  } catch (error) { return notesFailure(error) }
}
