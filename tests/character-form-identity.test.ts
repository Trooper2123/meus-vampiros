import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, expect, it, vi } from 'vitest'
import CharacterFormClient from '@/app/characters/character-form-client'
import { SWRConfig } from 'swr'

const state = vi.hoisted(() => ({ tab: 'identidade', characterType: 'PLAYER_VAMPIRE', creationType: 'FLEDGLING' }))
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(), useRouter: () => ({ push: vi.fn() }) }))
vi.mock('react', async importOriginal => {
  const original = await importOriginal<typeof import('react')>()
  return { ...original, useState: (initial: unknown) => original.useState(initial === 'UNDECIDED' ? null : initial === 'identidade' ? state.tab : initial === 'PLAYER_VAMPIRE' ? state.characterType : initial === 'FLEDGLING' ? state.creationType : initial) }
})

beforeEach(() => { state.tab = 'identidade'; state.characterType = 'PLAYER_VAMPIRE'; state.creationType = 'FLEDGLING' })

it.each([['create', null, false], ['edit', null, true], ['edit', 'mesa', false]] as const)('vínculo no início somente no editor independente (%s, %s)', (mode, campaignId, expected) => {
  const id = '11111111-1111-4111-8111-111111111111'
  const html = renderToStaticMarkup(createElement(SWRConfig, { value: { provider: () => new Map(), revalidateOnMount: false, fallback: { [`/api/characters?id=${id}`]: { character: { id, campaignId, data: {}, revision: 0, characterType: 'PLAYER_VAMPIRE', status: 'DRAFT' } } } } }, createElement(CharacterFormClient, { initialCharacterId: id, mode })))
  expect(html.includes('Incluir vínculo de mesa')).toBe(expected)
  if (expected) expect(html.indexOf('Incluir vínculo de mesa')).toBeLessThan(html.indexOf('Seções da ficha'))
  expect(html).not.toContain('ID da mesa')
  expect(html).not.toContain('value="HUMAN_NPC"')
  expect(html).not.toContain('value="VAMPIRE_NPC"')
})

it('disciplinas inicia com um campo vazio e botão para adicionar outras', () => {
  state.tab = 'disciplinas'
  const html = renderToStaticMarkup(createElement(CharacterFormClient, {}))
  expect(html.match(/name="disciplina-\d+-nome"/g)).toHaveLength(1)
  expect(html).toContain('Adicionar disciplina')
  expect(html).not.toContain('distribua os 3 pontos iniciais')
})
it.each(['FLEDGLING', 'NEONATE', 'ANCILLA', 'THIN_BLOOD'])('mantém distribuição livre sem mesa no perfil %s', profile => {
  state.tab = 'disciplinas'; state.creationType = profile
  const html = renderToStaticMarkup(createElement(CharacterFormClient, {}))
  expect(html).not.toContain('2 em uma e 1 em outra')
  expect(html).not.toContain('não distribua os três pontos')
})

it('mantém as orientações obrigatórias para ficha vinculada', () => {
  state.tab = 'disciplinas'
  const id = '11111111-1111-4111-8111-111111111111'
  const html = renderToStaticMarkup(createElement(SWRConfig, { value: { provider: () => new Map(), revalidateOnMount: false, fallback: { [`/api/characters?id=${id}`]: { character: { id, campaignId: 'mesa', data: {}, revision: 0, characterType: 'PLAYER_VAMPIRE', status: 'DRAFT' } } } } }, createElement(CharacterFormClient, { initialCharacterId: id, mode: 'edit' })))
  expect(html).toContain('2 em uma e 1 em outra')
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
  expect(html).toContain('Como deseja preencher a ficha?')
  expect(html.indexOf('Como deseja preencher a ficha?')).toBeLessThan(html.indexOf('role="tablist"'))
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

it('identifica como histórico o XP já importado', () => {
  const id = '11111111-1111-4111-8111-111111111111'
  const html = renderToStaticMarkup(createElement(SWRConfig, { value: { provider: () => new Map(), revalidateOnMount: false, fallback: { [`/api/characters?id=${id}`]: { character: { id, campaignId: null, data: { historicalXpImported: true, 'experiencia-total': 50, 'experiencia-gasta': 47 }, revision: 1, characterType: 'PLAYER_VAMPIRE', status: 'DRAFT' } } } } }, createElement(CharacterFormClient, { initialCharacterId: id, mode: 'edit' })))
  expect(html).toContain('aria-label="Experiência histórica"')
  expect(html).toContain('XP histórico disponível')
})
