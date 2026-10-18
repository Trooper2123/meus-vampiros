import { CharacterCommandError } from '@/lib/character-commands'
import { adjudicateCharacterRoll } from '@/lib/character-roll-history'
import { notesActor, notesBody, notesId, notesResponse } from '@/lib/notes-http'

export async function POST(request: Request, context: { params: Promise<{ id: string; rollId: string }> }) {
  try {
    const actorId = await notesActor(request, true)
    const { id, rollId } = await context.params
    notesId(id); notesId(rollId)
    const body = await notesBody(request)
    if (Object.keys(body).some(key => !['kind', 'note', 'shared', 'offerId', 'expectedRevision', 'idempotencyKey'].includes(key)) || !Number.isSafeInteger(body.expectedRevision) || Number(body.expectedRevision) < 0 || typeof body.idempotencyKey !== 'string') throw new CharacterCommandError(400, 'Requisição de decisão inválida.')
    notesId(body.idempotencyKey)
    if (body.offerId !== undefined && (typeof body.offerId !== 'string' || !notesId(body.offerId))) throw new CharacterCommandError(400, 'Oferta inválida.')
    return notesResponse(await adjudicateCharacterRoll(actorId, id, rollId, { kind: body.kind as Parameters<typeof adjudicateCharacterRoll>[3]['kind'], note: body.note as string, shared: body.shared as boolean | undefined, offerId: body.offerId as string | undefined, expectedRevision: Number(body.expectedRevision), idempotencyKey: body.idempotencyKey }))
  } catch (error) {
    return notesResponse({ error: error instanceof CharacterCommandError ? error.message : 'Não foi possível registrar a decisão.' }, error instanceof CharacterCommandError ? error.status : 500)
  }
}
