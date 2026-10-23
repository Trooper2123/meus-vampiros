import { notesActor, notesResponse } from '@/lib/notes-http'
import { CharacterCommandError } from '@/lib/character-commands'
import { RULE_SOURCES } from '@/lib/vtm-v5/rule-profile'

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await notesActor(request)
    const { id } = await context.params
    if (!Object.hasOwn(RULE_SOURCES, id)) return notesResponse({ error: 'Fonte não encontrada.' }, 404)
    return notesResponse({ error: 'O arquivo não está disponível nesta etapa.' }, 404)
  } catch (error) {
    return notesResponse({ error: error instanceof CharacterCommandError ? error.message : 'Fonte indisponível.' }, error instanceof CharacterCommandError ? error.status : 404)
  }
}
