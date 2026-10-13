import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { SWRConfig } from 'swr'
import { describe, expect, it } from 'vitest'
import { CharacterClan } from '@/components/character-summary/character-clan'
import { PlayerPredatorSelector } from '@/components/predator-types/player-predator-selector'
import { CLANS } from '@/lib/vtm-v5/clans'
import { PREDATOR_TYPES, toPlayerPredatorTypeDto } from '@/lib/vtm-v5/predator-types'

const characterId = '11111111-1111-4111-8111-111111111111'

describe('projeções renderizadas dos seletores', () => {
  it('oferece clãs públicos antes de salvar o primeiro rascunho', () => {
    const html = renderToStaticMarkup(createElement(CharacterClan, { characterId: null, onBeforeSubmit: async () => characterId, onChange: () => {} }))
    expect(html).toContain('value="BRUJAH"')
    expect(html).toContain('value="THIN_BLOOD"')
    expect(html).not.toContain('Revise os gatilhos')
  })
  it('respeita clãs habilitados no seletor da ficha vinculada', () => {
    const html = renderToStaticMarkup(createElement(SWRConfig, { value: { provider: () => new Map(), revalidateOnMount: false, fallback: { [`/api/characters/${characterId}/clan`]: { revision: 0, selection: null, clans: CLANS, enabledClanCodes: ['BRUJAH'] } } } }, createElement(CharacterClan, { characterId, onBeforeSubmit: async () => characterId, onChange: () => {} })))
    expect(html).toContain('value="BRUJAH"')
    expect(html).not.toContain('value="VENTRUE"')
  })
  it('exibe catálogo público e disciplinas, sem orientações privadas', () => {
    const clans = CLANS.map(({ code, name, disciplines, bane, compulsion }) => ({ code, name, disciplines, bane, compulsion }))
    const html = renderToStaticMarkup(createElement(SWRConfig, { value: { provider: () => new Map(), revalidateOnMount: false, fallback: { [`/api/characters/${characterId}/clan`]: { revision: 0, selection: null, clans } } } }, createElement(CharacterClan, { characterId, onBeforeSubmit: async () => characterId, onChange: () => {} })))
    expect(html).toContain('Disciplina com 2 pontos')
    expect(html).toContain('value="CAITIFF"')
    expect(html).toContain('value="THIN_BLOOD"')
    expect(html).not.toContain('LASOMBRA')
    expect(html).not.toContain('Revise os gatilhos')
  })
  it.each(['OSIRIS', 'BLOOD_LEECH', 'SCENE_QUEEN', 'ONLINE_PREDATOR', 'PAY_FOR_BLOOD'])('exibe escolhas adicionais para %s', code => {
    const predatorTypes = PREDATOR_TYPES.map(entry => toPlayerPredatorTypeDto(entry))
    const html = renderToStaticMarkup(createElement(SWRConfig, { value: { provider: () => new Map(), revalidateOnMount: false, fallback: { [`/api/predator-types?characterId=${characterId}`]: { predatorTypes, selectedCode: code } } } }, createElement(PlayerPredatorSelector, { characterId, selectedCode: code })))
    expect(html).toContain('Escolhas adicionais: distribua')
    expect(html).toContain('Não selecionar')
    expect(html).not.toContain('commonRisks')
  })
})
