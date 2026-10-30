import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it, vi } from 'vitest'
import { SWRConfig } from 'swr'
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))
import { SessionReveals } from '@/components/npcs/npc-session-panel'
import { SheetMediaPanel } from '@/components/sheet-media-panel'
import { CampaignArchiveControl } from '@/components/campaign-archive-control'
import { MasterPanel } from '@/components/master-panel'

function render(element: React.ReactElement, fallback: Record<string, unknown> = {}) {
  return renderToStaticMarkup(createElement(SWRConfig, { value: { provider: () => new Map(), revalidateOnMount: false, fallback } }, element))
}
it('galeria da nota explica ACL herdada sem retrato ou seletor de visibilidade independente', () => {
  const html = render(<SheetMediaPanel subjectType="NOTE" subjectId="note" />, { '/api/sheet-media?subjectType=NOTE&subjectId=note': { media: [], portrait: null, canEdit: true, storageConfigured: true } })
  expect(html).toContain('As imagens seguem quem pode ler esta anotação')
  expect(html).toContain('type="file"')
  expect(html).not.toContain('Sem retrato')
  expect(html).not.toContain('<select')
  expect(html).not.toContain('Usar como retrato')
})
it('Narrador prepara revelação oculta e jogador não recebe ações de gestão', () => {
  const endpoint = '/api/sessions/session/reveals'
  const master = render(<SessionReveals sessionId="session" active />, { [endpoint]: { canManage: true, reveals: [] } })
  expect(master).toContain('Salvar como não revelado')
  expect(master).toContain('Texto da revelação')
  const player = render(<SessionReveals sessionId="session" active />, { [endpoint]: { canManage: false, reveals: [] } })
  expect(player).not.toContain('Salvar como não revelado')
  expect(player).not.toContain('<form')
})
it('arquivar ou restaurar exige confirmação e não oferece exclusão definitiva', () => {
  const html = render(<CampaignArchiveControl id="mesa" name="Crônica" archived={false} />)
  expect(html).toContain('Digite o nome da mesa para confirmar')
  expect(html).toContain('Confirmar arquivamento')
  expect(html).toContain('disabled')
  expect(html).not.toContain('Excluir definitivamente')
  expect(render(<CampaignArchiveControl id="mesa" name="Crônica" archived />)).toContain('Restaurar mesa')
})
it('revalidação da API mantém mesas arquivadas fora da listagem principal', () => {
  const campaigns = [{ id: 'ativa', name: 'Mesa atual', status: 'Ativa', playerCount: 0 }, { id: 'arquivo', name: 'Mesa histórica', status: 'Arquivada', playerCount: 0 }]
  const fallback = { '/api/campaigns': { campaigns } }
  expect(render(<MasterPanel initialCampaigns={[]} />, fallback)).not.toContain('Mesa histórica')
  expect(render(<MasterPanel initialCampaigns={[]} archived />, fallback)).not.toContain('Mesa atual')
  expect(render(<MasterPanel initialCampaigns={[]} archived />, fallback)).toContain('Mesa histórica')
})
