import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { SWRConfig } from 'swr'
import { expect, it } from 'vitest'
import { PlayerPredatorSelector } from '@/components/predator-types/player-predator-selector'
import { applyPredatorEffects } from '@/lib/predator-effects'
import type { CommandCharacter } from '@/lib/character-commands'
import { applyPredatorTypeSelection, PREDATOR_TYPE_BY_CODE, removePredatorTypeSelection, toPlayerPredatorTypeDto, validatePredatorChoices, validatePredatorType } from '@/lib/vtm-v5/predator-types'
import { resolvePredatorChoices } from '@/lib/vtm-v5/predator-types/mechanics'

const definition = PREDATOR_TYPE_BY_CODE.get('ROADSIDE_KILLER')!
const option = (dots: number) => `PREY_EXCLUSION:LOCAL_RESIDENTS:${dots}`

it.each([1, 3, 5])('usa exatamente os %i pontos escolhidos, sem fixar custo na definição', dots => {
  expect(definition.flawsOrCosts).toEqual([])
  expect(resolvePredatorChoices(definition.code, [option(dots)])).toEqual([expect.objectContaining({ kind: 'FLAW', label: 'Exclusão de Presa: moradores locais', dots })])
  expect(validatePredatorChoices(definition, definition.specialtyOptions[0], definition.disciplineOptions[0], [option(dots)])).toEqual([])
})

it.each([[], [option(0)], [option(-1)], [option(6)], [option(1.5)], ['PREY_EXCLUSION:LOCAL_RESIDENTS:NaN'], [option(1), option(2)], ['PREY_EXCLUSION:FORGED:2'], [option(2), 'FORGED:XP:5']].map(choices => ({ choices })))('rejeita ausência, valor inválido ou parâmetro forjado: $choices', ({ choices }) => {
  expect(() => resolvePredatorChoices(definition.code, choices)).toThrow()
  expect(validatePredatorChoices(definition, definition.specialtyOptions[0], definition.disciplineOptions[0], choices)).toContainEqual(expect.objectContaining({ code: 'PREDATOR_OPTIONS_INVALID', blocking: true }))
})

it('mantém a habilitação da fonte pelo Narrador obrigatória', () => {
  const context = { clan: 'Toreador', bloodPotency: 1, isThinBlood: false, enabled: false }
  expect(validatePredatorType(definition, context).issues).toContainEqual(expect.objectContaining({ code: 'PREDATOR_TYPE_DISABLED_FOR_CAMPAIGN', blocking: true }))
  expect(validatePredatorType(definition, { ...context, enabled: true }).valid).toBe(true)
})

it('aplica, troca e remove somente os pontos do defeito de predação', () => {
  const character: CommandCharacter = { id: 'fixture', name: 'Vampiro', ownerId: 'owner', masterId: null, campaignId: null, status: 'DRAFT', characterType: 'PLAYER_VAMPIRE', totalXp: 0, spentXp: 0, revision: 0, data: { cla: 'Toreador', humanidade: 7, disciplinas: [], defeitos: [{ id: 'personal', name: 'Defeito pessoal', level: 1 }], 'habilidade-sobrevivencia': 1 }, gameState: {} }
  for (const dots of [3, 3, 1]) {
    character.data = applyPredatorTypeSelection(character.data, definition, { code: definition.code, specialty: definition.specialtyOptions[0], discipline: definition.disciplineOptions[0], optionCodes: [option(dots)] }).data
    applyPredatorEffects(character)
    expect(character.data.defeitos).toEqual(expect.arrayContaining([expect.objectContaining({ name: 'Exclusão de Presa: moradores locais', level: dots }), expect.objectContaining({ id: 'personal', level: 1 })]))
    expect(character.data.defeitos).toHaveLength(2)
    expect(character.data.creationFlawDots).toBe(dots)
  }
  character.data = removePredatorTypeSelection(character.data)
  applyPredatorEffects(character)
  expect(character.data.defeitos).toEqual([{ id: 'personal', name: 'Defeito pessoal', level: 1 }])
})

it('oferece de 1 a 5 pontos no seletor e informa que a fonte não fixa o valor', () => {
  const characterId = '11111111-1111-4111-8111-111111111111'
  const html = renderToStaticMarkup(createElement(SWRConfig, { value: { provider: () => new Map(), revalidateOnMount: false, fallback: { [`/api/predator-types?characterId=${characterId}`]: { predatorTypes: [toPlayerPredatorTypeDto(definition)], selectedCode: definition.code } } } }, createElement(PlayerPredatorSelector, { characterId, selectedCode: definition.code })))
  expect(html).toContain('A fonte não informa a pontuação. Defina de 1 a 5 pontos.')
  expect(html).toContain('Exclusão de Presa: moradores locais')
  for (const dots of [1, 2, 3, 4, 5]) expect(html).toContain(`<option value="${dots}">${dots} ponto(s)</option>`)
  expect(html).not.toContain('Defina a versão da regra antes de habilitar')
})
