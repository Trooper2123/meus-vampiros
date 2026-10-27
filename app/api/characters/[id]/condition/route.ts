import { CharacterCommandError } from '@/lib/character-commands'
import { changeCharacterCondition } from '@/lib/character-conditions'
import { ensureAllTables } from '@/lib/db'
import { notesActor, notesBody, notesId, notesResponse } from '@/lib/notes-http'

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actorId = await notesActor(request, true)
    const id = notesId((await context.params).id)
    const body = await notesBody(request)
    if (typeof body.idempotencyKey !== 'string' || Object.keys(body).some(field => !['condition', 'cause', 'reason', 'expectedRevision', 'idempotencyKey'].includes(field))) throw new CharacterCommandError(400, 'Alteração inválida.')
    notesId(body.idempotencyKey)
    await ensureAllTables()
    return notesResponse(await changeCharacterCondition(actorId, id, body.condition, body.cause, body.reason, body.expectedRevision, body.idempotencyKey))
  } catch (error) {
    return notesResponse({ error: error instanceof CharacterCommandError ? error.message : 'Não foi possível alterar a condição.' }, error instanceof CharacterCommandError ? error.status : 500)
  }
}
