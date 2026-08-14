import { Auth0Client } from '@auth0/nextjs-auth0/server'
import { sql } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

async function getAuthenticatedUser() {
  const auth0 = new Auth0Client()
  const session = await auth0.getSession()
  return session?.user ?? null
}

async function readPayload(request: Request) {
  const body = await request.json()
  return {
    id: typeof body.id === 'string' ? body.id : null,
    name: typeof body.name === 'string' && body.name.trim() ? body.name.trim() : 'Personagem sem nome',
    data: body.data && typeof body.data === 'object' ? body.data : {},
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    const { name, data } = await readPayload(request)
    const result = await db.execute<{ id: string }>(sql`
      INSERT INTO characters (user_id, name, concept, clan, generation, data)
      VALUES (${user.sub}, ${name}, ${data.conceito ?? null}, ${data.cla ?? null}, ${data.geracao ?? null}, ${JSON.stringify(data)}::jsonb)
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
    const { id, name, data } = await readPayload(request)
    if (!id) return NextResponse.json({ error: 'Ficha inválida' }, { status: 400 })
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
