import { expect, it } from 'vitest'
import { arrangeDisciplineEditor, fillDisciplinePowerSlots } from '@/lib/vtm-v5/discipline-editor'
import type { CreationGrant } from '@/lib/vtm-v5/creation-grants'

const blank = { id: 'blank', name: '', level: 0, powers: [] as unknown[] }
const grants: CreationGrant[] = [{ id: 'clan', origin: 'CLAN', kind: 'DISCIPLINE', name: 'Presença', dots: 2 }]

it.each([1, 2, 3, 4, 5])('inicializa slots editáveis para disciplina concedida de nível %s', level => {
  const slots = fillDisciplinePowerSlots([], level, () => ({ name: '', effect: '' }))
  const updated = slots.map((power, index) => index === 0 ? { ...power, name: 'Poder escolhido', effect: 'Efeito preenchido' } : power)
  expect(slots).toHaveLength(level)
  expect(updated[0]).toEqual({ name: 'Poder escolhido', effect: 'Efeito preenchido' })
  expect(slots[0].name).toBe('')
  if (level > 1) expect(slots[0]).not.toBe(slots[1])
})

it('preserva poderes existentes e entradas além do nível atual', () => {
  const powers = [{ name: 'Existente' }, { name: 'Nota em andamento' }]
  expect(fillDisciplinePowerSlots(powers, 1, () => ({ name: '' }))).toEqual(powers)
  expect(fillDisciplinePowerSlots(powers, 3, () => ({ name: '' }))).toEqual([...powers, { name: '' }])
})

it('concessões primeiro, manuais depois e apenas um espaço vazio sem alterar a entrada', () => {
  const rows = [{ id: 'manual', name: 'Rapidez', level: 1, powers: [] }, { id: 'empty', name: '', level: 0, powers: [{}] }, { id: 'clan', name: 'Presença', level: 2, powers: [{ name: 'Poder' }] }]
  const previous = structuredClone(rows)
  expect(arrangeDisciplineEditor(rows, grants, blank).map(row => row.id)).toEqual(['clan', 'manual', 'blank'])
  expect(rows).toEqual(previous)
})
it('não descarta um poder preenchido quando o nome da disciplina está vazio', () => {
  const row = { id: 'unfinished', name: '', level: 0, powers: [{ name: '', additionalNotes: 'Anotação em andamento' }] }
  expect(arrangeDisciplineEditor([row], [], blank)).toEqual([row, blank])
})
it('respeita o limite existente sem remover disciplinas preenchidas', () => {
  const rows = Array.from({ length: 7 }, (_, index) => ({ id: String(index), name: 'Disciplina', level: 1, powers: [] }))
  expect(arrangeDisciplineEditor(rows, [], blank)).toHaveLength(7)
  expect(arrangeDisciplineEditor([], [], blank)).toEqual([blank])
})
