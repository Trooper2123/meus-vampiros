import { createElement, type ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it, vi } from 'vitest'
import { CharacterRolls } from '@/components/character-summary/character-rolls'

vi.mock('swr', () => ({ default: () => ({ data: { attributes: { forca: 2 }, skills: { briga: 1 }, specialties: [], canUseSpecialties: false, canRollSecret: false, status: 'APPROVED', revision: 3 }, mutate: vi.fn() }) }))
vi.mock('react', async original => ({ ...await original<typeof import('react')>(), useId: () => 'roll', useState: (value: unknown) => [value, vi.fn()], useRef: (value: unknown) => ({ current: value }) }))

it('rola sem pedir motivo e preserva contexto no comando', async () => {
  const fetchMock = vi.fn().mockResolvedValue(Response.json({ ok: true }))
  vi.stubGlobal('fetch', fetchMock)
  try {
    const html = renderToStaticMarkup(createElement(CharacterRolls, { characterId: 'character' }))
    expect(html).not.toContain('Motivo da rolagem')
    expect(html).not.toContain('<textarea')
    expect(html).not.toMatch(/<button[^>]*disabled[^>]*>Rolar dados/)
    const panel = CharacterRolls({ characterId: 'character' })
    const tree = (panel.type as (props: { characterId: string }) => ReactElement<{ children: (ReactElement<{ onSubmit: (event: { preventDefault: () => void }) => void }> | false)[] }>)(panel.props)
    const form = tree.props.children.find((child: ReactElement | false) => child && child.type === 'form')
    if (!form) throw new Error('Formulário ausente')
    form.props.onSubmit({ preventDefault: vi.fn() })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ attribute: 'forca', skillId: 'briga', reason: 'Teste de Força + Briga.', expectedRevision: 3, visibility: 'PUBLIC' })
    await Promise.resolve()
  } finally { vi.unstubAllGlobals() }
})
