import type { DisciplineId } from './disciplines'

// Catálogo inicial de metadados; aquisição e execução exigem regras próprias da crônica.
export type DisciplineContent = { id: string; disciplineId: DisciplineId; kind: 'RITUAL' | 'CEREMONY'; name: string; level: number; requiredPowerIds: readonly string[]; source: string }
export const DISCIPLINE_CONTENTS: readonly DisciplineContent[] = [
  { id: 'BLOOD_WALK', disciplineId: 'BLOOD_SORCERY', kind: 'RITUAL', name: 'Caminhada de Sangue', level: 1, requiredPowerIds: [], source: 'CORE_V5:272' },
  { id: 'SUMMON_SPIRIT', disciplineId: 'OBLIVION', kind: 'CEREMONY', name: 'Invocar Espírito', level: 1, requiredPowerIds: ['THE_BINDING_FETTER'], source: 'CULTS_OF_THE_BLOOD_GODS:209' },
]
export function evaluateDisciplineContentAccess(contentId: string, levels: Partial<Record<DisciplineId, number>>, approvedPowerIds: readonly string[]) {
  const content = DISCIPLINE_CONTENTS.find(entry => entry.id === contentId)
  if (!content) return { eligible: false, blockers: ['Conteúdo desconhecido.'] }
  const blockers: string[] = []
  if ((levels[content.disciplineId] ?? 0) < content.level) blockers.push('O nível da Disciplina é inferior ao exigido pelo conteúdo.')
  if (content.requiredPowerIds.some(id => !approvedPowerIds.includes(id))) blockers.push('O conteúdo exige um poder específico aprovado.')
  return { eligible: blockers.length === 0, blockers }
}

