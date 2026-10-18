import { beforeEach, describe, expect, it } from 'vitest'
import { createCharacter, duplicateCharacter, getCharacterById, updateCharacter } from '../lib/characters'
import { projectIndependentCharacter } from '@/lib/character-duplicate'
import { calculateSecondaryAttributes } from '@/lib/vtm-v5/secondary-attributes'

describe('fichas independentes e atributos secundários', () => {
  beforeEach(() => { global.__devDb = undefined })

  it('cria e edita Disciplinas livremente sem mesa, mantendo limites e propriedade', async () => {
    const created = await createCharacter('owner', { data: { cla: 'Toreador', disciplinas: [{ name: 'Animalismo', level: 5, powers: [] }] } })
    await updateCharacter(created.id!, 'owner', { data: { disciplinas: [{ name: 'Potência', level: 4, powers: [] }] } })
    expect((await getCharacterById(created.id!, 'owner'))?.data.disciplinas).toEqual([expect.objectContaining({ name: 'Potência', level: 4 })])
    expect(await updateCharacter(created.id!, 'other', { data: { disciplinas: [] } })).toBeNull()
    await expect(updateCharacter(created.id!, 'owner', { data: { disciplinas: [{ name: 'Potência', level: 6 }] } })).rejects.toMatchObject({ status: 422 })
    await expect(updateCharacter(created.id!, 'owner', { data: { disciplinas: [{ name: 'Inventada', level: 1 }] } })).rejects.toMatchObject({ status: 422 })
  })

  it('persiste máximos e Humanidade inicial calculados pelo servidor', async () => {
    const created = await createCharacter('owner', { name: 'Helena', data: { vigor: 3, determinacao: 2, compostura: 4, creationType: 'ANCILLA', humanidade: 10, secondaryAttributes: { healthMax: 99 } } })
    const stored = await getCharacterById(created.id!, 'owner')
    expect(stored).toMatchObject({ campaignId: null, data: { vitalidade: 6, vontade: 6, humanidade: 6, secondaryAttributes: { healthMax: 6, initialHumanity: 6 } } })
  })

  it('atualiza máximos sem recuperar recursos consumidos nem apagar danos', async () => {
    const created = await createCharacter('owner', { name: 'Helena', data: { vigor: 3, determinacao: 2, compostura: 4 } })
    const record = global.__devDb!.characters.find((entry) => entry.id === created.id)!
    record.data = { ...record.data, vitalidade: 0, vontade: 1, humanidade: 4, fome: 4, healthDamage: { aggravated: 2 } }
    record.gameState = { ...record.gameState, hunger: 4, humanity: 4, healthDamage: { superficial: 4, aggravated: 2 }, willpowerDamage: { superficial: 5, aggravated: 0 } }
    await updateCharacter(created.id!, 'owner', { name: 'Helena', data: { vigor: 4, determinacao: 3, compostura: 4, vitalidade: 7, vontade: 7, humanidade: 10, fome: 0, healthDamage: {} } })
    const stored = await getCharacterById(created.id!, 'owner')
    expect(stored?.data).toMatchObject({ vitalidade: 1, vontade: 2, humanidade: 4, fome: 4, healthDamage: { superficial: 4, aggravated: 2 }, secondaryAttributes: { healthMax: 7, willpowerMax: 7 } })
  })

  it('substitui e remove modificadores sem acumular efeitos', () => {
    expect(calculateSecondaryAttributes({ predador: 'Alleycat' }).initialHumanity).toBe(6)
    expect(calculateSecondaryAttributes({ predador: 'Consensualist' }).initialHumanity).toBe(8)
    expect(calculateSecondaryAttributes({ predador: '' }).initialHumanity).toBe(7)
  })

  it('preserva ficha e recursos ao editar somente o nome', async () => {
    const created = await createCharacter('owner', { name: 'Helena', data: { vigor: 3, determinacao: 2, compostura: 4, notas: 'Notas pessoais' } })
    const before = await getCharacterById(created.id!, 'owner')
    await updateCharacter(created.id!, 'owner', { name: 'Novo nome' })
    const after = await getCharacterById(created.id!, 'owner')
    expect(after?.name).toBe('Novo nome')
    expect(after?.data).toEqual(before?.data)
  })

  it('duplica com UUID novo, recursos atuais e original intacto', async () => {
    const created = await createCharacter('owner', { name: 'Helena', data: { vigor: 3, determinacao: 2, compostura: 4, notas: 'Notas pessoais', cla: 'Toreador', disciplinas: [{ name: 'Presença', level: 2, powers: [{ name: 'Fascínio', effect: 'Efeito', privateNotes: 'Segredo' }] }] } })
    const original = global.__devDb!.characters.find((entry) => entry.id === created.id)!
    original.campaignId = global.__devDb!.campaigns[0].id
    original.data = { ...original.data, vontade: 0, vitalidade: 2, fome: 4, masterOverride: true, predatorTypeOverrides: ['Segredo'], narratorNotes: 'Privado', sessionId: 'sessão', pertences: [{ masterComment: 'Privado' }] }
    original.gameState = { ...original.gameState, hunger: 4, healthDamage: { superficial: 4, aggravated: 0 }, willpowerDamage: { superficial: 6, aggravated: 0 } }
    const before = structuredClone(original)
    const copy = await duplicateCharacter(created.id!, 'owner')
    expect(copy?.id).not.toBe(created.id)
    const stored = await getCharacterById(copy!.id!, 'owner')
    expect(stored).toMatchObject({ name: 'Helena — Cópia', campaignId: null, status: 'DRAFT', data: { vontade: 0, vitalidade: 2, fome: 4, notas: 'Notas pessoais' } })
    for (const field of ['masterOverride', 'predatorTypeOverrides', 'narratorNotes', 'sessionId', 'pertences']) expect(stored?.data).not.toHaveProperty(field)
    expect(original).toEqual(before)
    expect(await duplicateCharacter(created.id!, 'other')).toBeNull()
    expect(await getCharacterById(copy!.id!, 'other')).toBeNull()
  })

  it('remove campos privados aninhados e não permite duplicar NPCs', async () => {
    const projected = projectIndependentCharacter({ disciplinas: [{ name: 'Presença', level: 1, privateNotes: 'segredo', powers: [{ name: 'Fascínio', masterComment: 'segredo' }] }], vantagens: [{ name: 'Aliados', level: 2, narratorNotes: 'segredo' }] })
    expect(JSON.stringify(projected)).not.toContain('segredo')
    const created = await createCharacter('owner', { data: { characterType: 'HUMAN_NPC' } })
    expect(await duplicateCharacter(created.id!, 'owner')).toBeNull()
  })
})
