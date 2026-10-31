import { renderToStaticMarkup } from 'react-dom/server'
import type { ComponentProps, ReactElement } from 'react'
import { expect, it, vi } from 'vitest'
import { CharacterSummaryClient } from '@/app/characters/[id]/character-summary-client'
import { NotesBacklinks } from '@/components/notes/notes-panel'
import { CharacterDisciplineProgression } from '@/components/character-summary/character-discipline-progression'
import { SummaryHeader } from '@/components/character-summary/summary-header'
import { SummaryAttributes } from '@/components/character-summary/summary-attributes'
import { SummarySkills } from '@/components/character-summary/summary-skills'

const setRollPrefill = vi.fn()
vi.mock('react', async original => ({ ...await original<typeof import('react')>(), useState: () => [undefined, setRollPrefill] }))

it.each([['PLAYER_VAMPIRE', 'CHARACTER'], ['HUMAN_NPC', 'NPC'], ['VAMPIRE_NPC', 'NPC']])('anotações de %s abrem em nova guia junto ao nome', (characterType, targetType) => {
  const data: ComponentProps<typeof CharacterSummaryClient>['data'] = { id: '11111111-1111-4111-8111-111111111111', characterType, name: 'Helena', clan: null, predator: null, generation: null, campaignName: null, campaignTheme: null, attributes: {}, skills: {}, merits: [], flaws: [], disciplines: [], resources: { humanidade: 7, vontade: 5, vitalidade: 5, fome: 1 } }
  const tree = CharacterSummaryClient({ data })
  const summary = tree.props.children[1]
  const actions = summary.props.headerActions
  const action = actions.props.children.find((child: ReactElement<{ href?: string }> | false) => child && child.props.href?.startsWith('/notes'))
  expect(action.props.href).toBe(`/notes?targetType=${targetType}&targetId=${data.id}`)
  expect(action.props.target).toBe('_blank')
  expect(action.props.rel).toBe('noopener noreferrer')
  const html = renderToStaticMarkup(SummaryHeader({ ...data, actions }))
  expect(html.indexOf('Helena')).toBeLessThan(html.indexOf('target="_blank"'))
  expect(html).toContain('abre em nova guia')
  expect(html.includes(`/characters/${data.id}/evolution`)).toBe(characterType === 'PLAYER_VAMPIRE')
  expect(summary.props.specialties).toBeUndefined()
  expect(tree.props.children.some((child: ReactElement | false) => child && typeof child === 'object' && child.type === CharacterDisciplineProgression)).toBe(false)
  expect(tree.props.children.some((child: ReactElement | false) => child && typeof child === 'object' && child.type === NotesBacklinks)).toBe(false)
})

it('o dossiê leva atributos e habilidades ao painel existente', () => {
  const data: ComponentProps<typeof CharacterSummaryClient>['data'] = { id: '11111111-1111-4111-8111-111111111111', characterType: 'PLAYER_VAMPIRE', name: 'Helena', clan: null, predator: null, generation: null, campaignName: null, campaignTheme: null, attributes: { forca: 3 }, skills: { Briga: 2 }, merits: [], flaws: [], disciplines: [], resources: { humanidade: 7, vontade: 5, vitalidade: 5, fome: 1 } }
  setRollPrefill.mockClear()
  const tree = CharacterSummaryClient({ data })
  const summary = tree.props.children[1]
  expect(renderToStaticMarkup(SummaryAttributes({ attributes: data.attributes, onRoll: summary.props.onRollAttribute }))).toContain('href="#rolagens"')
  expect(renderToStaticMarkup(SummarySkills({ skills: data.skills, onRoll: summary.props.onRollSkill }))).toContain('href="#rolagens"')
  summary.props.onRollAttribute('forca')
  summary.props.onRollSkill('Briga')
  expect(setRollPrefill).toHaveBeenNthCalledWith(1, { attribute: 'forca' })
  expect(setRollPrefill).toHaveBeenNthCalledWith(2, { skill: 'briga' })
})
