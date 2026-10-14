import type { CreationGrant } from './creation-grants'

export function fillDisciplinePowerSlots<Power>(powers: readonly Power[], level: number, createEmpty: () => Power): Power[] {
  return Array.from({ length: Math.max(powers.length, level) }, (_, index) => powers[index] ?? createEmpty())
}

export function arrangeDisciplineEditor<Discipline extends { id: string; name: string; level: number; powers: unknown[] }>(rows: Discipline[], grants: readonly CreationGrant[], blank: Discipline): Discipline[] {
  const grantedIds = new Set(grants.filter(grant => grant.kind === 'DISCIPLINE').map(grant => grant.id))
  const filled = rows.filter(row => row.name.trim() || row.level > 0 || row.powers.some(power => typeof power === 'string' ? power.trim() : power && typeof power === 'object' && Object.values(power).some(value => String(value ?? '').trim())))
  filled.sort((first, second) => Number(grantedIds.has(second.id)) - Number(grantedIds.has(first.id)))
  return filled.length >= 7 ? filled : [...filled, blank]
}
