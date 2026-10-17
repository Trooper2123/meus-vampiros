export const DISCIPLINES = [
  { id: 'ANIMALISM', name: 'Animalismo', aliases: ['Animalism'] },
  { id: 'AUSPEX', name: 'Auspícios', aliases: ['Auspex'] },
  { id: 'BLOOD_SORCERY', name: 'Feitiçaria de Sangue', aliases: ['Blood Sorcery'] },
  { id: 'CELERITY', name: 'Rapidez', aliases: ['Celerity'] },
  { id: 'DOMINATE', name: 'Dominação', aliases: ['Dominate'] },
  { id: 'FORTITUDE', name: 'Fortitude', aliases: [] },
  { id: 'OBFUSCATE', name: 'Ofuscação', aliases: ['Obfuscate'] },
  { id: 'OBLIVION', name: 'Oblívio', aliases: ['Oblivion'] },
  { id: 'POTENCE', name: 'Potência', aliases: ['Potence'] },
  { id: 'PRESENCE', name: 'Presença', aliases: ['Presence'] },
  { id: 'PROTEAN', name: 'Metamorfose', aliases: ['Proteanismo', 'Protean'] },
  { id: 'THIN_BLOOD_ALCHEMY', name: 'Alquimia de Sangue-Fraco', aliases: ['Thin-Blood Alchemy'] },
] as const
export type DisciplineId = typeof DISCIPLINES[number]['id']
export const CLAN_DISCIPLINES: Readonly<Record<string, readonly DisciplineId[]>> = {
  BANU_HAQIM: ['BLOOD_SORCERY', 'CELERITY', 'OBFUSCATE'],
  BRUJAH: ['CELERITY', 'POTENCE', 'PRESENCE'],
  GANGREL: ['ANIMALISM', 'FORTITUDE', 'PROTEAN'],
  HECATA: ['AUSPEX', 'FORTITUDE', 'OBLIVION'],
  LASOMBRA: ['DOMINATE', 'OBLIVION', 'POTENCE'],
  MALKAVIAN: ['AUSPEX', 'DOMINATE', 'OBFUSCATE'],
  MINISTRY: ['OBFUSCATE', 'PRESENCE', 'PROTEAN'],
  NOSFERATU: ['ANIMALISM', 'OBFUSCATE', 'POTENCE'],
  RAVNOS: ['ANIMALISM', 'OBFUSCATE', 'PRESENCE'],
  SALUBRI: ['AUSPEX', 'DOMINATE', 'FORTITUDE'],
  TOREADOR: ['AUSPEX', 'CELERITY', 'PRESENCE'],
  TREMERE: ['AUSPEX', 'DOMINATE', 'BLOOD_SORCERY'],
  TZIMISCE: ['ANIMALISM', 'DOMINATE', 'PROTEAN'],
  VENTRUE: ['DOMINATE', 'FORTITUDE', 'PRESENCE'],
  CAITIFF: [],
  THIN_BLOOD: ['THIN_BLOOD_ALCHEMY'],
}
const key = (value: string) => value.normalize('NFD').replace(/\p{M}/gu, '').trim().toLowerCase()
export function disciplineDefinition(value: unknown) {
  if (typeof value !== 'string') return undefined
  return DISCIPLINES.find(entry => [entry.id, entry.name, ...entry.aliases].some(name => key(name) === key(value)))
}
export function disciplineName(id: DisciplineId): string { return DISCIPLINES.find(entry => entry.id === id)!.name }

