import { CharacterCommandError, getCommandCharacter, runCharacterCommand } from './character-commands'
import { disciplineRows } from './discipline-allocation'
import { disciplineDefinition } from './vtm-v5/disciplines'
import { disciplinePowerOptions } from './vtm-v5/discipline-powers'
import { normalizeCharacterRulesInput } from './vtm-v5/normalize'
import { normalizeSpecialtySkillId } from './vtm-v5/specialties'
import { calculateBloodPotencyEffects, type BloodContext } from './vtm-v5/blood-potency'
import { getBloodPolicy } from './blood-policy'
import { readSessionState } from './vtm-v5/session-state'
import { storeRoll } from './character-roll-history'
import { serverDiceProvider, type DiceProvider } from './vtm-v5/dice-provider'
import { drawD10, rollV5Pool } from './vtm-v5/dice-roll-service'

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const attrs: Record<string,string> = { strength:'forca', dexterity:'destreza', stamina:'vigor', charisma:'carisma', manipulation:'manipulacao', composure:'compostura', intelligence:'inteligencia', wits:'raciocinio', resolve:'determinacao' }
const skills: Record<string,string> = { 'animal ken':'empatia-com-animais', athletics:'atletismo', awareness:'percepcao', brawl:'briga', craft:'oficios', drive:'conducao', etiquette:'etiqueta', finance:'financas', firearms:'armas-de-fogo', insight:'sagacidade', intimidation:'intimidacao', investigation:'investigacao', larceny:'ladroagem', leadership:'lideranca', medicine:'medicina', melee:'armas-brancas', occult:'ocultismo', performance:'performance', persuasion:'persuasao', politics:'politica', science:'ciencia', stealth:'furtividade', streetwise:'manha', subterfuge:'subterfugio', survival:'sobrevivencia', technology:'tecnologia', academics:'academicos' }
const clean = (value:string) => value.trim().toLowerCase().replace(/\s+/g,' ')
type AvailablePower={ id:string; disciplineId:string; disciplineName:string; name:string; level:number; cost:string; dicePool:string; opposingPool:string; source:string; executable:boolean; reason:string; firstTrait?:string; secondTrait?:string; rouseCost:0|1 }

function formula(pool:string, disciplineId:string):{firstTrait:string;secondTrait:string}|null {
  const match=/^([a-z ]+) \+ ([a-z -]+)$/i.exec(pool.trim())
  if(!match) return null
  const first=attrs[clean(match[1])]
  const secondLabel=clean(match[2])
  const discipline=disciplineDefinition(match[2])
  const second=skills[secondLabel] ?? (discipline?.id===disciplineId?discipline.id:undefined)
  return first && second ? { firstTrait:first,secondTrait:second } : null
}
function rouseCost(cost:string):0|1|null {
 const normalized=clean(cost)
 if(normalized==='free'||normalized==='none'||normalized==='no cost') return 0
 if(normalized==='one rouse check'||normalized==='1 rouse check') return 1
 return null
}
function selectedPowers(data:Record<string,unknown>):AvailablePower[] {
 const rows=disciplineRows(data)
 return rows.flatMap(row=>{
   const d=disciplineDefinition(row.disciplineId??row.name)
   const max=Number(row.level)
   if(!d||!Number.isSafeInteger(max)||max<1||max>5||!Array.isArray(row.powers)) return []
   const options=disciplinePowerOptions(d.id,max)
   return (row.powers as unknown[]).slice(0,max).flatMap((choice,index)=>{
     if(!choice||typeof choice!=='object'||Array.isArray(choice)) return []
     const picked=choice as Record<string,unknown>
     if(typeof picked.name!=='string'||!picked.name.trim()) return []
     const match=options.find(option=>clean(option.power.name)===clean(picked.name as string)&&option.level<=max)
     if(!match) return [{ id:`UNVERIFIED:${d.id}:${index}`,disciplineId:d.id,disciplineName:d.name,name:picked.name,level:index+1,cost:String(picked.cost??''),dicePool:String(picked.dicePool??''),opposingPool:'',source:'Poder personalizado',executable:false,reason:'Poder personalizado: avaliação assistida pelo Narrador.',rouseCost:0 as const }]
     const f=formula(match.power.dicePool,d.id)
     const cost=rouseCost(match.power.cost)
     const executable=Boolean(f&&cost!==null&&match.power.prerequisite==='Not stated in a separate field'&&match.power.amalgam==='Not stated in a separate field')
     const reason=!f?'Fórmula de dados não automatizável ou sem pool único.':cost===null?'Custo especial exige resolução assistida.':!executable?'Pré-requisitos adicionais exigem validação.':''
     return [{id:match.id,disciplineId:d.id,disciplineName:d.name,name:match.power.name,level:match.level,cost:match.power.cost,dicePool:match.power.dicePool,opposingPool:match.power.opposingPool,source:match.power.source,executable,reason,...(f??{}),rouseCost:cost??0}]
   })
 })
}

export async function getCharacterDisciplineRolls(actorId:string, characterId:string) {
 if(!uuid.test(characterId)) throw new CharacterCommandError(400,'Ficha inválida.')
 const character=await getCommandCharacter(characterId)
 if(!character) throw new CharacterCommandError(404,'Ficha não encontrada.')
 if(character.ownerId!==actorId && character.masterId!==actorId) throw new CharacterCommandError(403,'Acesso negado.')
 return {revision:character.revision, eligible:character.characterType==='PLAYER_VAMPIRE'&&(character.status==='APPROVED'||!character.campaignId&&character.status==='DRAFT'), powers:selectedPowers(character.data)}
}
export type DisciplineRollIntent={powerId:string;difficulty:number;expectedRevision:number;idempotencyKey:string}
export function rollCharacterDiscipline(actorId:string,characterId:string,input:DisciplineRollIntent,provider:DiceProvider=serverDiceProvider) {
 if(!input||typeof input.powerId!=='string'||input.powerId.length>400||!Number.isSafeInteger(input.difficulty)||input.difficulty<1||input.difficulty>50||!Number.isSafeInteger(input.expectedRevision)||input.expectedRevision<0||!uuid.test(input.idempotencyKey)) throw new CharacterCommandError(400,'Comando de Disciplina inválido.')
 return runCharacterCommand(actorId,characterId,{type:'DISCIPLINE_POWER_ROLLED',key:input.idempotencyKey,expectedRevision:input.expectedRevision,payload:input},character=>character.ownerId===actorId,async character=>{
   if(character.characterType!=='PLAYER_VAMPIRE'||!(character.status==='APPROVED'||!character.campaignId&&character.status==='DRAFT')) throw new CharacterCommandError(422,'Personagem indisponível para esta rolagem.')
   const power=selectedPowers(character.data).find(item=>item.id===input.powerId)
   if(!power) throw new CharacterCommandError(422,'Poder não adquirido nesta ficha.')
   if(!power.executable||!power.firstTrait||!power.secondTrait) throw new CharacterCommandError(422,power.reason||'Poder exige resolução assistida.')
   const state=readSessionState(character.data,character.gameState)
   if(state.humanity<=0||state.condition!=='ACTIVE') throw new CharacterCommandError(409,'A condição impede usar este poder.')
   if(state.hunger===5&&power.rouseCost>0) throw new CharacterCommandError(409,'Em Fome 5, o custo de Rouse exige resolução assistida.')
   const normalized=normalizeCharacterRulesInput(character.data)
   const first=normalized.attributes[power.firstTrait]
   const second=power.secondTrait===power.disciplineId?Number(disciplineRows(character.data).find(row=>disciplineDefinition(row.disciplineId??row.name)?.id===power.disciplineId)?.level):Number(normalized.skills[power.secondTrait]??normalized.skills[normalizeSpecialtySkillId(power.secondTrait)])
   if(!Number.isSafeInteger(first)||first<1||first>5||!Number.isSafeInteger(second)||second<0||second>5) throw new CharacterCommandError(422,'Traços necessários não cadastrados.')
   const policy=await getBloodPolicy(character.campaignId)
   let effects:ReturnType<typeof calculateBloodPotencyEffects>
   try { effects=calculateBloodPotencyEffects(character.data,policy.rulesetVersion,{...(character.gameState.bloodContext as BloodContext|undefined),characterRevision:character.revision,now:new Date().toISOString()},policy) }
   catch { throw new CharacterCommandError(422,'Confira Potência de Sangue e perfil de regras antes de usar o poder.') }
   const rouseRolls:number[]=[]
   if(power.rouseCost) {
     const firstRoll=drawD10(provider,1)[0];rouseRolls.push(firstRoll)
     if(firstRoll<6&&effects.disciplineRouseRerollMaxLevel>=power.level) rouseRolls.push(drawD10(provider,1)[0])
     if(rouseRolls.every(roll=>roll<6)) state.hunger=Math.min(5,state.hunger+1)
   }
   const pool=Math.min(50,first+second+effects.disciplinePowerBonusDice)
   const result=rollV5Pool(provider,pool,Math.min(pool,state.hunger),input.difficulty)
   character.gameState={...character.gameState,hunger:state.hunger}
   character.data={...character.data,fome:state.hunger}
   const roll=storeRoll(character,actorId,{mode:'TEST',pool,specialtyBonus:0,visibility:'PUBLIC',reason:`Disciplina: ${power.disciplineName} · ${power.name}`},result)
   return {ok:true,powerId:power.id,powerName:power.name,disciplineId:power.disciplineId,dicePool:power.dicePool,rouseRolls,hungerAfter:state.hunger,bonusDice:effects.disciplinePowerBonusDice,pool,roll,result}
 })
}
