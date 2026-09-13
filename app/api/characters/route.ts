import { NextResponse } from 'next/server'
import { getSessionOrDev } from '@/lib/auth0'
import { getCharacterById, createCharacter, updateCharacter, getCharactersForCampaign, updateCharacterXp } from '@/lib/characters'
import { getCampaignById } from '@/lib/campaigns'
import { ensureAllTables } from '@/lib/db'
import { canManageCampaign, canEditCharacter } from '@/lib/auth/authorization'

async function getAuthenticatedUser() {
  const session = await getSessionOrDev()
  return session?.user ?? null
}

async function readPayload(request: Request) {
  const body = await request.json()
  return {
    id: typeof body.id === 'string' ? body.id : null,
    name: typeof body.name === 'string' && body.name.trim() ? body.name.trim() : body.name === undefined ? undefined : 'Personagem sem nome',
    data: body.data && typeof body.data === 'object' ? body.data : body.data === undefined ? undefined : {},
    campaignId: typeof body.campaignId === 'string' && body.campaignId.trim() ? body.campaignId.trim() : body.campaignId === null ? null : undefined,
  }
}

export async function GET(request: Request) {
  try {
    await ensureAllTables()
    const user = await getAuthenticatedUser()
    if (!user || !user.sub) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    const searchParams = new URL(request.url).searchParams
    const campaignId = searchParams.get('campaignId')
    if (campaignId) {
      if (!(await canManageCampaign(user.sub, campaignId))) {
         return NextResponse.json({ error: 'Proibido' }, { status: 403 })
      }
      const characters = await getCharactersForCampaign(campaignId)
      return NextResponse.json({ characters })
    }

    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Ficha inválida' }, { status: 400 })

    const character = await getCharacterById(id, user.sub)
    if (!character) return NextResponse.json({ error: 'Ficha não encontrada' }, { status: 404 })

    const campaign = character.campaignId && !character.campaign
      ? await getCampaignById(character.campaignId)
      : character.campaign ?? null

    return NextResponse.json({ character: { id: character.id, name: character.name, data: character.data, campaignId: character.campaignId }, campaign })
  } catch {
    return NextResponse.json({ error: 'Não foi possível carregar a ficha.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    const { name, data, campaignId } = await readPayload(request)

    let validCampaignId: string | null = null
    if (campaignId) {
      const campaign = await getCampaignById(campaignId)
      if (!campaign) return NextResponse.json({ error: 'Mesa não encontrada.' }, { status: 400 })
      validCampaignId = campaign.id
    }

    const result = await createCharacter(user.sub, { name, data, campaignId: validCampaignId })
    return NextResponse.json({ id: result.id }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Não foi possível salvar a ficha.' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    const { id, name, data, campaignId } = await readPayload(request)
    if (!id) return NextResponse.json({ error: 'Ficha inválida' }, { status: 400 })

    let validCampaignId: string | null | undefined = undefined
    if (campaignId !== undefined) {
      if (campaignId) {
        const campaign = await getCampaignById(campaignId)
        if (!campaign) return NextResponse.json({ error: 'Mesa não encontrada.' }, { status: 400 })
        validCampaignId = campaign.id
      } else {
        validCampaignId = null
      }
    }

    const result = await updateCharacter(id, user.sub, { name, data, campaignId: validCampaignId })
    return NextResponse.json({ ok: true, campaignId: validCampaignId })
  } catch {
    return NextResponse.json({ error: 'Não foi possível atualizar a ficha.' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    await ensureAllTables()
    const user = await getAuthenticatedUser()
    if (!user || !user.sub) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const body = await request.json()
    const { characterId, totalXp, addXp } = body

    if (!characterId || typeof characterId !== 'string') {
      return NextResponse.json({ error: 'characterId é obrigatório.' }, { status: 400 })
    }

    if (!(await canEditCharacter(user.sub, characterId))) {
      return NextResponse.json({ error: 'Proibido' }, { status: 403 })
    }

    if (typeof totalXp === 'number') {
      await updateCharacterXp(characterId, Math.max(0, totalXp))
      return NextResponse.json({ ok: true, totalXp: Math.max(0, totalXp) })
    }

    return NextResponse.json({ error: 'Valor totalXp inválido.' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Não foi possível atualizar o XP.' }, { status: 500 })
  }
}
