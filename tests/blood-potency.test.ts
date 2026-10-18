import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { calculateBloodPotencyEffects } from '@/lib/vtm-v5/blood-potency'
import { BloodPotencySummary } from '@/components/character-summary/blood-potency-summary'
import { devCreateCampaign, devCreateCharacter } from '@/lib/dev-db'
import { getCharacterBloodPotencyEffects } from '@/lib/character-blood-potency'
import { createCharacter, updateCharacter } from '@/lib/characters'

const auth = vi.hoisted(() => ({ actor: 'owner' }))
vi.mock('@/lib/auth0', () => ({ getSessionOrDev: () => auth.actor ? { user: { sub: auth.actor } } : null }))
import { GET } from '@/app/api/characters/[id]/blood-potency-effects/route'

describe('Potência do Sangue CORE_V5', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'test'); vi.stubEnv('DATABASE_URL', '')
    global.__devDb = undefined; auth.actor = 'owner'
  })
  it.each([
    [0, null, 1, null, null, 0], [1, 1, 1, null, 1, 1], [2, 1, 2, 1, 1, 1],
    [3, 2, 2, 1, 2, 2], [4, 2, 3, 2, 2, 2], [5, 3, 3, 2, 3, 3],
  ])('calcula linha %s sem mudar estados atuais', (potency, surge, mend, power, reroll, bane) => {
    const data = { 'potencia-de-sangue': potency, fome: 4, healthDamage: { superficial: 2, aggravated: 1 } }
    const previous = structuredClone(data)
    expect(calculateBloodPotencyEffects(data)).toMatchObject({ bloodSurgeDice: surge, superficialMendAmount: mend, disciplinePowerBonusDice: power, disciplineRouseRerollMaxLevel: reroll, baneSeverity: bane })
    expect(data).toEqual(previous)
  })
  it.each([6, 7, 8, 9, 10, -1, 1.5, 11, '', null, false, 'wrong'])('não presume valores para %j', potency => {
    expect(() => calculateBloodPotencyEffects({ 'potencia-de-sangue': potency })).toThrow()
  })
  it('não aceita perfil desconhecido e trata Caitiff/sangue-ralo', () => {
    expect(() => calculateBloodPotencyEffects({ 'potencia-de-sangue': 1 }, 'COMPANION')).toThrow()
    expect(calculateBloodPotencyEffects({ 'potencia-de-sangue': 3, cla: 'Caitiff' }).baneSeverity).toBeNull()
    expect(calculateBloodPotencyEffects({ 'potencia-de-sangue': 0, creationType: 'THIN_BLOOD' }).baneSeverity).toBe(0)
    expect(() => calculateBloodPotencyEffects({ 'potencia-de-sangue': 1, isThinBlood: true })).toThrow()
  })
  it('estrutura restrições cumulativas de alimentação sem executar alimentação', () => {
    expect(calculateBloodPotencyEffects({ 'potencia-de-sangue': 2 }).feedingPenalty.params.animalAndBaggedMultiplier).toBe(0.5)
    expect(calculateBloodPotencyEffects({ 'potencia-de-sangue': 5 }).feedingPenalty.params).toEqual({ animalAndBaggedMultiplier: 0, humanReductionPenalty: 1, minimumHungerWithoutKilling: 2 })
  })
  it('recalcula ao consultar, limita acesso e não grava estado/ledger', async () => {
    const campaign = devCreateCampaign('narrator', { name: 'Mesa', theme: null, principios: null, averageXp: 0, status: 'Ativa', lastSessionAt: null })
    const character = devCreateCharacter('owner', { campaignId: campaign.id, data: { 'potencia-de-sangue': 3, 'surto-de-sangue': 999, fome: 3 } })
    const previous = structuredClone(character)
    const context = { params: Promise.resolve({ id: character.id }) }
    expect((await getCharacterBloodPotencyEffects(character.id, 'owner')).bloodSurgeDice).toBe(2)
    expect((await getCharacterBloodPotencyEffects(character.id, 'narrator')).bloodSurgeDice).toBe(2)
    expect(character).toEqual(previous)
    expect(global.__devDb!.characterLedgerEvents).toHaveLength(0)
    auth.actor = 'other'
    expect((await GET(new Request('http://localhost'), context)).status).toBe(403)
    auth.actor = ''
    expect((await GET(new Request('http://localhost'), context)).status).toBe(401)
    auth.actor = 'owner'
    expect((await GET(new Request('http://localhost'), { params: Promise.resolve({ id: 'invalid' }) })).status).toBe(400)
    character.data['potencia-de-sangue'] = 4
    const response = await GET(new Request('http://localhost'), context)
    expect((await response.json()).superficialMendAmount).toBe(3)
    expect(response.headers.get('cache-control')).toContain('no-store')
    character.campaignId = null
    await expect(getCharacterBloodPotencyEffects(character.id, 'narrator')).rejects.toMatchObject({ status: 403 })
  })
  it('rejeita derivados forjados e conserva danos/Fome ao editar Potência', async () => {
    await expect(createCharacter('owner', { data: { 'potencia-de-sangue': 2, 'bonus-de-poder': 999 } })).rejects.toMatchObject({ status: 422 })
    const character = await createCharacter('owner', { data: { 'potencia-de-sangue': 1 } })
    const stored = global.__devDb!.characters.find(entry => entry.id === character.id)!
    stored.data.fome = 4
    stored.gameState = { ...stored.gameState, hunger: 4, healthDamage: { superficial: 2, aggravated: 1 } }
    const previous = structuredClone(stored.gameState)
    await expect(updateCharacter(stored.id, 'owner', { data: { 'surto-de-sangue': 50 }, expectedRevision: 0 })).rejects.toMatchObject({ status: 422 })
    await updateCharacter(stored.id, 'owner', { data: { 'potencia-de-sangue': 3 }, expectedRevision: 0 })
    expect(stored.gameState.hunger).toBe(previous.hunger)
    expect(stored.gameState.healthDamage).toEqual(previous.healthDamage)
    expect((await getCharacterBloodPotencyEffects(stored.id, 'owner')).bloodSurgeDice).toBe(2)
  })
  it('mostra os seis campos somente leitura e erro de tabela ausente', () => {
    const html = renderToStaticMarkup(createElement(BloodPotencySummary, { draft: { 'potencia-de-sangue': 3 } }))
    expect(html).toContain('Surto de Sangue'); expect(html).toContain('Penalidade de Alimentação')
    expect(html).toContain('Disciplinas até nível 2'); expect(html).not.toContain('<input')
    expect(renderToStaticMarkup(createElement(BloodPotencySummary, { draft: { 'potencia-de-sangue': 6 } }))).toContain('sem tabela verificada')
  })
})
