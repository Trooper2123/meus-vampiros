import { disciplineContext } from './discipline-allocation'
import { disciplineDefinition } from './vtm-v5/disciplines'
import { evaluateDisciplineAccess } from './vtm-v5/discipline-access'
import { randomUUID } from 'node:crypto'
import { campaignPredatorOverrides } from './campaign-invitations'
import { CharacterCommandError, CommandCharacter, getCommandCharacter, runCharacterCommand } from './character-commands'
import { applyCreationEffects, creationEffects } from './creation-effects'
import { CLANS, validateClanSelection, type ClanSelection } from './vtm-v5/clans'
import { PREDATOR_TYPE_BY_CODE, validatePredatorType, type PredatorTypeCode } from './vtm-v5/predator-types'
import { campaignClanCodes } from './campaign-clans'
import { clanConditionOptions, readClanConditions, type ClanCondition } from './vtm-v5/clan-mechanics'
import { characterClan } from './vtm-v5/clans'

export async function getClanView(characterId: string, actorId: string) {
  const character = await getCommandCharacter(characterId)
  if (!character) throw new CharacterCommandError(404, 'Ficha não encontrada.')
  if (character.ownerId !== actorId && character.masterId !== actorId) throw new CharacterCommandError(403, 'Acesso negado.')
  const enabledClanCodes = await campaignClanCodes(character.campaignId)
  return structuredClone({
    revision: character.revision,
    independent: !character.campaignId,
    authorizedInitialDisciplines: (disciplineContext(character).grants ?? []).filter(grant => !grant.revokedAt && grant.acquisitionSource === 'CLAN' && grant.requirement === 'CLAN_ASSOCIATION' && grant.clanCode === disciplineContext(character).clanCode && grant.campaignId === character.campaignId && grant.createdByUserId === character.masterId).map(grant => ({ name: disciplineDefinition(grant.disciplineId)!.name, targetLevel: grant.targetLevel })),
    selection: character.data.clanSelection ?? (characterClan(character.data) ? { code: characterClan(character.data)!.code, disciplineDots: {} } : null),
    clans: CLANS.filter(clan => enabledClanCodes.includes(clan.code) || clan.code === character.data.clanCode).map(({ guidance, ...publicData }) => character.masterId === actorId ? { ...publicData, guidance } : publicData),
    enabledClanCodes,
    conditions: readClanConditions(character),
    conditionOptions: clanConditionOptions(character.data),
    canManageConditions: Boolean(character.campaignId && character.masterId === actorId),
  })
}

export function setCharacterClanConditions(characterId: string, actorId: string, active: unknown, expectedRevision: number, key: string) {
  if (!Array.isArray(active) || active.length > 3 || active.some(value => typeof value !== 'string') || new Set(active).size !== active.length) throw new CharacterCommandError(400, 'Condições de clã inválidas.')
  return runCharacterCommand(actorId, characterId, { key, expectedRevision, type: 'CLAN_CONDITIONS_SET', payload: { active } }, character => Boolean(character.campaignId && character.masterId === actorId), character => {
    const clan = characterClan(character.data)
    if (!clan || !['PLAYER_VAMPIRE', 'VAMPIRE_NPC'].includes(character.characterType)) throw new CharacterCommandError(422, 'Condições exigem clã definido em ficha de vampiro.')
    const allowed = clanConditionOptions(character.data)
    if (active.some(value => !allowed.includes(value as ClanCondition))) throw new CharacterCommandError(422, 'Condição incompatível com o clã da ficha.')
    character.gameState.clanConditions = { clanCode: clan.code, campaignId: character.campaignId, active: [...active] }
    return { ok: true, conditions: active }
  })
}

export async function selectCharacterClan(characterId: string, actorId: string, selection: ClanSelection, expectedRevision: number, key: string = randomUUID()) {
  return runCharacterCommand(actorId, characterId, { key, expectedRevision, type: 'CLAN_SELECTED', payload: selection }, character => character.ownerId === actorId || character.masterId === actorId, async character => {
    if (character.characterType !== 'PLAYER_VAMPIRE' || ['ARCHIVED', 'DISABLED'].includes(character.status) || (character.ownerId === actorId && character.masterId !== actorId && character.status !== 'DRAFT')) throw new CharacterCommandError(409, 'A ficha não permite esta escolha de clã.')
    let definition: ReturnType<typeof validateClanSelection>
    try {
      const candidate = { ...disciplineContext(character), clanCode: selection?.code, caitiffDisciplines: selection?.caitiffDisciplines }
      const authorized = Object.entries(selection?.disciplineDots ?? {}).filter(([name, targetLevel]) => evaluateDisciplineAccess({ character: candidate, disciplineId: name, acquisitionSource: 'CLAN', targetLevel }).eligible).map(([name]) => name)
      definition = validateClanSelection(selection, authorized, !character.campaignId)
    } catch { throw new CharacterCommandError(422, 'Escolhas de clã inválidas. Revise Disciplinas e requisitos do clã.') }
    selection = { ...selection, disciplineDots: Object.fromEntries(Object.entries(selection.disciplineDots).map(([name, dots]) => [disciplineDefinition(name)!.id, dots])), ...(selection.caitiffDisciplines ? { caitiffDisciplines: selection.caitiffDisciplines.map(name => disciplineDefinition(name)!.id) } : {}) }
    if (!(await campaignClanCodes(character.campaignId)).includes(selection.code)) throw new CharacterCommandError(422, 'Este clã não está habilitado na mesa.')
    const rows = (Array.isArray(character.data.disciplinas) ? character.data.disciplinas : []) as Record<string, unknown>[]
    const hasClanOrigin = creationEffects(character).some(effect => effect.origin === 'CLAN')
    const baseRows: Record<string, unknown>[] = rows.map(row => ({ ...row, level: Number(row.level) - creationEffects(character).filter(effect => effect.origin === 'PREDATOR' && effect.kind === 'DISCIPLINE' && effect.id === row.id).reduce((sum, effect) => sum + effect.dots, 0) }))
    const hasExistingDots = baseRows.some(row => Number(row.level) > 0)
    const adopt = !hasClanOrigin && hasExistingDots
    if (character.campaignId && adopt && (character.spentXp !== 0 || baseRows.filter(row => Number(row.level) > 0).length !== Object.keys(selection.disciplineDots).length || baseRows.some(row => Number(row.level) > 0 && selection.disciplineDots[disciplineDefinition(row.disciplineId ?? row.name)?.id ?? ''] !== row.level))) throw new CharacterCommandError(409, 'Disciplinas existentes não correspondem ao pacote escolhido. Revise a ficha sem sobrescrever pontos adquiridos.')
    validateClanTraits(selection,character)
    await validateClanPredation(character,selection,definition)
    const accessContext = { ...disciplineContext(character), clanCode: selection.code, caitiffDisciplines: selection.caitiffDisciplines }
    for (const [name, targetLevel] of Object.entries(selection.disciplineDots)) {
      const access = evaluateDisciplineAccess({ character: accessContext, disciplineId: disciplineDefinition(name)?.id ?? name, acquisitionSource: 'CLAN', targetLevel })
      if (character.campaignId && !access.eligible) throw new CharacterCommandError(422, access.blockers[0].message)
    }
    let clanTraits: Parameters<typeof applyCreationEffects>[3]
    if (selection.code === 'NOSFERATU') {
      clanTraits = [{ kind: 'FLAW', name: 'Repulsivo', dots: 2 }]
    } else if (selection.code === 'CAITIFF') {
      clanTraits = [{ kind: 'FLAW', name: 'Suspeito', dots: 1 }]
    } else {
      clanTraits = []
    }
    const independentDisciplines = !character.campaignId ? structuredClone(rows) : null
    applyCreationEffects(character, 'CLAN', character.campaignId ? selection.disciplineDots : {}, clanTraits, adopt)
    if (independentDisciplines) character.data.disciplinas = independentDisciplines
    character.data.clanSelection = structuredClone(selection)
    character.data.clanCode = definition.code
    character.data.clanRulesVersion = definition.version
    delete character.gameState.clanConditions
    character.data.cla = ['CAITIFF', 'THIN_BLOOD'].includes(selection.code) ? '' : definition.name
    character.data.isCaitiff = selection.code === 'CAITIFF'
    character.data.isThinBlood = selection.code === 'THIN_BLOOD'
    if (selection.code === 'THIN_BLOOD') { character.data.creationType = 'THIN_BLOOD'; character.data['potencia-de-sangue'] = 0 }
    else if (character.data.creationType === 'THIN_BLOOD') throw new CharacterCommandError(409, 'A troca de perfil sangue-ralo exige revisão da criação pelo Narrador.')
    character.status = 'DRAFT'
    return { ok: true, selection: character.data.clanSelection }
  })
}

async function validateClanPredation(character: CommandCharacter,selection: ClanSelection,definition: ReturnType<typeof validateClanSelection>) {
const predator=PREDATOR_TYPE_BY_CODE.get(character.data.predatorTypeCode as PredatorTypeCode)
const predatorSelection=character.data.predatorTypeSelection as { discipline?: string} |undefined
if(predator&&['BAGGER','OSIRIS'].includes(predator.code)&&predatorSelection?.discipline==='Feitiçaria de Sangue'&&selection.code!=='TREMERE') throw new CharacterCommandError(422,'A disciplina de predação atual exige Tremere.')
if(predator&&!validatePredatorType(predator,{ clan: definition.name,bloodPotency: Number(character.data['potencia-de-sangue']??0),isThinBlood: selection.code==='THIN_BLOOD',enabled: true,creationType: character.data.creationType,overrides: await campaignPredatorOverrides(character.campaignId) }).valid) throw new CharacterCommandError(422,'O clã é incompatível com a predação atual.')
}

function validateClanTraits(selection: ClanSelection,character: CommandCharacter) {
if(selection.code==='THIN_BLOOD'&&character.data.predatorTypeCode) throw new CharacterCommandError(422,'Remova a predação antes de selecionar sangue-ralo.')
if(selection.code==='CAITIFF'&&Array.isArray(character.data.vantagens)&&character.data.vantagens.some(trait => trait&&typeof trait==='object'&&/^status$/iu.test(String(trait.name).trim())&&Number(trait.level)>0)) throw new CharacterCommandError(422,'Caitiff não pode iniciar com Status positivo.')
}
