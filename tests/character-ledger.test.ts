import { beforeEach, describe, expect, it } from 'vitest'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { preparePostgresTest } from './postgres-test-helpers'
import { createCharacter } from '../lib/characters'

describe('ledger de fichas', () => {
  beforeEach(preparePostgresTest)

  it('registra os ajustes iniciais com origem e timestamp', async () => {
    const character = await createCharacter('auth0|jogador', {
      name: 'Helena',
      data: { characterType: 'PLAYER_VAMPIRE', creationType: 'ANCILLA' },
    })

    const event = (await db.execute(sql`SELECT event_type AS "eventType", origin, created_by_user_id AS "createdByUserId", payload, created_at AS "createdAt" FROM character_ledger_events WHERE character_id=${character.id}::uuid`)).rows[0] as Record<string, any> | undefined
    expect(event).toMatchObject({
      eventType: 'INITIAL_ADJUSTMENT',
      origin: 'RULE_ENGINE',
      createdByUserId: 'auth0|jogador',
      payload: { creationType: 'ANCILLA', initialXp: 35, humanity: 6, bloodPotencyModifier: 1 },
    })
    expect(Number.isFinite(new Date(event?.createdAt as string).getTime())).toBe(true)
  })
})
