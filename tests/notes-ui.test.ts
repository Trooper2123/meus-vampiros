import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NotesBacklinks, NotesPanel } from '@/components/notes/notes-panel'

const auth = vi.hoisted(() => ({ useUser: vi.fn() }))
vi.mock('@auth0/nextjs-auth0/client', () => auth)

describe('interface de anotações', () => {
  beforeEach(() => auth.useUser.mockReturnValue({ user: null, isLoading: false }))
  it('renderiza editor mínimo dev com controles privados por padrão', () => {
    const html = renderToStaticMarkup(createElement(NotesPanel, { actorId: 'dev|local' }))
    expect(html).toContain('Privadas por padrão')
    expect(html).toContain('Somente eu')
    expect(html).toContain('<textarea')
    expect(html).not.toContain('Exclusiva do Narrador')
  })
  it('não mantém editor de outro perfil após encerramento da sessão', () => {
    const html = renderToStaticMarkup(createElement(NotesPanel, { actorId: 'auth0|old-user' }))
    expect(html).toContain('Sua sessão mudou')
    expect(html).not.toContain('textarea')
  })
  it('backlink aponta para consulta inversa, sem incorporar conteúdo privado', () => {
    const html = renderToStaticMarkup(createElement(NotesBacklinks, { targetType: 'NPC', targetId: '11111111-1111-4111-8111-111111111111' }))
    expect(html).toContain('/notes?targetType=NPC')
    expect(html).toContain('Consultar vínculos autorizados')
    expect(html).not.toContain('textarea')
  })
  it('descarta também o editor dev quando inicia outra identidade Auth0', () => {
    auth.useUser.mockReturnValue({ user: { sub: 'auth0|other' }, isLoading: false })
    const html = renderToStaticMarkup(createElement(NotesPanel, { actorId: 'dev|local' }))
    expect(html).toContain('Sua sessão mudou')
    expect(html).not.toContain('textarea')
  })
})
