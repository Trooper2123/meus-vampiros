import { NextResponse } from 'next/server'
import { getSessionOrDev } from '@/lib/auth0'
import { canManageCampaign } from '@/lib/auth/authorization'
import { ensureAllTables } from '@/lib/db'
import { getCharacterAccessRecord, saveCharacterValidation } from '@/lib/characters'
import { normalizeCharacterRulesInput } from '@/lib/vtm-v5/normalize'
import { validateCharacter } from '@/lib/vtm-v5/validation'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function validatePersistedCharacter(id: string, userId: string) {
  if (!UUID_PATTERN.test(id)) return { response: NextResponse.json({ error: 'ID da ficha inválido.' }, { status: 400 }) }
  const character = await getCharacterAccessRecord(id)
  if (!character) return { response: NextResponse.json({ error: 'Ficha não encontrada.' }, { status: 404 }) }
  const isOwner = character.userId === userId
  const isMaster = Boolean(character.campaignId && await canManageCampaign(userId, character.campaignId))
  if (!isOwner && !isMaster) return { response: NextResponse.json({ error: 'Acesso negado.' }, { status: 403 }) }
  const report = validateCharacter(normalizeCharacterRulesInput(character.data))
  await saveCharacterValidation(id, report)
  return { report }
}

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await ensureAllTables()
    const session = await getSessionOrDev()
    if (!session?.user?.sub) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
    const { id } = await context.params
    const result = await validatePersistedCharacter(id, session.user.sub)
    return result.response ?? NextResponse.json(result.report)
  } catch (error) {
    console.error('[POST /api/characters/[id]/validate]', error)
    return NextResponse.json({ error: 'Não foi possível validar a ficha.' }, { status: 500 })
  }
}

export const GET = POST
