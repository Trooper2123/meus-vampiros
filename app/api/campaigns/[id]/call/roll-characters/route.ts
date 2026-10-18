import { getCallRollCharacters } from '@/lib/call-roll-characters'
import { CharacterCommandError } from '@/lib/character-commands'
import { notesActor, notesId, notesResponse } from '@/lib/notes-http'

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actorId = await notesActor(request)
    return notesResponse(getCallRollCharacters(actorId, notesId((await context.params).id)))
  } catch (error) {
    return notesResponse({ error: error instanceof CharacterCommandError ? error.message : 'Não foi possível carregar as fichas autorizadas.' }, error instanceof CharacterCommandError ? error.status : 500)
  }
}
