import rows from './research-catalog.json'
import { SPECIALTY_SKILL_NAMES } from './skills'

export const SKILL_CATALOG = Object.entries(SPECIALTY_SKILL_NAMES).map(([id, name]) => ({ id, name }))
const skillAliases: Record<string, string[]> = {
  'armas-brancas': ['melee'], 'armas-de-fogo': ['firearms'], atletismo: ['athletics', 'esportes'], briga: ['brawl'], conducao: ['drive'], furtividade: ['stealth'], ladroagem: ['larceny'], oficios: ['craft'], sobrevivencia: ['survival'], 'empatia-com-animais': ['animal ken'], etiqueta: ['etiquette'], intimidacao: ['intimidation'], lideranca: ['leadership'], manha: ['streetwise'], performance: [], persuasao: ['persuasion'], sagacidade: ['insight'], subterfugio: ['subterfuge'], ciencia: ['science'], academicos: ['academics'], financas: ['finance'], investigacao: ['investigation'], medicina: ['medicine'], ocultismo: ['occult'], percepcao: ['awareness'], politica: ['politics'], tecnologia: ['technology'],
}
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR')
export const DISCIPLINE_RESEARCH = rows.map(row => {
  const pools = normalize(`${row.pool} ${row.opposing_pool}`)
  const skillIds = SKILL_CATALOG.filter(skill => [skill.name, ...(skillAliases[skill.id] ?? [])].some(alias => {
    const escaped = normalize(alias).replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)
    return new RegExp(`(?:^|[^a-z0-9])${escaped}(?:$|[^a-z0-9])`, 'u').test(pools)
  })).map(skill => skill.id)
  return { ...row, skillIds }
})

export type DisciplineResearchEntry = typeof DISCIPLINE_RESEARCH[number]
