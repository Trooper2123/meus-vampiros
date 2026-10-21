import { beforeEach, expect, it, vi } from 'vitest'
const session = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth0', () => ({ getSessionOrDev: session }))
import { GET } from '@/app/api/discipline-powers/route'
import { disciplinePowerOptions } from '@/lib/vtm-v5/discipline-powers'
import rows from '@/lib/vtm-v5/research-catalog.json'

const request = (query = 'disciplineId=CELERITY&maxLevel=2') => new Request(`http://localhost/api/discipline-powers?${query}`)
beforeEach(() => { vi.clearAllMocks(); session.mockResolvedValue({ user: { sub: 'player' } }) })
it('exige sessão sem expor catálogo para visitante', async () => {
  session.mockResolvedValue(null)
  const result = await GET(request())
  expect(result.status).toBe(401)
  expect(await result.json()).toEqual({ error: 'Não autorizado.' })
})
it.each(['', 'disciplineId=UNKNOWN&maxLevel=2', 'disciplineId=CELERITY&maxLevel=6', 'disciplineId=CELERITY&maxLevel=0', 'disciplineId=CELERITY&maxLevel=1.5', 'disciplineId=CELERITY&maxLevel=2&maxLevel=5', 'disciplineId=CELERITY&disciplineId=POTENCE&maxLevel=2', 'disciplineId=CELERITY&maxLevel=2&characterId=other', 'disciplineId=%27%20OR%201=1&maxLevel=2'])('recusa filtros inválidos/manipulados: %s', async query => {
  expect((await GET(request(query))).status).toBe(400)
})
it.each(['player', 'narrator'])('retorna apenas opções públicas de seleção para %s, sem dados de mesas', async actor => {
  session.mockResolvedValue({ user: { sub: actor } })
  const result = await GET(request())
  expect(result.status).toBe(200)
  expect(result.headers.get('cache-control')).toBe('private, no-store')
  const { powers } = await result.json()
  expect(powers.length).toBeGreaterThan(0)
  for (const power of powers) {
    const source = rows.find(row => row.id === power.id)!
    expect(source).toMatchObject({ disciplineId: 'CELERITY', type: 'Poder', status: 'Publicação' })
    expect(power.level).toBeLessThanOrEqual(2)
    expect(Object.keys(power).sort()).toEqual(['id', 'level', 'power'])
    expect(power.power).toMatchObject({ name: source.name, dicePool: source.pool, opposingPool: source.opposing_pool, additionalNotes: source.notes, source: `${source.source} · p. ${source.printed_page}` })
  }
  expect(JSON.stringify(powers)).not.toContain('source_file')
})
it('não mistura rituais, cerimônias ou conteúdo não publicado com poderes', () => {
  for (const id of ['BLOOD_SORCERY', 'OBLIVION', 'CELERITY']) for (const entry of disciplinePowerOptions(id, 5)) expect(rows.find(row => row.id === entry.id)).toMatchObject({ type: 'Poder', status: 'Publicação', disciplineId: id })
  expect(disciplinePowerOptions('CELERITY', 1).every(entry => entry.level === 1)).toBe(true)
})
it('atualiza os textos ingleses e preserva IDs e referências das fichas existentes', () => {
  const bond = rows.find(row => row.id === 'ANIMALISM:poder:1:20-vtm-v5-vampire-the-masquerade-pdf:245:bond-famulus')!
  expect(bond.effect).toContain('When Blood Bonding an animal')
  expect(bond.cost).toBe('Three Rouse Checks on separate nights to establish the bond; free at character creation. Maintenance blood is negligible.')
  expect(bond).toMatchObject({ source: 'Vampire: The Masquerade — Corebook', printed_page: '245', pdf_page: 247 })
  expect(bond.notes).not.toContain('Sistema (original, trecho)')
  for (const name of ['Fortezza Sindonica', 'Knit the Veil', 'Death Rattle']) {
    expect(rows.find(row => row.name === name)).toMatchObject({ disciplineId: 'OBLIVION', type: 'Cerimônia', status: 'Publicação' })
  }
  const squirm = rows.find(row => row.name === 'Squirm')!
  expect(squirm.status).toBe('Captura enviada')
  expect(disciplinePowerOptions(squirm.disciplineId, 5).some(option => option.id === squirm.id)).toBe(false)
})
it('não expõe falhas internas da sessão', async () => {
  session.mockRejectedValue(new Error('segredo interno'))
  const result = await GET(request())
  expect(result.status).toBe(500)
  expect(await result.text()).not.toContain('segredo interno')
})
