import { CharacterCommandError } from '@/lib/character-commands'
import { rerollCharacterDice } from '@/lib/character-roll-history'
import { notesActor, notesBody, notesId, notesResponse } from '@/lib/notes-http'

export async function POST(request: Request, context: { params: Promise<{ id: string; rollId: string }> }) {
  try {
    const actorId = await notesActor(request, true)
    const { id, rollId } = await context.params
    notesId(id); notesId(rollId)
    const body = await notesBody(request)
    if (Object.keys(body).some(key => !['dieIds', 'expectedRevision', 'idempotencyKey'].includes(key)) || !Number.isSafeInteger(body.expectedRevision) || Number(body.expectedRevision) < 0 || typeof body.idempotencyKey !== 'string') throw new CharacterCommandError(400, 'Requisição de rerrolagem inválida.')
    notesId(body.idempotencyKey)
    return notesResponse(await rerollCharacterDice(actorId, id, rollId, { dieIds: body.dieIds as string[], expectedRevision: Number(body.expectedRevision), idempotencyKey: body.idempotencyKey }))
  } catch (error) {
    return notesResponse({ error: error instanceof CharacterCommandError ? error.message : 'Não foi possível rerrolar os dados.' }, error instanceof CharacterCommandError ? error.status : 500)
  }
}
