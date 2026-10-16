import { expect, it, vi } from 'vitest'
import type { ReactElement, ReactNode } from 'react'
import { AttributesStep, type Attributes } from '@/components/character-form/attributes-step'
import { SkillsStep } from '@/components/character-form/skills-step'
import { ResourcesStep, type Conviction, type Resources } from '@/components/character-form/resources-step'
import { HistoryStep } from '@/components/character-form/history-step'
import { DisciplinesStep } from '@/components/character-form/disciplines-step'
import { createEmptyPower, type Discipline } from '@/components/character-form/discipline-fields'
import { calculateSecondaryAttributes } from '@/lib/vtm-v5/secondary-attributes'

type Element = ReactElement<Record<string, any>>
function elements(node: ReactNode): Element[] {
  if (Array.isArray(node)) return node.flatMap(elements)
  if (!node || typeof node !== 'object' || !('props' in node)) return []
  const element = node as Element
  return [element, ...elements(element.props.children)]
}

it('atributos e habilidades delegam distribuição ao pai, mantendo nomes', () => {
  const setAttribute = vi.fn()
  const attributes: Attributes = { forca: 1, destreza: 1, vigor: 1, carisma: 1, manipulacao: 1, compostura: 1, inteligencia: 1, raciocinio: 1, determinacao: 1 }
  const attributeElements = elements(AttributesStep({ attributes, attributesComplete: false, attributePointsRemaining: 18, setAttribute }))
  attributeElements.find(element => element.type === 'button' && element.props['aria-label'] === 'Definir nível 4')!.props.onClick()
  expect(setAttribute).toHaveBeenCalledWith('forca', 4)
  const setSkill = vi.fn()
  const setSkillMode = vi.fn()
  const skillElements = elements(SkillsStep({ skills: {}, skillMode: 'BALANCED', skillsComplete: false, skillPointsRemaining: 20, setSkill, setSkillMode }))
  skillElements.find(element => element.type === 'button' && element.props['aria-label'] === 'Definir nível 2')!.props.onClick()
  expect(setSkill).toHaveBeenCalledWith('Armas brancas', 2)
  expect(skillElements.some(element => element.props.name === 'habilidade-armas-brancas')).toBe(true)
  skillElements.find(element => element.type === 'select')!.props.onChange({ target: { value: 'SPECIALIST' } })
  expect(setSkillMode).toHaveBeenCalledWith('SPECIALIST')
})

it.each(['PLAYER_VAMPIRE', 'HUMAN_NPC'] as const)('recursos de %s preservam bloqueios, convicções e princípios somente leitura', characterType => {
  const resources: Resources = { humanidade: 7, vontade: 4, vitalidade: 5, fome: 1 }
  const convictions: Conviction[] = [{ pilar: 'Original', crenca: 'Valor' }]
  const setResources = vi.fn()
  const setConvictions = vi.fn()
  const nodes = elements(ResourcesStep({ characterType, displayedResources: resources, setResources, convictions, setConvictions, principios: 'Segredo da mesa autorizada', showMissingPrinciples: false, secondaryAttributes: calculateSecondaryAttributes({ vigor: 2, determinacao: 2, compostura: 2 }) }))
  const button = nodes.find(element => element.type === 'button' && element.props['aria-label'] === 'Definir nível 3')!
  expect(button.props.disabled).toBe(characterType === 'PLAYER_VAMPIRE')
  if (characterType === 'HUMAN_NPC') {
    button.props.onClick()
    expect(setResources.mock.calls[0][0](resources)).toEqual({ ...resources, humanidade: 3 })
  }
  nodes.find(element => element.props.name === 'convicoes-pilar-1')!.props.onChange({ target: { value: 'Atualizado' } })
  expect(setConvictions.mock.calls[0][0](convictions)).toEqual([{ pilar: 'Atualizado', crenca: 'Valor' }])
  const principles = nodes.find(element => element.type === 'textarea')!
  expect(principles.props.readOnly).toBe(true)
  expect(principles.props.value).toBe('Segredo da mesa autorizada')
})

it('histórico e notas mantêm names e callbacks independentes', () => {
  const setHistorico = vi.fn()
  const setNotas = vi.fn()
  const nodes = elements(HistoryStep({ historico: 'Vida', notas: 'Nota', setHistorico, setNotas }))
  nodes.find(element => element.props.name === 'historico')!.props.onChange({ target: { value: 'História' } })
  nodes.find(element => element.props.name === 'notas')!.props.onChange({ target: { value: 'Gancho' } })
  expect(setHistorico).toHaveBeenCalledWith('História')
  expect(setNotas).toHaveBeenCalledWith('Gancho')
})

it('disciplinas delegam limites e preservam concessões e campos dos poderes', () => {
  const disciplines: Discipline[] = [{ id: 'clan-discipline', name: 'Presença', level: 1, powers: [createEmptyPower()] }]
  const setDisciplines = vi.fn()
  const handleDisciplineLevelChange = vi.fn()
  const nodes = elements(DisciplinesStep({ disciplines, setDisciplines, confirmingDiscipline: null, setConfirmingDiscipline: vi.fn(), availableDisciplines: [], handleDisciplineLevelChange, addDiscipline: vi.fn(), creationGrants: [{ id: 'clan-discipline', kind: 'DISCIPLINE', origin: 'CLAN', name: 'Presença', dots: 1 }] }))
  expect(nodes.some(element => element.props.className?.includes('is-granted'))).toBe(true)
  nodes.find(element => element.type === 'button' && element.props['aria-label'] === 'Definir nível 2')!.props.onClick()
  expect(handleDisciplineLevelChange).toHaveBeenCalledWith(0, 2)
  nodes.find(element => element.props.name === 'disciplina-0-poder-0-name')!.props.onChange({ target: { value: 'Fascínio' } })
  expect(setDisciplines.mock.calls[0][0](disciplines)[0].powers[0]).toEqual({ ...createEmptyPower(), name: 'Fascínio' })
})
