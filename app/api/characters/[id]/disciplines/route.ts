import { notesActor, notesBody, notesResponse } from '@/lib/notes-http'
import { getSessionOrDev } from '@/lib/auth0'
import { ensureAllTables } from '@/lib/db'
import { CharacterCommandError, getCommandCharacter } from '@/lib/character-commands'
import { changeCharacterDiscipline, disciplineView } from '@/lib/character-disciplines'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const errorResponse = (error: unknown) => notesResponse({ error: error instanceof CharacterCommandError ? error.message : 'Não foi possível processar as Disciplinas.' }, error instanceof CharacterCommandError ? error.status : 500)
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionOrDev()
    if (!session?.user?.sub) return notesResponse({ error: 'Não autorizado.' }, 401)
    const { id } = await context.params
    if (!UUID.test(id)) throw new CharacterCommandError(400, 'Ficha inválida.')
    await ensureAllTables()
    const character = await getCommandCharacter(id)
    if (!character) throw new CharacterCommandError(404, 'Ficha não encontrada.')
    return notesResponse(disciplineView(character, session.user.sub))
  } catch (error) { return errorResponse(error) }
}
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionOrDev()
    if (!session?.user?.sub) return notesResponse({ error: 'Não autorizado.' }, 401)
    const { id } = await context.params
    await notesActor(request, true)
    const input = await notesBody(request)
    const fields = ['kind', 'disciplineId', 'targetLevel', 'acquisitionSource', 'requirement', 'grantId', 'reason', 'expectedRevision', 'idempotencyKey']
    if (!UUID.test(id) || !input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(field => !fields.includes(field)) || typeof input.idempotencyKey !== 'string' || !UUID.test(input.idempotencyKey) || input.grantId !== undefined && (typeof input.grantId !== 'string' || !UUID.test(input.grantId))) throw new CharacterCommandError(400, 'Comando de Disciplina inválido.')
    await ensureAllTables()
    return notesResponse(await changeCharacterDiscipline(session.user.sub, id, input as Parameters<typeof changeCharacterDiscipline>[2]))
  } catch (error) { return errorResponse(error) }
}

