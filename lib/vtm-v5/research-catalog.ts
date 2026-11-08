import rows from './research-catalog.json'
import { SPECIALTY_SKILL_NAMES } from './skills'
import { DISCIPLINES, type DisciplineId } from './disciplines'

// Complementary discovery links from the Paradox VTM Wiki PDFs (08 Nov 2026).
// The original book/page fields on research entries remain the authority for rules.
export const DISCIPLINE_WIKI_REFERENCES: Readonly<Record<DisciplineId, string>> = {
  ANIMALISM: 'https://vtm.paradoxwikis.com/Animalism',
  AUSPEX: 'https://vtm.paradoxwikis.com/Auspex',
  BLOOD_SORCERY: 'https://vtm.paradoxwikis.com/Blood_Sorcery',
  CELERITY: 'https://vtm.paradoxwikis.com/Celerity',
  DOMINATE: 'https://vtm.paradoxwikis.com/Dominate',
  FORTITUDE: 'https://vtm.paradoxwikis.com/Fortitude',
  OBFUSCATE: 'https://vtm.paradoxwikis.com/Obfuscate',
  OBLIVION: 'https://vtm.paradoxwikis.com/Oblivion',
  POTENCE: 'https://vtm.paradoxwikis.com/Potence',
  PRESENCE: 'https://vtm.paradoxwikis.com/Presence',
  PROTEAN: 'https://vtm.paradoxwikis.com/Protean',
  THIN_BLOOD_ALCHEMY: 'https://vtm.paradoxwikis.com/Thin-blood_Alchemy',
}
const disciplineNamesById = new Map<string, string>(DISCIPLINES.map(item => [item.id, item.name]))

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
  return { ...row, skillIds, disciplineNameEn: disciplineNamesById.get(row.disciplineId) ?? row.discipline, wikiReferenceUrl: DISCIPLINE_WIKI_REFERENCES[row.disciplineId as DisciplineId] ?? null }
})

export type DisciplineResearchEntry = typeof DISCIPLINE_RESEARCH[number]
