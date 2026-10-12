import { beforeEach, describe, expect, it } from 'vitest'
import { createCharacter } from '../lib/characters'

describe('ledger de fichas', () => {
  beforeEach(() => {
    global.__devDb = undefined
  })

  it('registra os ajustes iniciais com origem e timestamp', async () => {
    const character = await createCharacter('auth0|jogador', {
      name: 'Helena',
      data: { characterType: 'PLAYER_VAMPIRE', creationType: 'ANCILLA' },
    })

    const event = global.__devDb?.characterLedgerEvents.find((entry) => entry.characterId === character.id)
    expect(event).toMatchObject({
      eventType: 'INITIAL_ADJUSTMENT',
      origin: 'RULE_ENGINE',
      createdByUserId: 'auth0|jogador',
      payload: { creationType: 'ANCILLA', initialXp: 35, humanity: 6, bloodPotencyModifier: 1 },
    })
    expect(event?.createdAt).toBeInstanceOf(Date)
  })
})
