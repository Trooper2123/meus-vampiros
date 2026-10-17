import { renderToStaticMarkup } from 'react-dom/server'
import type { ComponentProps, ReactElement } from 'react'
import { expect, it } from 'vitest'
import { CharacterSummaryClient } from '@/app/characters/[id]/character-summary-client'
import { NotesBacklinks } from '@/components/notes/notes-panel'
import { SummaryHeader } from '@/components/character-summary/summary-header'

it.each([['PLAYER_VAMPIRE', 'CHARACTER'], ['HUMAN_NPC', 'NPC'], ['VAMPIRE_NPC', 'NPC']])('anotações de %s abrem em nova guia junto ao nome', (characterType, targetType) => {
  const data: ComponentProps<typeof CharacterSummaryClient>['data'] = { id: '11111111-1111-4111-8111-111111111111', characterType, name: 'Helena', clan: null, predator: null, generation: null, campaignName: null, campaignTheme: null, attributes: {}, skills: {}, merits: [], flaws: [], disciplines: [], resources: { humanidade: 7, vontade: 5, vitalidade: 5, fome: 1 } }
  const tree = CharacterSummaryClient({ data })
  const summary = tree.props.children[0]
  const action = summary.props.headerActions
  expect(action.props.href).toBe(`/notes?targetType=${targetType}&targetId=${data.id}`)
  expect(action.props.target).toBe('_blank')
  expect(action.props.rel).toBe('noopener noreferrer')
  const html = renderToStaticMarkup(SummaryHeader({ ...data, actions: action }))
  expect(html.indexOf('Helena')).toBeLessThan(html.indexOf('target="_blank"'))
  expect(html).toContain('abre em nova guia')
  expect(tree.props.children.some((child: ReactElement | false) => child && typeof child === 'object' && child.type === NotesBacklinks)).toBe(false)
})
