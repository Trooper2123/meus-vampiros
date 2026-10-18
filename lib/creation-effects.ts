import type { DisciplineAcquisition } from './vtm-v5/discipline-access'
import { disciplineDefinition, type DisciplineId } from './vtm-v5/disciplines'
import { CharacterCommandError, type CommandCharacter } from './character-commands'
import { normalizeDiscipline } from './vtm-v5/clans'
import { SPECIALTY_SKILL_NAMES, serializeCharacterSkills, validateCharacterSkills } from './vtm-v5/skills'

export type CreationEffect = { origin: 'CLAN' | 'PREDATOR'; kind: 'DISCIPLINE' | 'MERIT' | 'FLAW' | 'SKILL'; id: string; disciplineId?: DisciplineId; name: string; dots: number; baseDots: number }
type TraitGrant = { kind: 'MERIT' | 'FLAW'; name: string; dots: number }

export function creationEffects(character: CommandCharacter): CreationEffect[] {
  return Array.isArray(character.gameState.creationEffects) ? character.gameState.creationEffects as CreationEffect[] : []
}

export function removeCreationEffects(character: CommandCharacter, origin: CreationEffect['origin']) {
  const effects = creationEffects(character)
  const disciplines = (Array.isArray(character.data.disciplinas) ? character.data.disciplinas : []) as Record<string, unknown>[]
  for (const effect of effects.filter(entry => entry.origin === origin)) {
    if (effect.kind === 'SKILL') {
      removeGrantedSkill(character,effect)
    } else if (effect.kind === 'DISCIPLINE') {
      removeGrantedDiscipline(disciplines,effect,effects,origin)
    } else {
      removeGrantedTrait(effect,character)
    }
  }
  character.data.disciplinas = disciplines.filter(entry => Number(entry.level) > 0 || (Array.isArray(entry.powers) && entry.powers.length > 0))
  character.gameState.creationEffects = effects.filter(entry => entry.origin !== origin)
  character.data.creationAdvantageDots = creationEffects(character).filter(entry => entry.kind === 'MERIT').reduce((sum, entry) => sum + entry.dots, 0)
  character.data.creationFlawDots = creationEffects(character).filter(entry => entry.kind === 'FLAW').reduce((sum, entry) => sum + entry.dots, 0)
  syncDisciplineAcquisitions(character)
}

function removeGrantedTrait(effect: CreationEffect,character: CommandCharacter) {
const field=effect.kind==='MERIT'? 'vantagens':'defeitos'
const rows=(Array.isArray(character.data[field])? character.data[field]:[]) as Record<string,unknown>[]
const row=rows.find(entry => entry.id===effect.id)
if(row&&(row.name!==effect.name||row.level!==effect.dots)) throw new CharacterCommandError(409,'Um traço concedido foi alterado. Revise sua origem antes de remover.')
character.data[field]=rows.filter(entry => entry.id!==effect.id)
}

function removeGrantedDiscipline(disciplines: Record<string,unknown>[],effect: CreationEffect,effects: CreationEffect[],origin: CreationEffect['origin']) {
const row=disciplines.find(entry => entry.id===effect.id)
if(!row) throw new CharacterCommandError(409,'Uma disciplina concedida foi alterada. Revise suas origens antes de trocar a escolha.')
const others=effects.filter(entry => entry.origin!==origin&&entry.kind==='DISCIPLINE'&&entry.id===effect.id).reduce((sum,entry) => sum+entry.dots,0)
row.level=Number(row.level)-Math.min(effect.dots,Math.max(0,Number(row.level)-others-effect.baseDots))
}

function removeGrantedSkill(character: CommandCharacter,effect: CreationEffect) {
const validation=validateCharacterSkills(character.data)
const current=validation.skills[effect.id]
if(!validation.valid||current<effect.dots) throw new CharacterCommandError(409,'A habilidade concedida foi alterada. Revise sua origem antes de trocar a predação.')
const remaining=current-effect.dots
const specialties=Array.isArray(character.gameState.specialties)? character.gameState.specialties as { skillId: string; origin: CreationEffect['origin']} []:[]
if(remaining===0&&specialties.some(entry => entry.skillId===effect.id&&entry.origin!=='PREDATOR')) throw new CharacterCommandError(409,'Há especialidades vinculadas à habilidade concedida. Revise-as antes de remover a predação.')
character.data=serializeCharacterSkills(character.data,{ ...validation.skills,[effect.id]: remaining })
}

export function applyCreationEffects(character: CommandCharacter, origin: CreationEffect['origin'], grants: Record<string, number>, traits: TraitGrant[], adopt = false, skillGrants: readonly string[] = []) {
  removeCreationEffects(character, origin)
  const effects = [...creationEffects(character)]
  const disciplines = (Array.isArray(character.data.disciplinas) ? character.data.disciplinas : []) as Record<string, unknown>[]
  for (const [rawName, dots] of Object.entries(grants)) {
    applyDisciplineGrant(rawName,disciplines,effects,adopt,dots,origin)
  }
  character.data.disciplinas = disciplines
  for (const skillId of skillGrants) {
    applySkillGrant(character,skillId,effects,origin)
  }
  for (const trait of traits) {
    applyTraitGrant(trait,origin,character,effects)
  }
  character.gameState.creationEffects = effects
  character.data.creationAdvantageDots = effects.filter(entry => entry.kind === 'MERIT').reduce((sum, entry) => sum + entry.dots, 0)
  character.data.creationFlawDots = effects.filter(entry => entry.kind === 'FLAW').reduce((sum, entry) => sum + entry.dots, 0)
  syncDisciplineAcquisitions(character)
}

function applyTraitGrant(trait: TraitGrant,origin: CreationEffect['origin'],character: CommandCharacter,effects: CreationEffect[]) {
const field=trait.kind==='MERIT'? 'vantagens':'defeitos'
const id=`grant:${origin}:${trait.kind}:${trait.name}`
const rows=Array.isArray(character.data[field])? [...character.data[field]]:[]
rows.push({ id,name: trait.name,level: trait.dots,description: `Concessão de ${origin==='CLAN'? 'clã':'predação'}.` })
character.data[field]=rows
effects.push({ ...trait,origin,id,baseDots: 0 })
}

function applySkillGrant(character: CommandCharacter,skillId: string,effects: CreationEffect[],origin: CreationEffect['origin']) {
const validation=validateCharacterSkills(character.data)
if(!validation.valid||!Object.hasOwn(SPECIALTY_SKILL_NAMES,skillId)||validation.skills[skillId]>=5) throw new CharacterCommandError(422,'Concessão de habilidade inválida.')
const baseDots=validation.skills[skillId]
character.data=serializeCharacterSkills(character.data,{ ...validation.skills,[skillId]: baseDots+1 })
effects.push({ origin,kind: 'SKILL',id: skillId,name: SPECIALTY_SKILL_NAMES[skillId],dots: 1,baseDots })
}

function applyDisciplineGrant(rawName: string,disciplines: Record<string,unknown>[],effects: CreationEffect[],adopt: boolean,dots: number,origin: CreationEffect['origin']) {
const name=normalizeDiscipline(rawName)
const discipline=disciplineDefinition(name)
if(!discipline) throw new CharacterCommandError(422,'Disciplina desconhecida.')
let row=disciplines.find(entry => disciplineDefinition(entry.disciplineId??entry.name)?.id===discipline.id)
if(!row) { row={ id: `discipline:${discipline.id}`,disciplineId: discipline.id,name,level: 0,powers: [] }; disciplines.push(row)} 
if(typeof row.id!=='string') row.id=`discipline:${discipline.id}`
row.disciplineId=discipline.id
row.name=name
const otherDots=effects.filter(entry => entry.kind==='DISCIPLINE'&&entry.id===row!.id).reduce((sum,entry) => sum+entry.dots,0)
const baseDots=Math.max(0,Number(row.level)-otherDots-(adopt? dots:0))
const level=Number(row.level)+(adopt? 0:dots)
if(!Number.isSafeInteger(level)||level>5||level<dots+otherDots) throw new CharacterCommandError(422,'Pontos de disciplina incompatíveis com a concessão.')
row.level=level
effects.push({ origin,kind: 'DISCIPLINE',disciplineId: discipline.id,id: row.id as string,name,dots,baseDots })
}

export function validateCreationEffects(character: CommandCharacter) {
  for (const effect of creationEffects(character)) {
    if (effect.kind === 'SKILL') {
      const validation = validateCharacterSkills(character.data)
      if (!validation.valid || validation.skills[effect.id] < effect.dots) throw new CharacterCommandError(422, 'Habilidades concedidas devem ser alteradas pelo seletor de predação.')
      continue
    }
    validateGrantedTrait(effect,character)
  }
}

function validateGrantedTrait(effect: CreationEffect,character: CommandCharacter) {
let effectField
if(effect.kind==='DISCIPLINE') {
effectField='disciplinas'
} else if(effect.kind==='MERIT') {
effectField='vantagens'
} else {
effectField='defeitos'
}
const field=effectField
const rows=Array.isArray(character.data[field])? character.data[field] as Record<string,unknown>[]:[]
const row=rows.find(entry => entry.id===effect.id)
const minimum=effect.kind==='DISCIPLINE'? creationEffects(character).filter(entry => entry.kind==='DISCIPLINE'&&entry.id===effect.id).reduce((sum,entry) => sum+entry.dots,0):effect.dots
if(row?.name!==effect.name||!Number.isSafeInteger(row.level)||Number(row.level)<minimum) throw new CharacterCommandError(422,'Concessões devem ser alteradas pelos seletores de clã/predação, não pela edição geral.')
}

function syncDisciplineAcquisitions(character: CommandCharacter) {
  const purchases = (Array.isArray(character.gameState.disciplineAcquisitions) ? character.gameState.disciplineAcquisitions as DisciplineAcquisition[] : []).filter(entry => entry.source === 'XP')
  const levels = new Map<string, number>()
  const initial = creationEffects(character).filter(effect => effect.kind === 'DISCIPLINE').sort((first, second) => Number(first.origin === 'PREDATOR') - Number(second.origin === 'PREDATOR')).map(effect => {
    const discipline = disciplineDefinition(effect.disciplineId ?? effect.name)!
    const fromLevel = levels.get(discipline.id) ?? 0
    levels.set(discipline.id, fromLevel + effect.dots)
    return { id: `${effect.origin}:${discipline.id}`, disciplineId: discipline.id, source: effect.origin, fromLevel, targetLevel: fromLevel + effect.dots, xpCost: 0 } satisfies DisciplineAcquisition
  })
  character.gameState.disciplineAcquisitions = [...initial, ...purchases]
}
