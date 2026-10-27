import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it, vi } from 'vitest'
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))
import { DeleteCharacterButton } from '@/components/delete-character-button'

it('explica a exclusão lógica, exige nome exato e mantém Cancelar como foco inicial', () => {
  const html = renderToStaticMarkup(createElement(DeleteCharacterButton, { characterId: 'ficha', name: 'Helena', revision: 2 }))
  expect(html).toContain('Excluir ficha')
  expect(html).toContain('Excluir Helena?')
  expect(html).toContain('Históricos, notas, mídias e referências serão preservados')
  expect(html).toContain('Digite o nome exato da ficha para confirmar: Helena')
  expect(html).toMatch(/<button[^>]*autofocus=""[^>]*>Cancelar/)
  expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Confirmar exclusão/)
})
