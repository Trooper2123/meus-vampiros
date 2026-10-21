import { beforeEach, expect, it, vi } from 'vitest'
const session = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth0', () => ({ getSessionOrDev: session }))
import { GET } from '@/app/api/merits-flaws/route'
import catalog from '@/lib/vtm-v5/merits-flaws-catalog.json'

const request = (query = 'kind=MERIT') => new Request(`http://localhost/api/merits-flaws?${query}`)
beforeEach(() => { vi.clearAllMocks(); session.mockResolvedValue({ user: { sub: 'player' } }) })
it('exige autenticação e não retorna referências ao visitante', async () => {
  session.mockResolvedValue(null)
  const response = await GET(request())
  expect(response.status).toBe(401)
  expect(await response.json()).toEqual({ error: 'Não autorizado.' })
})
it.each(['', 'kind=UNKNOWN', 'kind=MERIT&kind=FLAW', 'kind=MERIT&characterId=other', "kind=' OR 1=1"])('rejeita filtros inválidos ou forjados: %s', async query => {
  expect((await GET(request(query))).status).toBe(400)
})
it.each(['MERIT', 'FLAW'])('projeta todas as opções de %s com pontuação e fontes, sem expor metadados internos', async kind => {
  const response = await GET(request(`kind=${kind}`))
  expect(response.status).toBe(200)
  expect(response.headers.get('cache-control')).toBe('private, no-store')
  const { options } = await response.json()
  expect(options).toHaveLength(catalog.entries.filter(entry => (entry.type.en === 'Flaw' ? 'FLAW' : 'MERIT') === kind).length)
  for (const option of options) {
    const entry = catalog.entries.find(entry => entry.id === option.id)!
    expect(option).toMatchObject({ name: entry.name.pt, originalName: entry.name.en, rating: entry.rating_label.pt, selectable: entry.selectable })
    expect(Number.isSafeInteger(option.level)).toBe(true)
    if (typeof entry.dots === 'number') expect(option.level).toBe(entry.dots)
    expect(option.description).toContain(entry.source.title)
    expect(option.description).toContain(entry.restriction.pt)
    expect(option).not.toHaveProperty('automation')
    expect(option).not.toHaveProperty('requires')
  }
})
it('mantém escolhas especiais sem pontos e frameworks somente para consulta', async () => {
  const { options } = await (await GET(request())).json()
  expect(options.some((option: { level: number }) => option.level === 0)).toBe(true)
  expect(options.filter((option: { selectable: boolean }) => !option.selectable).length).toBeGreaterThan(0)
  expect(options.find((option: { id: string }) => option.id === '20_library_1+')).toMatchObject({ level: 1, rating: '1+' })
})
it('não expõe falhas internas da sessão', async () => {
  session.mockRejectedValue(new Error('private-secret'))
  const response = await GET(request())
  expect(response.status).toBe(500)
  expect(await response.text()).not.toContain('private-secret')
})
