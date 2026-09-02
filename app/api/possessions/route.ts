import { getSessionOrDev } from '@/lib/auth0'
import { NextResponse } from 'next/server'
import {
  getPossessionsForCharacter,
  getPossessionsForCampaign,
  createPossession,
  updatePossessionStatus,
} from '@/lib/possessions'
import { ensureAllTables } from '@/lib/db'

async function getAuthenticatedUser() {
  const session = await getSessionOrDev()
  return session?.user ?? null
}

export async function GET(request: Request) {
  try {
    await ensureAllTables()
    const user = await getAuthenticatedUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const characterId = searchParams.get('characterId')
    const campaignId = searchParams.get('campaignId')

    if (characterId) {
      const possessions = await getPossessionsForCharacter(characterId)
      return NextResponse.json({ possessions })
    }

    if (campaignId) {
      const possessions = await getPossessionsForCampaign(campaignId)
      return NextResponse.json({ possessions })
    }

    return NextResponse.json({ error: 'Parâmetro characterId ou campaignId é obrigatório.' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Não foi possível carregar os pertences.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    await ensureAllTables()
    const user = await getAuthenticatedUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const body = await request.json()
    const { characterId, label, description, origin, campaignId } = body

    if (!characterId || typeof characterId !== 'string') {
      return NextResponse.json({ error: 'characterId é obrigatório.' }, { status: 400 })
    }
    if (!label || typeof label !== 'string' || !label.trim()) {
      return NextResponse.json({ error: 'Nome do pertence é obrigatório.' }, { status: 400 })
    }

    const possession = await createPossession(characterId, {
      label: label.trim(),
      description: typeof description === 'string' ? description.trim() : null,
      origin: origin === 'master' ? 'master' : 'player',
      campaignId: typeof campaignId === 'string' ? campaignId : null,
    })

    return NextResponse.json({ possession }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Não foi possível criar o pertence.' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    await ensureAllTables()
    const user = await getAuthenticatedUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const body = await request.json()
    const { id, status, masterComment } = body

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'id do pertence é obrigatório.' }, { status: 400 })
    }
    if (!['pendente', 'aprovado', 'reprovado'].includes(status)) {
      return NextResponse.json({ error: 'Status inválido.' }, { status: 400 })
    }

    const possession = await updatePossessionStatus(id, {
      status,
      masterComment: typeof masterComment === 'string' ? masterComment.trim() : null,
    })

    if (!possession) {
      return NextResponse.json({ error: 'Pertence não encontrado.' }, { status: 444 })
    }

    return NextResponse.json({ possession })
  } catch {
    return NextResponse.json({ error: 'Não foi possível atualizar o pertence.' }, { status: 500 })
  }
}
