import { getCampaignGameSession, startGameSession } from '@/lib/game-sessions'
import { notesActor, notesBody, notesFailure, notesId, notesResponse } from '@/lib/notes-http'

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actorId = await notesActor(request)
    return notesResponse(await getCampaignGameSession(actorId, notesId((await context.params).id)))
  } catch (error) { return notesFailure(error) }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actorId = await notesActor(request, true)
    const session = await startGameSession(actorId, notesId((await context.params).id), await notesBody(request))
    return notesResponse({ session }, 201)
  } catch (error) { return notesFailure(error) }
}
