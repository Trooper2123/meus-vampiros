import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { writeFileSync } from 'node:fs'
import { expect, it, vi } from 'vitest'
vi.mock('next/link', () => ({ default: ({ children, ...props }: Record<string, unknown>) => createElement('a', props, children as string) }))
vi.mock('swr', () => ({ default: () => ({ data: undefined, error: undefined }) }))
vi.mock('@/components/livekit/livekit-room-link', () => ({ LiveKitRoomLink: () => createElement('p', { className: 'session-player-video-hint' }, 'Conecte câmera e microfone para participar.') }))
vi.mock('@/components/game-session/session-soundtrack', () => ({ SessionSoundtrack: ({ compact }: { compact: boolean }) => createElement('section', { 'aria-label': 'Trilha sonora da sessão', className: compact ? 'session-soundtrack-compact' : '' }, createElement('h3', null, 'Trilha sonora da sessão'), createElement('div', null, createElement('p', null, 'Playlist YouTube · Em reprodução'), createElement('label', null, 'Volume pessoal: 45%', createElement('input', { type: 'range', 'aria-label': 'Volume pessoal' })), createElement('div', null, createElement('iframe', { title: 'Player de exemplo', srcDoc: '<body style="background:#181818;color:white;font:16px system-ui;display:grid;place-items:center">Trilha compartilhada</body>' })))) }))
import { SessionPlayerWorkspace } from '@/components/game-session/session-player-workspace'
function render(characters: { id: string; name: string }[]) {
 return renderToStaticMarkup(createElement(SessionPlayerWorkspace, { campaignId: 'campaign', actorId: 'player', sessionId: 'session', campaignName: 'São Paulo depois da meia-noite', characters }))
}
it('prioriza navegação e recursos antes do áudio compacto', () => {
 const html = render([{ id: 'character', name: 'Helena Duarte' }])
 expect(html.indexOf('Seções do Hub')).toBeLessThan(html.indexOf('Trilha sonora da sessão'))
 expect(html.indexOf('Ações rápidas durante a sessão')).toBeLessThan(html.indexOf('Trilha sonora da sessão'))
 expect(html).toContain('session-soundtrack-compact')
 expect(html).toContain('Resumo da Ficha')
 expect(html).toContain('Helena Duarte')
 writeFileSync('/tmp/session-player-preview.html', '<!doctype html><html lang="pt-BR"><meta name="viewport" content="width=device-width, initial-scale=1"><body>'+html+'</body></html>')
})
it('não promete rolagens sem ficha autorizada e apresenta recuperação', () => {
 const html = render([])
 expect(html).toContain('Ver minhas fichas')
 expect(html).toContain('Vincule uma ficha aprovada pelo Narrador')
 expect(html).not.toContain('Recursos e rolagens disponíveis')
 expect(html).not.toContain('Ações rápidas durante a sessão')
})
