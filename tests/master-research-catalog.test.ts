import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getSession, hasMasterAccess, getMasterResearchCatalog, redirect, notFound } = vi.hoisted(() => { vi.stubEnv('NODE_ENV', 'test'); vi.stubEnv('DATABASE_URL', undefined); return { getSession: vi.fn(), hasMasterAccess: vi.fn(), getMasterResearchCatalog: vi.fn(), redirect: vi.fn((path: string) => { throw new Error(`redirect:${path}`) }), notFound: vi.fn(() => { throw new Error('not-found') }) } })
vi.mock('@/lib/auth0', () => ({ getSessionOrDev: getSession }))
vi.mock('@/lib/campaigns', () => ({ hasMasterAccess }))
vi.mock('@/lib/db', () => ({ getMasterResearchCatalog }))
vi.mock('next/navigation', () => ({ redirect, notFound }))

import MasterResearchPage from '@/app/master/catalogo/page'
import { DISCIPLINE_RESEARCH, SKILL_CATALOG } from '@/lib/vtm-v5/research-catalog'
import { DISCIPLINES } from '@/lib/vtm-v5/disciplines'

describe('catálogo de pesquisa do Narrador', () => {
  beforeEach(() => { vi.clearAllMocks(); getSession.mockResolvedValue({ user: { sub: 'master-1' } }); hasMasterAccess.mockResolvedValue(true); getMasterResearchCatalog.mockResolvedValue({ entries: DISCIPLINE_RESEARCH, skills: SKILL_CATALOG, disciplines: DISCIPLINES }) })

  it('semeia conteúdos e habilidades com identificadores únicos e estáveis', () => {
    const catalog = { entries: DISCIPLINE_RESEARCH, skills: SKILL_CATALOG, disciplines: DISCIPLINES }
    expect(catalog.skills).toHaveLength(27)
    expect(catalog.entries).toHaveLength(372)
    expect(Object.fromEntries(['Poder', 'Ritual', 'Cerimônia', 'Fórmula'].map(type => [type, catalog.entries.filter(entry => entry.type === type).length]))).toEqual({ Poder: 221, Ritual: 102, Cerimônia: 16, Fórmula: 33 })
    expect(new Set(catalog.entries.map(entry => entry.id)).size).toBe(372)
    expect(catalog.entries.every(entry => catalog.disciplines.some(discipline => discipline.id === entry.disciplineId))).toBe(true)
    expect(catalog.entries.every(entry => entry.skillIds.every(id => catalog.skills.some(skill => skill.id === id)))).toBe(true)
  })

  it('exige sessão e papel de Narrador no servidor', async () => {
    getSession.mockResolvedValueOnce(null)
    await expect(MasterResearchPage()).rejects.toThrow('redirect:/auth/login?returnTo=/master/catalogo')
    getSession.mockResolvedValueOnce({ user: { sub: 'player-1' } })
    hasMasterAccess.mockResolvedValueOnce(false)
    await expect(MasterResearchPage()).rejects.toThrow('not-found')
  })

  it('renderiza o acervo para Narradores autorizados', async () => {
    const page = await MasterResearchPage()
    expect(page.type).toBe('main')
    expect(hasMasterAccess).toHaveBeenCalledWith({ sub: 'master-1' })
  })
})
