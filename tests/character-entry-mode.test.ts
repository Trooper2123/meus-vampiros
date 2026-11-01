import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { ReactElement, ReactNode } from 'react'

type SavedCharacter = { id: string; name: string; campaignId: string | null; revision: number; characterType: string; status: string; data: Record<string, unknown> }
const harness = vi.hoisted(() => ({ states: [] as unknown[], index: 0, effects: [] as (() => void)[], query: 'entryMode=ASSISTED', tab: 'atributos', bypassCampaign: true, character: undefined as SavedCharacter | undefined, mutate: vi.fn() }))
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(harness.query), useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/components/archive-header', () => ({ ArchiveHeader: () => null }))
vi.mock('react', async original => ({
  ...await original<typeof import('react')>(),
  useEffect: (effect: () => void) => { harness.effects.push(effect) },
  useRef: () => ({ current: null }),
  useState: (initial: unknown) => {
    const index = harness.index++
    if (!(index in harness.states)) harness.states[index] = initial === 'UNDECIDED' && harness.bypassCampaign ? null : initial === 'identidade' ? harness.tab : typeof initial === 'function' ? initial() : initial
    return [harness.states[index], (value: unknown) => { harness.states[index] = typeof value === 'function' ? value(harness.states[index]) : value }]
  },
}))
vi.mock('swr', () => ({ default: (url: string | null) => ({ data: url?.startsWith('/api/characters?') ? { character: harness.character } : undefined, mutate: harness.mutate }), useSWRConfig: () => ({ mutate: harness.mutate }) }))
import CharacterFormClient from '@/app/characters/character-form-client'
import { CharacterEntryModeDialog } from '@/components/character-creation-dialog'
import { CampaignCreationGate } from '@/components/campaign-creation-gate'
import { AttributesStep } from '@/components/character-form/attributes-step'
import { SkillsStep } from '@/components/character-form/skills-step'

type Element = ReactElement<Record<string, unknown>>
function elements(node: ReactNode): Element[] {
  if (Array.isArray(node)) return node.flatMap(elements)
  if (!node || typeof node !== 'object' || !('props' in node)) return []
  const element = node as Element
  return [element, ...elements(element.props.children as ReactNode)]
}
function render(edit = false) {
  harness.index = 0; harness.effects = []
  return elements(CharacterFormClient(edit ? { mode: 'edit', initialCharacterId: 'saved' } : {}))
}
beforeEach(() => {
  harness.states = []; harness.query = 'entryMode=ASSISTED'; harness.tab = 'atributos'; harness.character = undefined; harness.bypassCampaign = true
  harness.mutate.mockReset().mockResolvedValue(undefined)
  vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => Response.json({ id: 'created' })))
})
afterEach(() => vi.unstubAllGlobals())

it.each(['', 'entryMode=INVALID', 'entryMode=EXISTING%3Cscript%3E'])('acesso direto sem escolha válida exige modal: %s', query => {
  harness.query = query
  const tree = render()
  expect(tree.some(element => element.type === CharacterEntryModeDialog)).toBe(true)
  expect(tree.some(element => element.type === 'form' || element.type === CampaignCreationGate)).toBe(false)
  expect(fetch).not.toHaveBeenCalled()
})

it.each(['ASSISTED', 'EXISTING'])('modo %s mantém o gate de convite antes da criação', mode => {
  harness.query = `entryMode=${mode}`; harness.bypassCampaign = false
  expect(render().some(element => element.type === CampaignCreationGate)).toBe(true)
  expect(fetch).not.toHaveBeenCalled()
})

it.each([['ASSISTED', 1], ['EXISTING', 5]] as const)('modo %s aplica a distribuição correta aos atributos', (mode, expected) => {
  harness.query = `entryMode=${mode}`
  const step = render().find(element => element.type === AttributesStep)!
  ;(step.props.setAttribute as (name: string, value: number) => void)('forca', 5)
  const updated = render().find(element => element.type === AttributesStep)!
  expect((updated.props.attributes as Record<string, number>).forca).toBe(expected)
  expect(updated.props.transcribing).toBe(mode === 'EXISTING')
})

it.each([['ASSISTED', 0], ['EXISTING', 5]] as const)('modo %s aplica a distribuição correta às habilidades', (mode, expected) => {
  harness.query = `entryMode=${mode}`; harness.tab = 'habilidades'
  const step = render().find(element => element.type === SkillsStep)!
  ;(step.props.setSkill as (name: string, value: number) => void)('Briga', 5)
  const updated = render().find(element => element.type === SkillsStep)!
  expect((updated.props.skills as Record<string, number>).Briga ?? 0).toBe(expected)
  expect(updated.props.transcribing).toBe(mode === 'EXISTING')
})

it('ficha vinculada mantém limites mesmo com modo EXISTING salvo', () => {
  harness.query = 'entryMode=EXISTING'
  harness.character = { id: 'saved', name: 'Ficha', campaignId: 'campaign', revision: 0, characterType: 'PLAYER_VAMPIRE', status: 'DRAFT', data: { entryMode: 'EXISTING' } }
  render(true); harness.effects[0]()
  const step = render(true).find(element => element.type === AttributesStep)!
  ;(step.props.setAttribute as (name: string, value: number) => void)('forca', 5)
  const updated = render(true).find(element => element.type === AttributesStep)!
  expect((updated.props.attributes as Record<string, number>).forca).toBe(1)
  expect(updated.props.transcribing).toBe(false)
})

it.each(['ASSISTED', 'EXISTING'])('persiste escolha %s no primeiro rascunho sem gerar XP a partir dos atributos', async mode => {
  harness.query = `entryMode=${mode}`
  const form = render().find(element => element.type === 'form')!
  await (form.props.onSubmit as (event: unknown) => Promise<void>)({ preventDefault: vi.fn() })
  await vi.waitFor(() => expect(fetch).toHaveBeenCalled())
  const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string)
  expect(body.data.entryMode).toBe(mode)
  expect(body.data).not.toHaveProperty('historicalXpImported', true)
  expect(body).not.toHaveProperty('ownerId')
})

it('edição restaura modo salvo em vez de usar modo da URL', () => {
  harness.query = 'entryMode=ASSISTED'
  harness.character = { id: 'saved', name: 'Ficha', campaignId: null, revision: 0, characterType: 'PLAYER_VAMPIRE', status: 'DRAFT', data: { entryMode: 'EXISTING' } }
  render(true); harness.effects[0]()
  expect(render(true).find(element => element.type === AttributesStep)!.props.transcribing).toBe(true)
  expect(render(true).some(element => element.type === CharacterEntryModeDialog)).toBe(false)
})
