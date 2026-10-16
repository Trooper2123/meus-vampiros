import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, expect, it, vi } from 'vitest'
import CharacterFormClient from '@/app/characters/character-form-client'

const state = vi.hoisted(() => ({ tab: 'identidade', characterType: 'PLAYER_VAMPIRE', creationType: 'FLEDGLING' }))
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(), useRouter: () => ({ push: vi.fn() }) }))
vi.mock('react', async importOriginal => {
  const original = await importOriginal<typeof import('react')>()
  return { ...original, useState: (initial: unknown) => original.useState(initial === 'UNDECIDED' ? null : initial === 'identidade' ? state.tab : initial === 'PLAYER_VAMPIRE' ? state.characterType : initial === 'FLEDGLING' ? state.creationType : initial) }
})

beforeEach(() => { state.tab = 'identidade'; state.characterType = 'PLAYER_VAMPIRE'; state.creationType = 'FLEDGLING' })

it('disciplinas inicia com um campo vazio e botão para adicionar outras', () => {
  state.tab = 'disciplinas'
  const html = renderToStaticMarkup(createElement(CharacterFormClient, {}))
  expect(html.match(/name="disciplina-\d+-nome"/g)).toHaveLength(1)
  expect(html).toContain('Adicionar disciplina')
  expect(html).toContain('distribua os 3 pontos iniciais')
})
it.each(['FLEDGLING', 'NEONATE', 'ANCILLA', 'THIN_BLOOD'])('orienta distribuição conforme perfil %s', profile => {
  state.tab = 'disciplinas'; state.creationType = profile
  const html = renderToStaticMarkup(createElement(CharacterFormClient, {}))
  expect(html).toContain(profile === 'THIN_BLOOD' ? 'não distribua os três pontos' : '2 em uma e 1 em outra')
})
it.each(['HUMAN_NPC', 'VAMPIRE_NPC', 'RETAINER'])('não impõe pacote de jogador para %s', profile => {
  state.tab = 'disciplinas'; state.characterType = profile
  const html = renderToStaticMarkup(createElement(CharacterFormClient, {}))
  expect(html).toContain(profile === 'RETAINER' ? 'Valores acima de 1 exigem regra especial' : 'validação existente não exige')
})

it.each(['identidade', 'atributos', 'habilidades', 'disciplinas', 'recursos', 'vantagens', 'historico'])('oferece uma única validação na etapa %s', tab => {
  state.tab = tab
  const html = renderToStaticMarkup(createElement(CharacterFormClient, {}))
  expect(html.match(/Validar ficha/g)).toHaveLength(1)
  expect(html).toContain('type="button"')
})

it('identidade não duplica entradas de clã/predação nem permite editar XP', () => {
  const html = renderToStaticMarkup(createElement(CharacterFormClient, {}))
  expect(html).not.toContain('name="cla"')
  expect(html).not.toContain('name="predador"')
  expect(html).not.toContain('name="experiencia-total"')
  expect(html).toContain('Experiência calculada')
  expect(html).toContain('name="geracao"')
  expect(html).toContain('name="sire"')
  expect(html.match(/name="nome"/g)).toHaveLength(1)
  expect(html.match(/name="sire"/g)).toHaveLength(1)
  expect(html.indexOf('name="nome"')).toBeLessThan(html.indexOf('Classificação da ficha'))
  expect(html.indexOf('name="sire"')).toBeLessThan(html.indexOf('Classificação da ficha'))
  expect(html).not.toContain('name="surto-de-sangue"')
  expect(html).toContain('Efeitos calculados da Potência do Sangue')
})
