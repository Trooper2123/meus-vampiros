import { CharacterCommandError } from '@/lib/character-commands'
import { getCampaignXpHistory, markCampaignXpViewed, xpHistoryFilters } from '@/lib/campaign-xp-history'
import { notesActor, notesBody, notesId, notesResponse } from '@/lib/notes-http'

const failure = (error: unknown) => notesResponse({ error: error instanceof CharacterCommandError ? error.message : 'Não foi possível consultar o histórico de XP.' }, error instanceof CharacterCommandError ? error.status : 500)
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await notesActor(request)
    const id = notesId((await context.params).id)
    return notesResponse(await getCampaignXpHistory(actor, id, xpHistoryFilters(new URL(request.url).searchParams)))
  } catch (error) { return failure(error) }
}
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await notesActor(request, true)
    const id = notesId((await context.params).id)
    const body = await notesBody(request)
    if (Object.keys(body).some(key => key !== 'eventIds')) throw new CharacterCommandError(400, 'Dados de leitura inválidos.')
    return notesResponse(await markCampaignXpViewed(actor, id, body.eventIds))
  } catch (error) { return failure(error) }
}
