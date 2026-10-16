import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it, vi } from 'vitest'
import CharacterFormClient from '@/app/characters/character-form-client'
import { CampaignCreationGate } from '@/components/campaign-creation-gate'

vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(), useRouter: () => ({ push: vi.fn() }) }))
it('pergunta sobre mesa antes dos campos e ações de ficha', () => {
  const html = renderToStaticMarkup(createElement(CharacterFormClient, {}))
  expect(html).toContain('Você já tem uma mesa para se juntar?')
  expect(html).toContain('Não, criar ficha independente')
  expect(html).toContain('Sim, tenho convite do Narrador')
  expect(html).not.toContain('name="nome"')
  expect(html).not.toContain('Salvar rascunho')
  expect(html).not.toContain('Validar ficha')
})
it('renderizar a pergunta não concede aceite ou chama criação', () => {
  const onReady = vi.fn()
  renderToStaticMarkup(createElement(CampaignCreationGate, { onReady }))
  expect(onReady).not.toHaveBeenCalled()
})
