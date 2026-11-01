import { createHash } from 'node:crypto'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it, vi } from 'vitest'
import CharacterFormClient from '@/app/characters/character-form-client'

const state = vi.hoisted(() => ({ tab: 'atributos', characterType: 'PLAYER_VAMPIRE' }))
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams('entryMode=ASSISTED'), useRouter: () => ({ push: vi.fn() }) }))
vi.mock('react', async importOriginal => {
  const original = await importOriginal<typeof import('react')>()
  return { ...original, useState: (initial: unknown) => original.useState(initial === 'UNDECIDED' ? null : initial === 'identidade' ? state.tab : initial === 'PLAYER_VAMPIRE' ? state.characterType : initial) }
})

it.each(['PLAYER_VAMPIRE', 'HUMAN_NPC', 'VAMPIRE_NPC', 'RETAINER'].flatMap(characterType => ['atributos', 'habilidades', 'disciplinas', 'recursos', 'historico'].map(tab => ({ characterType, tab }))))('preserva HTML completo em $tab para $characterType', ({ tab, characterType }) => {
  state.tab = tab
  state.characterType = characterType
  const html = renderToStaticMarkup(createElement(CharacterFormClient, {}))
  expect(createHash('sha256').update(html).digest('hex')).toMatchSnapshot()
})
