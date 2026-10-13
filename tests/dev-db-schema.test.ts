import { beforeEach, describe, expect, it } from 'vitest'
import { randomUUID } from 'node:crypto'
import { devAppendCharacterLedgerEvent, devCreateCharacter, devCreatePossession, devDeleteCharacter, devGetCharacterAccessRecord, devGetCharacterById, devGetCharactersForUser } from '@/lib/dev-db'
import { runCharacterCommand } from '@/lib/character-commands'

describe('paridade do provider de memória com o schema de personagens', () => {
  beforeEach(() => { global.__devDb = undefined })

  it('inicializa os defaults de revisão, estado e XP sem compartilhar o payload', () => {
    const data = { disciplinas: [{ name: 'Presença' }] }
    const character = devCreateCharacter('owner', { data })
    expect(character).toMatchObject({ revision: 0, gameState: {}, totalXp: 0, spentXp: 0, campaignId: null })
    data.disciplinas[0].name = 'Alterado'
    expect(character.data.disciplinas).toEqual([{ name: 'Presença' }])
  })

  it('seeds possuem revisão e estado canônico', () => {
    const characters = devGetCharactersForUser('dev|local')
    expect(characters.length).toBeGreaterThan(0)
    for (const character of characters) {
      const record = devGetCharacterAccessRecord(character.id)!
      expect(record.revision).toBe(0)
      expect(record.gameState).toHaveProperty('healthDamage')
      expect(record.gameState).toHaveProperty('condition', 'ACTIVE')
    }
  })

  it('projeta danos, recursos e XP canônicos sem permitir mutação pela leitura', () => {
    const character = devCreateCharacter('owner', { data: { fome: 5, 'experiencia-total': 999 } })
    character.totalXp = 4
    character.gameState = { hunger: 2, healthDamage: { superficial: 1, aggravated: 0 }, willpowerDamage: { superficial: 0, aggravated: 1 } }
    const result = devGetCharacterById(character.id, 'owner')!
    expect(result.data).toMatchObject({ fome: 2, 'experiencia-total': 4, healthDamage: { superficial: 1, aggravated: 0 } })
    ;(result.data.healthDamage as { superficial: number }).superficial = 99
    expect(character.gameState.healthDamage).toEqual({ superficial: 1, aggravated: 0 })
    expect(devGetCharacterById(character.id, 'other')).toBeNull()
  })

  it('rejeita referências a campanhas e fichas inexistentes', () => {
    expect(() => devCreateCharacter('owner', { campaignId: randomUUID() })).toThrow('Campanha inexistente')
    expect(() => devCreatePossession(randomUUID(), { label: 'Item' })).toThrow('Ficha inexistente')
    expect(() => devAppendCharacterLedgerEvent(randomUUID(), 'EVENT', 'TEST', {}, 'owner')).toThrow('Ficha inexistente')
    const character = devCreateCharacter('owner', {})
    expect(() => devCreatePossession(character.id, { label: 'Item', campaignId: randomUUID() })).toThrow('Campanha inexistente')
  })

  it('exclusão respeita proprietário e cascade de itens, ledger e comandos', async () => {
    const character = devCreateCharacter('owner', {})
    devCreatePossession(character.id, { label: 'Item' })
    await runCharacterCommand('owner', character.id, { key: randomUUID(), type: 'TEST', payload: {} }, record => record.ownerId === 'owner', () => ({ ok: true }))
    expect(devDeleteCharacter(character.id, 'other')).toBeNull()
    expect(devDeleteCharacter(character.id, 'owner')).toEqual({ ok: true })
    expect(global.__devDb!.possessions.some(item => item.characterId === character.id)).toBe(false)
    expect(global.__devDb!.characterLedgerEvents.some(event => event.characterId === character.id)).toBe(false)
    expect([...global.__characterCommandMemory!.commands.keys()].some(key => key.startsWith(`${character.id}:`))).toBe(false)
  })
})
