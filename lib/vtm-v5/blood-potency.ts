import { characterText } from './text'
import { BLOOD_CATEGORIES, BLOOD_POTENCY_RULES, GENERATION_POTENCY_LIMITS, feedingRule, type BloodCategory, type BloodRuleset } from './blood-potency-catalog'
export { BLOOD_CATEGORIES, BLOOD_POTENCY_RULES, BLOOD_RULESETS } from './blood-potency-catalog'
export const BLOOD_POTENCY_DERIVED_FIELDS = ['surto-de-sangue', 'quantidade-recuperada', 'bonus-de-poder', 'rerrolagem-de-sangue', 'penalidade-de-alimentacao', 'gravidade-da-perdicao', 'bloodPotencyEffects', 'bloodEffects', 'bloodContext', 'bloodRules'] as const
export type BloodPolicy = { rulesetVersion: BloodRuleset; allowPlayerPotencyAboveFive: boolean; communityEnabled: boolean }
export const DEFAULT_BLOOD_POLICY: BloodPolicy = { rulesetVersion: 'CORE_V5_ORIGINAL_V1', allowPlayerPotencyAboveFive: false, communityEnabled: false }
export type BloodEffect = {
 id: string; source: 'BLOOD_OF_POTENCY' | 'BLOODS_CURSE' | 'POWERFUL_VITAE' | 'WEAK_BLOOD' | 'HEALERS_BANE' | 'DILUTE_THE_LINE' | 'SLOW_BLOOD' | 'FLUENT_STRENGTH' | 'FLUENT_ENDURANCE' | 'FLUENT_SWIFTNESS' | 'SHALLOW_SLUMBER' | 'CLAN_CURSE';
 delta?: number; category?: BloodCategory; clanCode?: string;
 expires: { kind: 'SCENE' | 'NIGHT' | 'DAWN' | 'INSTANT' | 'CONDITION' | 'PERMANENT'; value?: string };
}
export type BloodContext = { now?: string; sceneId?: string; nightId?: string; conditionIds?: string[]; characterRevision?: number; effects?: BloodEffect[] }
export function assertPermanentBloodPotency(data: Record<string, unknown>, policy: BloodPolicy = DEFAULT_BLOOD_POLICY) {
 const raw = data['potencia-de-sangue']
 const potency = typeof raw === 'number' || (typeof raw === 'string' && raw.trim()) ? Number(raw) : Number.NaN
 if (!Number.isSafeInteger(potency) || potency < 0 || potency > 10) { throw new Error('Informe uma Potência do Sangue inteira de 0 a 10.') }
 const thin = data.isThinBlood === true || data.creationType === 'THIN_BLOOD' || data.clanCode === 'THIN_BLOOD' || ['sangue-ralo','sangue-fraco'].includes(characterText(data.cla).toLocaleLowerCase('pt-BR'))
 if (thin && potency !== 0) { throw new Error('Sangue-ralo exige Potência do Sangue 0.') }
 if (data.geracao !== undefined && data.geracao !== '') {
  const limits = GENERATION_POTENCY_LIMITS[Number(data.geracao)]
  if (!limits || potency < limits[0] || potency > limits[1]) { throw new Error('Potência permanente incompatível com os limites da geração.') }
 }
 if (data.characterType === 'PLAYER_VAMPIRE' && potency > 5 && !policy.allowPlayerPotencyAboveFive) { throw new Error('Potência 6+ para jogador exige autorização da mesa.') }
 return { potency, thin }
}
export function activeBloodEffects(context: BloodContext): BloodEffect[] {
 return (context.effects ?? []).filter(effect => {
  const expiration = effect.expires
  if (expiration.kind === 'PERMANENT') { return true }
  if (expiration.kind === 'INSTANT') { return Date.parse(expiration.value ?? '') > Date.parse(context.now ?? new Date().toISOString()) }
  if (expiration.kind === 'SCENE') { return Boolean(context.sceneId && expiration.value === context.sceneId) }
  if (expiration.kind === 'NIGHT' || expiration.kind === 'DAWN') { return Boolean(context.nightId && expiration.value === context.nightId) }
  return Boolean(expiration.value && context.conditionIds?.includes(expiration.value))
 })
}
const community = new Set(['POWERFUL_VITAE','WEAK_BLOOD','HEALERS_BANE','DILUTE_THE_LINE','SLOW_BLOOD'])
const categoriesForMerit = new Set<BloodCategory>(['BLOOD_SURGE','SUPERFICIAL_MENDING','DISCIPLINE_BONUS','DISCIPLINE_ROUSE_REROLL'])
export function calculateBloodPotencyEffects(data: Record<string, unknown>, rulesetVersion = 'CORE_V5_ORIGINAL_V1', context: BloodContext = {}, policy: BloodPolicy = defaultBloodPolicy(rulesetVersion)) {
 const rules = BLOOD_POTENCY_RULES[rulesetVersion as BloodRuleset]
 if (!rules) { throw new Error('Perfil de Potência do Sangue não cadastrado.') }
 const { potency, thin } = assertPermanentBloodPotency(data, policy)
 const effects = activeBloodEffects(context)
 const seen=validateBloodEffectSources(effects,policy,rulesetVersion)
 const globalLevel=globalBloodLevel(potency,effects)
 const levels = Object.fromEntries(BLOOD_CATEGORIES.map(category => [category, globalLevel])) as Record<BloodCategory, number>
 applyCategoryBloodEffects(effects,thin,levels)
 for (const level of Object.values(levels)) if (!Number.isSafeInteger(level) || !rules[level]) { throw new Error('Nível efetivo fora do catálogo 0–10; nenhum valor foi presumido.') }
 const caitiff = data.isCaitiff === true || data.clanCode === 'CAITIFF' || characterText(data.cla).toLocaleLowerCase('pt-BR') === 'caitiff'
 const traits = [...(Array.isArray(data.defeitos) ? data.defeitos : []), ...(Array.isArray(data.vantagens) ? data.vantagens : [])] as Record<string, unknown>[]
 const hasTrait = (code: string) => traits.some(trait => trait.code === code || trait.id === code || characterText(trait.nome ?? trait.name).toUpperCase().replaceAll(' ','_') === code)
 const curse = effects.find(effect => (effect.source === 'CLAN_CURSE' || effect.source === 'BLOODS_CURSE') && effect.clanCode)
 const baneApplicable = (!thin && !caitiff) || Boolean(curse)
 const tableBaneSeverity = rules[levels.BANE_SEVERITY][4]
 const effectiveBaneSeverity = effectiveBane(baneApplicable,curse?.source,tableBaneSeverity)
 const mendingAllowed = !hasTrait('MORTAL_FRAILTY') && !seen.has('HEALERS_BANE')
 if (hasTrait('MORTAL_FRAILTY') && hasTrait('VAMPIRIC_RESILIENCE')) { throw new Error('Mortal Frailty não pode coexistir com Vampiric Resilience.') }
 return {
  bloodPotency: potency, permanentBloodPotency: potency, globalEffectiveBloodPotency: globalLevel, effectiveLevelByCategory: levels,
  rulesetVersion, catalogRevision: '2026-10-17-v1', characterRevision: String(context.characterRevision ?? 0),
  bloodSurgeDice: rules[levels.BLOOD_SURGE][0], superficialMendAmount: rules[levels.SUPERFICIAL_MENDING][1], mendingAllowed,
  disciplinePowerBonusDice: rules[levels.DISCIPLINE_BONUS][2], disciplineRouseRerollMaxLevel: rules[levels.DISCIPLINE_ROUSE_REROLL][3],
  tableBaneSeverity, effectiveBaneSeverity, baneApplicable, baneSeverity: effectiveBaneSeverity,
  feedingPenalty: feedingRule(levels.FEEDING),
  publicExplanations: BLOOD_CATEGORIES.filter(category => levels[category] !== potency).map(category => ({category, text: 'Categoria calculada com Potência efetiva '+levels[category]+'.'})),
  sourceRefs: [{ file: rulesetVersion === 'COMPANION_ERRATA_P63_V1' ? 'V5 Companion' : 'Vampire: The Masquerade', printedPages: rulesetVersion === 'COMPANION_ERRATA_P63_V1' ? '61, 63' : '214–219', pdfPages: rulesetVersion === 'COMPANION_ERRATA_P63_V1' ? '61, 63' : '216–221' }],
  sourceReference: 'Referência: '+rulesetVersion+'; catálogo 2026-10-17-v1.',
 }
}
export type BloodPotencyEffects = ReturnType<typeof calculateBloodPotencyEffects>

function applyCategoryBloodEffects(effects: BloodEffect[],thin: boolean,levels: Record<"BLOOD_SURGE"|"SUPERFICIAL_MENDING"|"DISCIPLINE_BONUS"|"DISCIPLINE_ROUSE_REROLL"|"FEEDING"|"BANE_SEVERITY",number>) {
  const changed=new Set<BloodCategory>()
  for(const effect of effects) {
    const { targets,delta }: { targets: ("BLOOD_SURGE"|"SUPERFICIAL_MENDING"|"DISCIPLINE_BONUS"|"DISCIPLINE_ROUSE_REROLL"|"FEEDING"|"BANE_SEVERITY")[]; delta: number }=categoryBloodModifier(effect,thin)
    for(const category of targets) {
      if(changed.has(category)) { throw new Error('Modificadores de categoria conflitantes.') }
      changed.add(category)
      levels[category]+=delta
      if(effect.source==='WEAK_BLOOD') { levels[category]=Math.max(1,levels[category]) }
    }
  }
}

function categoryBloodModifier(effect: BloodEffect,thin: boolean) {
  let targets: BloodCategory[]=[]
  let delta=effect.delta??0
  if(effect.source==='BLOODS_CURSE') {
    if(![2,4].includes(delta)) { throw new Error('Blood’s Curse exige aumento 2 ou 4.') }
    targets=['FEEDING','BANE_SEVERITY']
  } else if(effect.source==='POWERFUL_VITAE'||effect.source==='WEAK_BLOOD') {
    if(!effect.category||!categoriesForMerit.has(effect.category)||thin) { throw new Error('Categoria comunitária inválida ou combinação sem regra para sangue-ralo.') }
    targets=[effect.category]; delta=effect.source==='POWERFUL_VITAE'? 1:-1
  }
  return { targets,delta }
}

function globalBloodLevel(potency: number,effects: BloodEffect[]) {
  let globalLevel=potency
  const globalEffects=effects.filter(effect => ['BLOOD_OF_POTENCY','DILUTE_THE_LINE'].includes(effect.source))
  if(globalEffects.length>1) { throw new Error('Modificadores globais conflitantes; é necessária política explícita.') }
  for(const effect of globalEffects) {
    if(effect.source==='DILUTE_THE_LINE') { throw new Error('Dilute the Line exige política explícita de piso e geração.') }
    if(![1,2].includes(effect.delta??0)) { throw new Error('Aumento temporário inválido.') }
    globalLevel+=effect.delta!
  }
  return globalLevel
}

function validateBloodEffectSources(effects: BloodEffect[],policy: BloodPolicy,rulesetVersion: string) {
  const seen=new Set<string>()
  for(const effect of effects) {
    if(seen.has(effect.source)) { throw new Error('Efeitos repetidos exigem política de acumulação explícita.') }
    seen.add(effect.source)
    if(community.has(effect.source)&&(!policy.communityEnabled||rulesetVersion!=='COMPANION_ERRATA_P63_V1')) { throw new Error('Efeito comunitário exige pacote habilitado e perfil Companion.') }
  }
  return seen
}

function defaultBloodPolicy(rulesetVersion:string):BloodPolicy{return {...DEFAULT_BLOOD_POLICY,rulesetVersion:rulesetVersion as BloodRuleset}}
function effectiveBane(applicable:boolean,source:string|undefined,severity:number){
 if(!applicable){ return null }
 if(source==='CLAN_CURSE'){ return 1 }
 return severity
}
