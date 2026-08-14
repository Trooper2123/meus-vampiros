import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'

export type CharacterSummary = {
  id: string
  name: string
  concept: string | null
  clan: string | null
  generation: string | null
  status: string
  updatedAt: string
}

export async function getCharactersForUser(userId: string): Promise<CharacterSummary[]> {
  const result = await db.execute<{
    id: string
    name: string
    concept: string | null
    clan: string | null
    generation: string | null
    status: string
    updated_at: Date
  }>(sql`
    SELECT id, name, concept, clan, generation, status, updated_at
    FROM characters
    WHERE user_id = ${userId}
    ORDER BY updated_at DESC
  `)

  return result.rows.map((character) => ({
    id: character.id,
    name: character.name,
    concept: character.concept,
    clan: character.clan,
    generation: character.generation,
    status: character.status,
    updatedAt: character.updated_at.toISOString(),
  }))
}
