import { canManageCampaign } from '@/lib/auth/authorization'
import { createCharacter } from '@/lib/characters'
import { CharacterCommandError } from '@/lib/character-commands'
import { ensureAllTables } from '@/lib/db'
import { notesActor, notesBody, notesId, notesResponse } from '@/lib/notes-http'

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actorId = await notesActor(request, true)
    const campaignId = notesId((await context.params).id)
    const body = await notesBody(request)
    if (Object.keys(body).some(key => !['name', 'characterType'].includes(key)) || typeof body.name !== 'string' || !body.name.trim() || body.name.length > 120 || !['HUMAN_NPC', 'VAMPIRE_NPC'].includes(body.characterType as string)) throw new CharacterCommandError(400, 'Informe nome e tipo de NPC válidos.')
    await ensureAllTables()
    if (!(await canManageCampaign(actorId, campaignId))) throw new CharacterCommandError(403, 'Apenas o Narrador desta mesa pode criar NPCs.')
    const character = await createCharacter(actorId, { name: body.name.trim(), campaignId, visibility: 'ST_ONLY', data: { nome: body.name.trim(), characterType: body.characterType } })
    return notesResponse({ id: character.id }, 201)
  } catch (error) {
    return notesResponse({ error: error instanceof CharacterCommandError ? error.message : 'Não foi possível criar o NPC.' }, error instanceof CharacterCommandError ? error.status : 500)
  }
}
