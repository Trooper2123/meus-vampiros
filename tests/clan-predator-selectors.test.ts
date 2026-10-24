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
    expect(html).toContain('>Brujah</strong>')
    expect(html).toContain('>Sangue-ralo</strong>')
    expect(html).not.toContain('Revise os gatilhos')
  })
  it('respeita clãs habilitados no seletor da ficha vinculada', () => {
    const html = renderToStaticMarkup(createElement(SWRConfig, { value: { provider: () => new Map(), revalidateOnMount: false, fallback: { [`/api/characters/${characterId}/clan`]: { revision: 0, selection: null, clans: CLANS, enabledClanCodes: ['BRUJAH'] } } } }, createElement(CharacterClan, { characterId, onBeforeSubmit: async () => characterId, onChange: () => {} })))
    expect(html).toContain('>Brujah</strong>')
    expect(html).not.toContain('>Ventrue</strong>')
  })
  it('exibe catálogo público e disciplinas, sem orientações privadas', () => {
    const clans = CLANS.map(({ code, name, disciplines, bane, compulsion }) => ({ code, name, disciplines, bane, compulsion }))
    const html = renderToStaticMarkup(createElement(SWRConfig, { value: { provider: () => new Map(), revalidateOnMount: false, fallback: { [`/api/characters/${characterId}/clan`]: { revision: 0, selection: null, clans } } } }, createElement(CharacterClan, { characterId, onBeforeSubmit: async () => characterId, onChange: () => {} })))
    expect(html).toContain('Disciplina com 2 pontos')
    expect(html).toContain('>Caitiff</strong>')
    expect(html).toContain('>Sangue-ralo</strong>')
    expect(html).not.toContain('LASOMBRA')
    expect(html).not.toContain('Revise os gatilhos')
  })
  it.each(['OSIRIS', 'BLOOD_LEECH', 'SCENE_QUEEN', 'ONLINE_PREDATOR', 'PAY_FOR_BLOOD', 'EXTORTIONIST', 'TITHE_COLLECTOR'])('exibe escolhas adicionais para %s', code => {
    const predatorTypes = PREDATOR_TYPES.map(entry => toPlayerPredatorTypeDto(entry))
    const html = renderToStaticMarkup(createElement(SWRConfig, { value: { provider: () => new Map(), revalidateOnMount: false, fallback: { [`/api/predator-types?characterId=${characterId}`]: { predatorTypes, selectedCode: code } } } }, createElement(PlayerPredatorSelector, { characterId, selectedCode: code })))
    expect(html).toContain('Escolhas adicionais: distribua')
    expect(html).toContain('Não selecionar')
    expect(html).toContain('aria-expanded="false"')
    expect(html).toContain('hidden=""')
    expect(html).toContain('Alterar escolha')
    expect(html).toContain('Confirmar escolha')
    expect(html).toContain('A confirmação salva automaticamente')
    expect(html.indexOf('Escolhas adicionais: distribua')).toBeLessThan(html.indexOf('Confirmar escolha'))
    expect(html).not.toContain('commonRisks')
  })
  it('mantém catálogo aberto antes da primeira seleção', () => {
    const html = renderToStaticMarkup(createElement(PlayerPredatorSelector, { characterId: null }))
    expect(html).toContain('id="predator-selector-title"')
    expect(html).not.toContain('hidden=""')
    expect(html).not.toContain('Confirmar escolha')
  })
  it('restaura a Disciplina da predação por identidade e explica a escolha fora do clã', () => {
    const entry = PREDATOR_TYPES.find(type => type.code === 'CONFIDANT')!
    const html = renderToStaticMarkup(createElement(SWRConfig, { value: { provider: () => new Map(), revalidateOnMount: false, fallback: { [`/api/predator-types?characterId=${characterId}`]: { predatorTypes: [toPlayerPredatorTypeDto(entry)], selectedCode: entry.code, selection: { code: entry.code, specialty: entry.specialtyOptions[0], discipline: 'Presença', optionCodes: [] } } } } }, createElement(PlayerPredatorSelector, { characterId })))
    expect(html).toContain('<option selected="">Presence</option>')
    expect(html).toContain('A Disciplina concedida pela predação não precisa pertencer ao clã.')
    expect(html).not.toMatch(/disabled=""[^>]*>Confirmar escolha/)
  })
  it('identifica fontes, referências e consulta bloqueada sem permitir confirmação', () => {
    const entry = PREDATOR_TYPES.find(type => type.code === 'ROADSIDE_KILLER')!
    const predatorTypes = [toPlayerPredatorTypeDto(entry, [{ code: 'PREDATOR_RULESET_UNSUPPORTED', message: 'Pontuação do defeito pendente.', blocking: true }], false)]
    const html = renderToStaticMarkup(createElement(SWRConfig, { value: { provider: () => new Map(), revalidateOnMount: false, fallback: { [`/api/predator-types?characterId=${characterId}`]: { predatorTypes, selectedCode: entry.code } } } }, createElement(PlayerPredatorSelector, { characterId, selectedCode: entry.code })))
    expect(html).toContain('Guia comunitário de Bully (2021)')
    expect(html).toContain('Sabbat (versão alternativa)')
    expect(html).toContain('Live from the Succubus Club')
    expect(html).toContain('Pontuação do defeito pendente.')
    expect(html).toMatch(/disabled=""[^>]*>Confirmar escolha/)
  })
})
