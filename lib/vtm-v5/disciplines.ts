export const DISCIPLINES = [
  { id: 'ANIMALISM', name: 'Animalism', aliases: ['Animalismo'] },
  { id: 'AUSPEX', name: 'Auspex', aliases: ['Auspícios'] },
  { id: 'BLOOD_SORCERY', name: 'Blood Sorcery', aliases: ['Feitiçaria de Sangue'] },
  { id: 'CELERITY', name: 'Celerity', aliases: ['Rapidez'] },
  { id: 'DOMINATE', name: 'Dominate', aliases: ['Dominação'] },
  { id: 'FORTITUDE', name: 'Fortitude', aliases: [] },
  { id: 'OBFUSCATE', name: 'Obfuscate', aliases: ['Ofuscação'] },
  { id: 'OBLIVION', name: 'Oblivion', aliases: ['Oblívio'] },
  { id: 'POTENCE', name: 'Potence', aliases: ['Potência'] },
  { id: 'PRESENCE', name: 'Presence', aliases: ['Presença'] },
  { id: 'PROTEAN', name: 'Protean', aliases: ['Proteanism', 'Proteanismo', 'Metamorfose', 'Metamerfose'] },
  { id: 'THIN_BLOOD_ALCHEMY', name: 'Thin-Blood Alchemy', aliases: ['Alquimia de Sangue-Ralo', 'Alquimia de Sangue-Fraco'] },
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

