import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, expect, it, vi } from 'vitest'
import { grantedDotOrigins, projectCreationGrants, type CreationGrant } from '@/lib/vtm-v5/creation-grants'
import { GrantOriginLabel } from '@/components/character-summary/grant-origin-label'
import { SummaryMerits } from '@/components/character-summary/summary-merits'
import { devCreateCharacter } from '@/lib/dev-db'
import { getCharacterById } from '@/lib/characters'

const grants: CreationGrant[] = [
  { id: 'discipline', kind: 'DISCIPLINE', origin: 'CLAN', name: 'Presença', dots: 2 },
  { id: 'discipline', kind: 'DISCIPLINE', origin: 'PREDATOR', name: 'Presença', dots: 1 },
  { id: 'merit', kind: 'MERIT', origin: 'PREDATOR', name: 'Aparência', dots: 2 },
]

it('Nosferatu mantém Aparência −2 e ignora bônus manuais ou concedidos sem apagar dados', () => {
  const merits = [{ id: 'merit', name: 'Aparência: Bela', level: 2 }, { name: 'Stunning Looks', level: 4 }, { name: 'Recursos', level: 3 }]
  const html = renderToStaticMarkup(createElement(SummaryMerits, { clan: 'Nosferatu', merits, flaws: [], grants }))
  expect(html).toContain('Aparência: −2')
  expect(html.match(/Bônus de Aparência ignorado/g)).toHaveLength(2)
  expect(html).toContain('Nível 3')
  expect(html).not.toContain('Nível 2')
  expect(merits[0].level).toBe(2)
  expect(renderToStaticMarkup(createElement(SummaryMerits, { clan: 'Toreador', merits, flaws: [], grants }))).toContain('Nível 2')
  expect(renderToStaticMarkup(createElement(SummaryMerits, { clan: 'Nosferatu', merits: [], flaws: [] }))).toContain('Aparência: −2')
})

beforeEach(() => { vi.stubEnv('NODE_ENV', 'test'); vi.stubEnv('DATABASE_URL', ''); global.__devDb = undefined })

it('distingue pontos manuais de concessões somadas sem criar pontos', () => {
  expect(grantedDotOrigins(grants, 'DISCIPLINE', 'discipline', 4)).toEqual([null, 'CLAN', 'CLAN', 'PREDATOR'])
  expect(grantedDotOrigins(grants, 'DISCIPLINE', 'manual', 2)).toEqual([null, null])
  expect(grantedDotOrigins(grants, 'FLAW', 'merit', 2)).toEqual([null, null])
})
it('resumo indica em azul as origens, não apenas cor', () => {
  const html = renderToStaticMarkup(createElement(GrantOriginLabel, { grants, kind: 'DISCIPLINE', id: 'discipline', level: 4 }))
  expect(html).toContain('grant-origin'); expect(html).toContain('2 ponto(s) de clã'); expect(html).toContain('1 ponto(s) de predação')
  expect(renderToStaticMarkup(createElement(GrantOriginLabel, { grants, kind: 'DISCIPLINE', id: 'manual', level: 1 }))).toBe('')
  expect(renderToStaticMarkup(createElement(SummaryMerits, { grants, merits: [{ id: 'merit', name: 'Aparência', level: 2 }], flaws: [] }))).toContain('preenchimento automático')
})
it('projeta somente metadados públicos e não aceita origem declarada nos dados da ficha', async () => {
  const character = devCreateCharacter('owner', { data: { creationGrants: grants } })
  expect((await getCharacterById(character.id, 'owner'))?.creationGrants).toEqual([])
  character.gameState = { ...character.gameState, creationEffects: grants.map(grant => ({ ...grant, baseDots: 1 })) }
  const result = await getCharacterById(character.id, 'owner')
  expect(result?.creationGrants).toEqual(grants)
  expect(result?.creationGrants[0]).not.toHaveProperty('baseDots')
  result!.creationGrants[0].dots = 999
  expect(projectCreationGrants(character.gameState ?? {})[0].dots).toBe(2)
  expect(await getCharacterById(character.id, 'other')).toBeNull()
})
