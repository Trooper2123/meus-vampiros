import { auth0 } from '@/lib/auth0'
import { sql } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCampaignById } from '@/lib/campaigns'

async function getAuthenticatedUser() {
  const session = await auth0.getSession()
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
    const user = await getAuthenticatedUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    const id = new URL(request.url).searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Ficha inválida' }, { status: 400 })

    const result = await db.execute<{ id: string; name: string; data: unknown; campaign_id: string | null }>(sql`
      SELECT id, name, data, campaign_id FROM characters WHERE id = ${id}::uuid AND user_id = ${user.sub}
    `)
    const character = result.rows[0]
    if (!character) return NextResponse.json({ error: 'Ficha não encontrada' }, { status: 404 })

    const campaign = character.campaign_id ? await getCampaignById(character.campaign_id) : null
    return NextResponse.json({ character: { id: character.id, name: character.name, data: character.data, campaignId: character.campaign_id }, campaign })
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

    const result = await db.execute<{ id: string }>(sql`
      INSERT INTO characters (user_id, name, concept, clan, generation, data, campaign_id)
      VALUES (${user.sub}, ${name}, ${data.conceito ?? null}, ${data.cla ?? null}, ${data.geracao ?? null}, ${JSON.stringify(data)}::jsonb, ${validCampaignId}::uuid)
      RETURNING id
    `)
    return NextResponse.json({ id: result.rows[0]?.id }, { status: 201 })
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

    if (name === undefined && data === undefined) {
      // Atualização apenas do vínculo com a mesa, preservando os demais dados da ficha.
      await db.execute(sql`
        UPDATE characters SET campaign_id = ${validCampaignId}::uuid, updated_at = NOW()
        WHERE id = ${id}::uuid AND user_id = ${user.sub}
      `)
      return NextResponse.json({ ok: true, campaignId: validCampaignId })
    }

    if (validCampaignId !== undefined) {
      await db.execute(sql`
        UPDATE characters
        SET name = ${name}, concept = ${data.conceito ?? null}, clan = ${data.cla ?? null}, generation = ${data.geracao ?? null}, data = ${JSON.stringify(data)}::jsonb, campaign_id = ${validCampaignId}::uuid, updated_at = NOW()
        WHERE id = ${id}::uuid AND user_id = ${user.sub}
      `)
      return NextResponse.json({ ok: true, campaignId: validCampaignId })
    }

    await db.execute(sql`
      UPDATE characters
      SET name = ${name}, concept = ${data.conceito ?? null}, clan = ${data.cla ?? null}, generation = ${data.geracao ?? null}, data = ${JSON.stringify(data)}::jsonb, updated_at = NOW()
      WHERE id = ${id}::uuid AND user_id = ${user.sub}
    `)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Não foi possível atualizar a ficha.' }, { status: 500 })
  }
}
