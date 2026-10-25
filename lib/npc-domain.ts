import { CharacterCommandError } from './character-commands'
import { SPECIALTY_SKILL_NAMES } from './vtm-v5/skills'

import { NPC_SHEET_TYPES, NPC_CREATURES, NPC_ROLES, NPC_THREATS } from './npc-options'
export { NPC_SHEET_TYPES, NPC_CREATURES, NPC_ROLES, NPC_THREATS } from './npc-options'
export type NpcData = {
  name: string; sheetType: typeof NPC_SHEET_TYPES[number]; creatureType: keyof typeof NPC_CREATURES; role: keyof typeof NPC_ROLES;
  threatLevel: number | null; concept: string; description: string; appearance: string; motivations: string; privateNotes: string;
  generalDifficulty: number | null; customPool: number | null; threatJustification: string;
  standardPools: { physical: number; social: number; mental: number } | null;
  exceptionalPools: { id: string; skillCode: string | null; customName: string | null; dicePool: number; description: string }[];
  healthMax: number | null; willpowerMax: number | null; hunger: number; bloodPotency: number; humanity: number;
  specialAbilities: { id: string; name: string; description: string; powerCode: string | null }[];
  equipment: string; domitorCharacterId: string | null; bondStrength: number; customCreature: string;
}
export function npcFail(status: number, message: string): never { throw new CharacterCommandError(status, message) }
export function npcText(value: unknown, maximum = 2000, required = false): string {
  if (value === undefined && !required) { return '' }
  if (typeof value !== 'string' || value.length > maximum || required && !value.trim()) { return npcFail(422, 'Texto ausente ou acima do limite.') }
  return value.trim()
}
export function npcInteger(value: unknown, minimum: number, maximum: number): number {
  if (!Number.isSafeInteger(value) || Number(value) < minimum || Number(value) > maximum) { return npcFail(422, 'Valor numérico inválido.') }
  return Number(value)
}
export function npcObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) { return npcFail(400, 'Dados inválidos.') }
  return value as Record<string, unknown>
}
export function npcKeys(value: Record<string, unknown>, fields: readonly string[]) {
  if (Object.keys(value).some(key => !fields.includes(key))) { npcFail(400, 'Campos não permitidos.') }
}
export function threatReference(level: number) {
  npcInteger(level, 1, 7)
  return { level, label: NPC_THREATS[level - 1], referencePool: level * 2, averageSuccesses: level, customRule: true }
}
export function validateNpc(input: unknown): NpcData {
  const value = npcObject(input)
  npcKeys(value, ['name','sheetType','creatureType','role','threatLevel','concept','description','appearance','motivations','privateNotes','generalDifficulty','customPool','threatJustification','standardPools','exceptionalPools','healthMax','willpowerMax','hunger','bloodPotency','humanity','specialAbilities','equipment','domitorCharacterId','bondStrength','customCreature'])
  if (!NPC_SHEET_TYPES.includes(value.sheetType as NpcData['sheetType']) || !Object.hasOwn(NPC_CREATURES, String(value.creatureType)) || !Object.hasOwn(NPC_ROLES, String(value.role))) { npcFail(422, 'Modalidade, criatura ou papel inválido.') }
  const sheetType = value.sheetType as NpcData['sheetType']
  const nullableInt = (field: string, min: number, max: number) => value[field] === undefined || value[field] === null ? null : npcInteger(value[field], min, max)
  const standard = value.standardPools == null ? null : npcObject(value.standardPools)
  if (standard) { npcKeys(standard, ['physical','social','mental']) }
  if (sheetType === 'INTERMEDIATE' && !standard) { npcFail(422, 'Informe os três pools padrão.') }
  if (!Array.isArray(value.exceptionalPools ?? []) || ((value.exceptionalPools as unknown[] | undefined)?.length ?? 0) > 50 || !Array.isArray(value.specialAbilities ?? []) || ((value.specialAbilities as unknown[] | undefined)?.length ?? 0) > 30) { npcFail(422, 'Quantidade de pools ou poderes inválida.') }
  const seen = new Set<string>()
  const exceptionalPools = ((value.exceptionalPools ?? []) as unknown[]).map(entry => {
    const pool = npcObject(entry); npcKeys(pool, ['id','skillCode','customName','dicePool','description'])
    const skillCode = pool.skillCode == null || pool.skillCode === '' ? null : npcText(pool.skillCode, 120, true)
    const customName = npcText(pool.customName ?? '', 120) || null
    if (skillCode && !Object.hasOwn(SPECIALTY_SKILL_NAMES, skillCode) || !skillCode && !customName) { npcFail(422, 'Escolha habilidade ou nome personalizado.') }
    const key = (skillCode ?? customName!).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
    if (seen.has(key)) { npcFail(422, 'Pool excepcional duplicado.') }
    seen.add(key)
    return { id: npcText(pool.id, 100, true), skillCode, customName, dicePool: npcInteger(pool.dicePool, 0, 50), description: npcText(pool.description) }
  })
  const healthMax = nullableInt('healthMax', 1, 50), willpowerMax = nullableInt('willpowerMax', 1, 50)
  if (sheetType === 'INTERMEDIATE' && (healthMax === null || willpowerMax === null)) { npcFail(422, 'Informe Vitalidade e Força de Vontade máximas.') }
  const domitorCharacterId = value.domitorCharacterId == null || value.domitorCharacterId === '' ? null : npcText(value.domitorCharacterId, 36, true)
  return {
    name: npcText(value.name, 120, true), sheetType, creatureType: value.creatureType as NpcData['creatureType'], role: value.role as NpcData['role'],
    threatLevel: sheetType === 'FULL' ? nullableInt('threatLevel', 1, 7) : npcInteger(value.threatLevel, 1, 7),
    concept: npcText(value.concept), description: npcText(value.description, 10000), appearance: npcText(value.appearance), motivations: npcText(value.motivations), privateNotes: npcText(value.privateNotes, 10000),
    generalDifficulty: nullableInt('generalDifficulty', 1, 50), customPool: nullableInt('customPool', 0, 50), threatJustification: npcText(value.threatJustification),
    standardPools: standard ? { physical: npcInteger(standard.physical,0,50), social: npcInteger(standard.social,0,50), mental: npcInteger(standard.mental,0,50) } : null,
    exceptionalPools, healthMax, willpowerMax, hunger: npcInteger(value.hunger ?? 0, 0, 5), bloodPotency: npcInteger(value.bloodPotency ?? 0,0,10), humanity: npcInteger(value.humanity ?? 7,0,10),
    specialAbilities: ((value.specialAbilities ?? []) as unknown[]).map(entry => { const power = npcObject(entry); npcKeys(power, ['id','name','description','powerCode']); return { id: npcText(power.id,100,true), name: npcText(power.name,120,true), description: npcText(power.description,5000), powerCode: power.powerCode == null ? null : npcText(power.powerCode,300) } }),
    equipment: npcText(value.equipment,5000), domitorCharacterId, bondStrength: npcInteger(value.bondStrength ?? 0,0,6), customCreature: npcText(value.customCreature,120),
  }
}
export function npcWarnings(npc: NpcData) {
  const reference = (npc.threatLevel ?? 1) * 2
  const pools = [...Object.values(npc.standardPools ?? {}), ...npc.exceptionalPools.map(pool => pool.dicePool)]
  return npc.sheetType !== 'FULL' && pools.some(pool => pool > reference) ? ['Os pools superam a referência da ameaça. Revise o desafio global ou registre sua justificativa; o salvamento é permitido.'] : []
}
export function npcPool(npc: NpcData, category: 'physical' | 'social' | 'mental', exceptionalId?: string) {
  if (npc.sheetType === 'FULL') { return npcFail(422, 'Fichas completas exigem atributo e habilidade reais.') }
  const exceptional = exceptionalId ? npc.exceptionalPools.find(pool => pool.id === exceptionalId) : undefined
  if (exceptionalId && !exceptional) { return npcFail(422, 'Pool excepcional não encontrado.') }
  if (exceptional) { return { pool: exceptional.dicePool, origin: exceptional.customName ?? SPECIALTY_SKILL_NAMES[exceptional.skillCode!] } }
  const categories = { physical: 'físico', social: 'social', mental: 'mental' }
  if (npc.standardPools) { return { pool: npc.standardPools[category], origin: `Pool ${categories[category]}` } }
  return { pool: npc.customPool ?? threatReference(npc.threatLevel!).referencePool, origin: npc.customPool === null ? 'Referência personalizada de ameaça' : 'Pool personalizado' }
}

const detective: NpcData = validateNpc({ name: 'Detetive de polícia', sheetType: 'INTERMEDIATE', creatureType: 'MORTAL', role: 'NEUTRAL', threatLevel: 3, standardPools: { physical:4,social:3,mental:4 }, healthMax:6, willpowerMax:5, exceptionalPools: [['atletismo',5],['armas-de-fogo',5],['investigacao',6],['manha',5]].map(([skillCode,dicePool]) => ({ id: skillCode, skillCode,dicePool })), concept:'Investiga crimes sem necessariamente conhecer sua natureza sobrenatural.' })
export const NPC_TEMPLATES = [
  { id:'police-detective', originalName:'Police Detective', name:'Detetive de polícia', official:true, source:'Vampire: The Masquerade V5 — Corebook, pp. 370–372', data:detective },
  ...([['civil','Civil','MORTAL',1],['security','Segurança','MORTAL',2],['criminal','Criminoso','MORTAL',2],['hunter','Caçador independente','MORTAL',3],['ambusher','Caçador emboscador','MORTAL',4],['ghoul-servant','Servo carniçal','GHOUL',2],['bodyguard','Guarda-costas carniçal','GHOUL',3],['agent','Agente carniçal','GHOUL',3],['neonate','Neófito','VAMPIRE',3],['ancilla','Ancilla','VAMPIRE',4],['elder','Ancião','VAMPIRE',6],['sabbat-fighter','Combatente Sabbat','VAMPIRE',4],['sabbat-infiltrator','Infiltrador Sabbat','VAMPIRE',4],['sabbat-leader','Líder Sabbat','VAMPIRE',5],['supernatural','Sobrenatural genérico','OTHER',4]] as const).map(([id,name,creatureType,threatLevel]) => ({ id, originalName:null, name, official:false, source:'Modelo personalizado do projeto; revisar antes de usar.', data:validateNpc({ name, sheetType:'SIMPLE',creatureType,role:'EXTRA',threatLevel }) })),
]
