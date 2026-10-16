import { randomUUID } from 'node:crypto'
import { campaignPredatorOverrides } from './campaign-invitations'
import { CharacterCommandError, getCommandCharacter, runCharacterCommand } from './character-commands'
import { applyCreationEffects, creationEffects } from './creation-effects'
import { CLANS, normalizeDiscipline, validateClanSelection, type ClanSelection } from './vtm-v5/clans'
import { PREDATOR_TYPE_BY_CODE, validatePredatorType, type PredatorTypeCode } from './vtm-v5/predator-types'
import { campaignClanCodes } from './campaign-clans'

export async function getClanView(characterId: string, actorId: string) {
  const character = await getCommandCharacter(characterId)
  if (!character) throw new CharacterCommandError(404, 'Ficha não encontrada.')
  if (character.ownerId !== actorId && character.masterId !== actorId) throw new CharacterCommandError(403, 'Acesso negado.')
  return structuredClone({
    revision: character.revision,
    selection: character.data.clanSelection ?? null,
    clans: CLANS.filter(clan => campaignClanCodes(character.campaignId).includes(clan.code) || clan.code === character.data.clanCode).map(({ guidance, ...publicData }) => character.masterId === actorId ? { ...publicData, guidance } : publicData),
    enabledClanCodes: campaignClanCodes(character.campaignId),
  })
}

export async function selectCharacterClan(characterId: string, actorId: string, selection: ClanSelection, expectedRevision: number, key: string = randomUUID()) {
  let definition: ReturnType<typeof validateClanSelection>
  try { definition = validateClanSelection(selection) }
  catch { throw new CharacterCommandError(422, 'Escolhas de clã inválidas. Revise disciplinas, preferência alimentar e categoria da Perdição.') }
  return runCharacterCommand(actorId, characterId, { key, expectedRevision, type: 'CLAN_SELECTED', payload: selection }, character => character.ownerId === actorId || character.masterId === actorId, character => {
    if (character.characterType !== 'PLAYER_VAMPIRE' || ['ARCHIVED', 'DISABLED'].includes(character.status) || (character.ownerId === actorId && character.masterId !== actorId && character.status !== 'DRAFT')) throw new CharacterCommandError(409, 'A ficha não permite esta escolha de clã.')
    if (!campaignClanCodes(character.campaignId).includes(selection.code)) throw new CharacterCommandError(422, 'Este clã não está habilitado na mesa.')
    const rows = (Array.isArray(character.data.disciplinas) ? character.data.disciplinas : []) as Record<string, unknown>[]
    const hasClanOrigin = creationEffects(character).some(effect => effect.origin === 'CLAN')
    const baseRows: Record<string, unknown>[] = rows.map(row => ({ ...row, level: Number(row.level) - creationEffects(character).filter(effect => effect.origin === 'PREDATOR' && effect.kind === 'DISCIPLINE' && effect.id === row.id).reduce((sum, effect) => sum + effect.dots, 0) }))
    const hasExistingDots = baseRows.some(row => Number(row.level) > 0)
    const adopt = !hasClanOrigin && hasExistingDots
    if (adopt && (character.spentXp !== 0 || baseRows.filter(row => Number(row.level) > 0).length !== Object.keys(selection.disciplineDots).length || baseRows.some(row => Number(row.level) > 0 && selection.disciplineDots[normalizeDiscipline(String(row.name))] !== row.level))) throw new CharacterCommandError(409, 'Disciplinas existentes não correspondem ao pacote escolhido. Revise a ficha sem sobrescrever pontos adquiridos.')
    if (selection.code === 'THIN_BLOOD' && character.data.predatorTypeCode) throw new CharacterCommandError(422, 'Remova a predação antes de selecionar sangue-fraco.')
    if (selection.code === 'NOSFERATU' && (character.data.predatorTypeCode === 'SIREN' || (Array.isArray(character.data.vantagens) && character.data.vantagens.some(trait => trait && typeof trait === 'object' && /apar[eê]ncia|beautiful|looks|bela/iu.test(String(trait.name)) && Number(trait.level) > 0)))) throw new CharacterCommandError(422, 'Nosferatu não pode receber Aparência positiva ou predação Siren.')
    if (selection.code === 'CAITIFF' && Array.isArray(character.data.vantagens) && character.data.vantagens.some(trait => trait && typeof trait === 'object' && /^status$/iu.test(String(trait.name).trim()) && Number(trait.level) > 0)) throw new CharacterCommandError(422, 'Caitiff não pode iniciar com Status positivo.')
    const predator = PREDATOR_TYPE_BY_CODE.get(character.data.predatorTypeCode as PredatorTypeCode)
    const predatorSelection = character.data.predatorTypeSelection as { discipline?: string } | undefined
    if (predator && ['BAGGER', 'OSIRIS'].includes(predator.code) && predatorSelection?.discipline === 'Feitiçaria de Sangue' && selection.code !== 'TREMERE') throw new CharacterCommandError(422, 'A disciplina de predação atual exige Tremere.')
    if (predator && !validatePredatorType(predator, { clan: definition.name, bloodPotency: Number(character.data['potencia-de-sangue'] ?? 0), isThinBlood: selection.code === 'THIN_BLOOD', enabled: true, overrides: campaignPredatorOverrides(character.campaignId) }).valid) throw new CharacterCommandError(422, 'O clã é incompatível com a predação atual.')
    applyCreationEffects(character, 'CLAN', selection.disciplineDots, selection.code === 'NOSFERATU' ? [{ kind: 'FLAW', name: 'Repulsivo', dots: 2 }] : selection.code === 'CAITIFF' ? [{ kind: 'FLAW', name: 'Suspeito', dots: 1 }] : [], adopt)
    character.data.clanSelection = structuredClone(selection)
    character.data.clanCode = definition.code
    character.data.clanRulesVersion = definition.version
    character.data.cla = ['CAITIFF', 'THIN_BLOOD'].includes(selection.code) ? '' : definition.name
    character.data.isCaitiff = selection.code === 'CAITIFF'
    character.data.isThinBlood = selection.code === 'THIN_BLOOD'
    if (selection.code === 'THIN_BLOOD') { character.data.creationType = 'THIN_BLOOD'; character.data['potencia-de-sangue'] = 0 }
    else if (character.data.creationType === 'THIN_BLOOD') throw new CharacterCommandError(409, 'A troca de perfil sangue-fraco exige revisão da criação pelo Narrador.')
    character.status = 'DRAFT'
    return { ok: true, selection: character.data.clanSelection }
  })
}
