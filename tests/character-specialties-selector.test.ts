import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { SWRConfig } from 'swr'
import { describe, expect, it } from 'vitest'
import { CharacterSpecialties } from '../components/character-summary/character-specialties'
import { specialtyView } from '../lib/character-specialties'
import type { CommandCharacter } from '../lib/character-commands'

const id = '11111111-1111-4111-8111-111111111111'
const character: CommandCharacter = { id, name: 'Helena', ownerId: 'owner', campaignId: null, masterId: null, characterType: 'PLAYER_VAMPIRE', status: 'DRAFT', data: { 'habilidade-briga': 1, 'habilidade-ciencia': 0 }, gameState: {}, totalXp: 3, spentXp: 0, revision: 0 }

function renderSelector(draftSkills?: Record<string, number>) {
  return renderToStaticMarkup(createElement(SWRConfig, { value: { provider: () => new Map(), fallback: { [`/api/characters/${id}/specialties`]: specialtyView(character, 'owner') }, revalidateOnMount: false } }, createElement(CharacterSpecialties, { characterId: id, draftSkills })))
}

describe('opções renderizadas do seletor de especialidades', () => {
  it('usa somente habilidades elegíveis do estado salvo', () => {
    const html = renderSelector()
    expect(html).toContain('value="briga"')
    expect(html).not.toContain('value="ciencia"')
  })

  it('regera opções e concessões com os pontos em edição sem esperar recarregar', () => {
    const html = renderSelector({ Briga: 0, Ciência: 1 })
    expect(html).not.toContain('value="briga"')
    expect(html).toContain('value="ciencia"')
    expect(html).toContain('skill:ciencia:first-dot')
    expect(html).toContain('serão salvas e validadas')
  })

  it('remove opções sem pontos e informa indisponibilidade', () => {
    const html = renderSelector({ Briga: 0, Ciência: 0 })
    expect(html).toContain('Nenhuma habilidade disponível')
    expect(html).not.toContain('value="briga"')
    expect(html).not.toContain('value="ciencia"')
  })
})
