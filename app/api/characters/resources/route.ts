import { NextResponse } from 'next/server'
import { getSessionOrDev } from '@/lib/auth0'
import { getCharacterById } from '@/lib/characters'
import { ensureAllTables } from '@/lib/db'
import { canEditCharacter } from '@/lib/auth/authorization'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

async function getAuthenticatedUser() {
  const session = await getSessionOrDev()
  return session?.user ?? null
}

export async function PATCH(request: Request) {
  try {
    await ensureAllTables()
    const user = await getAuthenticatedUser()
    if (!user || !user.sub) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const body = await request.json()
    const { characterId, humanidade, vontade, vitalidade, fome } = body

    if (!characterId || typeof characterId !== 'string') {
      return NextResponse.json({ error: 'characterId é obrigatório.' }, { status: 400 })
    }

    // Validar se é um UUID válido
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(characterId)) {
      return NextResponse.json({ error: 'characterId inválido.' }, { status: 400 })
    }

    if (!(await canEditCharacter(user.sub, characterId))) {
      return NextResponse.json({ error: 'Proibido' }, { status: 403 })
    }

    // Validar limites dos recursos
    const resourceLimits = { humanidade: 10, vontade: 10, vitalidade: 10, fome: 5 }
    for (const [key, value] of Object.entries({ humanidade, vontade, vitalidade, fome })) {
      if (typeof value !== 'number' || value < 0 || value > resourceLimits[key as keyof typeof resourceLimits]) {
        return NextResponse.json({ error: `Valor inválido para ${key}. Deve estar entre 0 e ${resourceLimits[key as keyof typeof resourceLimits]}.` }, { status: 400 })
      }
    }

    // Atualiza apenas os recursos no campo data da ficha usando parâmetros seguros
    await db.execute(sql`
      UPDATE characters
      SET data = data || jsonb_build_object(
        'humanidade', $1,
        'vontade', $2,
        'vitalidade', $3,
        'fome', $4
      ),
      updated_at = NOW()
      WHERE id = $5::uuid
    `, [humanidade, vontade, vitalidade, fome, characterId])

    return NextResponse.json({
      ok: true,
      resources: { humanidade, vontade, vitalidade, fome },
    })
  } catch (error) {
    console.error('Erro ao atualizar recursos:', error)
    return NextResponse.json({ error: 'Não foi possível atualizar os recursos.' }, { status: 500 })
  }
}
