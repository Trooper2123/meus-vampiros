import { getSessionOrDev } from '@/lib/auth0'
import { NextResponse } from 'next/server'
import {
  getPossessionsForCharacter,
  getPossessionsForCampaign,
  createPossession,
  updatePossessionStatus,
} from '@/lib/possessions'
import { ensureAllTables } from '@/lib/db'
import { canManageCampaign, canManagePossession } from '@/lib/auth/authorization'
import { getCharacterAccessRecord } from '@/lib/characters'

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
async function readBody(request: Request) {
  const body = await request.json().catch(() => null)
  return body && typeof body === 'object' && !Array.isArray(body) ? body : null
}
async function itemAccess(userId: string, characterId: string) {
  const character = await getCharacterAccessRecord(characterId)
  const master = !!character?.campaignId && await canManageCampaign(userId, character.campaignId)
  return { character, master, allowed: !!character && (character.userId === userId || master) }
}

async function getAuthenticatedUser() {
  const session = await getSessionOrDev()
  return session?.user ?? null
}

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser()
    if (!user?.sub) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    await ensureAllTables()

    const { searchParams } = new URL(request.url)
    const characterId = searchParams.get('characterId')
    const campaignId = searchParams.get('campaignId')
    if ((characterId && !uuid.test(characterId)) || (campaignId && !uuid.test(campaignId)) || (characterId && campaignId)) {
      return NextResponse.json({ error: 'Identificadores inválidos.' }, { status: 400 })
    }

    if (characterId) {
      if (!(await itemAccess(user.sub, characterId)).allowed) {
        return NextResponse.json({ error: 'Proibido' }, { status: 403 })
      }
      const possessions = await getPossessionsForCharacter(characterId)
      return NextResponse.json({ possessions })
    }

    if (campaignId) {
      if (!(await canManageCampaign(user.sub, campaignId))) {
        return NextResponse.json({ error: 'Proibido' }, { status: 403 })
      }
      const possessions = await getPossessionsForCampaign(campaignId)
      const accessible = await Promise.all(possessions.map(async (item) => (await getCharacterAccessRecord(item.characterId))?.campaignId === campaignId ? item : null))
      return NextResponse.json({ possessions: accessible.filter((item) => item !== null) })
    }

    return NextResponse.json({ error: 'Parâmetro characterId ou campaignId é obrigatório.' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Não foi possível carregar os pertences.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser()
    if (!user?.sub) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const body = await readBody(request)
    if (!body) return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 })
    const { characterId, label, description, origin, campaignId } = body

    if (typeof characterId !== 'string' || !uuid.test(characterId)) {
      return NextResponse.json({ error: 'characterId é obrigatório.' }, { status: 400 })
    }
    if (typeof label !== 'string' || !label.trim() || label.length > 200 || (description != null && (typeof description !== 'string' || description.length > 2000)) || (origin != null && !['player', 'master'].includes(origin)) || (campaignId != null && (typeof campaignId !== 'string' || !uuid.test(campaignId)))) {
      return NextResponse.json({ error: 'Nome do pertence é obrigatório.' }, { status: 400 })
    }

    await ensureAllTables()
    const access = await itemAccess(user.sub, characterId)
    if (!access.allowed || (origin === 'master' && !access.master) || (campaignId != null && campaignId !== access.character?.campaignId)) {
      return NextResponse.json({ error: 'Proibido' }, { status: 403 })
    }

    const possession = await createPossession(characterId, {
      label: label.trim(),
      description: typeof description === 'string' ? description.trim() : null,
      origin: access.master && (origin === 'master' || access.character?.userId !== user.sub) ? 'master' : 'player',
      campaignId: access.character?.campaignId ?? null,
    })

    return NextResponse.json({ possession }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Não foi possível criar o pertence.' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getAuthenticatedUser()
    if (!user?.sub) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const body = await readBody(request)
    if (!body) return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 })
    const { id, status, masterComment } = body

    if (typeof id !== 'string' || !uuid.test(id) || (masterComment != null && (typeof masterComment !== 'string' || masterComment.length > 2000))) {
      return NextResponse.json({ error: 'id do pertence é obrigatório.' }, { status: 400 })
    }
    if (!['pendente', 'aprovado', 'reprovado'].includes(status)) {
      return NextResponse.json({ error: 'Status inválido.' }, { status: 400 })
    }

    await ensureAllTables()
    if (!(await canManagePossession(user.sub, id))) {
      return NextResponse.json({ error: 'Proibido' }, { status: 403 })
    }

    const possession = await updatePossessionStatus(id, {
      status,
      masterComment: typeof masterComment === 'string' ? masterComment.trim() : null,
    })

    if (!possession) {
      return NextResponse.json({ error: 'Pertence não encontrado.' }, { status: 404 })
    }

    return NextResponse.json({ possession })
  } catch {
    return NextResponse.json({ error: 'Não foi possível atualizar o pertence.' }, { status: 500 })
  }
}
