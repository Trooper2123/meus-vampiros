import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { NarratorVirtualShield } from '@/components/game-session/narrator-virtual-shield'

it('não renderiza o escudo quando fechado', () => {
  expect(renderToStaticMarkup(createElement(NarratorVirtualShield, { open: false, onClose: () => {} }))).toBe('')
})

it('mostra referências, botão de fechamento e navegação acessível ao narrador', () => {
  const html = renderToStaticMarkup(createElement(NarratorVirtualShield, { open: true, onClose: () => {} }))
  expect(html).toContain('Escudo do Narrador')
  expect(html).toContain('Somente Narrador')
  expect(html).toContain('Fechar escudo')
  expect(html).toContain('Referências do escudo')
  for (const name of ['Dificuldades', 'Fome', 'Frenesi', 'Humanidade', 'Combate', 'Experiência']) {
    expect(html).toContain(name)
  }
  expect(html).toContain('Resumo de apoio')
})
