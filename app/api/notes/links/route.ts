import { listNotes, type NoteLink } from '@/lib/notes'
import { notesActor, notesFailure, notesId, notesResponse } from '@/lib/notes-http'
import { CharacterCommandError } from '@/lib/character-commands'

export async function GET(request: Request) {
  try {
    const actor = await notesActor(request)
    const query = new URL(request.url).searchParams
    if ([...query.keys()].some(key => !['targetType', 'targetId', 'page', 'pageSize'].includes(key))) throw new CharacterCommandError(400, 'Filtros inválidos.')
    const link = { targetType: query.get('targetType') as NoteLink['targetType'], targetId: notesId(query.get('targetId') ?? '') }
    return notesResponse(listNotes(actor, { link, page: query.has('page') ? Number(query.get('page')) : undefined, pageSize: query.has('pageSize') ? Number(query.get('pageSize')) : undefined }))
  } catch (error) { return notesFailure(error) }
}
