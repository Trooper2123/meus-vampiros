import { CLANS } from './clans'
import { CLAN_DISCIPLINES, disciplineDefinition, type DisciplineId } from './disciplines'
import { PREDATOR_TYPE_BY_CODE, type PredatorTypeCode } from './predator-types'

export type AcquisitionSource = 'CLAN' | 'PREDATOR' | 'XP'
export type DisciplineRequirement = 'CLAN_ASSOCIATION' | 'LEARNING_APPROVAL'
export type DisciplineAccessGrant = { id: string; disciplineId: DisciplineId; acquisitionSource: AcquisitionSource; targetLevel: number; requirement: DisciplineRequirement; clanCode?: string; campaignId: string; createdByUserId: string; reason: string; createdAt: string; revokedAt?: string }
export type DisciplineAcquisition = { id: string; disciplineId: DisciplineId; source: AcquisitionSource; fromLevel: number; targetLevel: number; xpCost: number; createdByUserId?: string; createdAt?: string }
export type DisciplineAccessCharacter = {
  clanCode?: string; isThinBlood?: boolean; caitiffDisciplines?: readonly string[];
  predatorCode?: string; predatorDiscipline?: string; currentLevel?: number;
  campaignId?: string | null; masterId?: string | null; grants?: readonly DisciplineAccessGrant[];
}
export function evaluateDisciplineAccess({ character, disciplineId, acquisitionSource, targetLevel }: {
  character: DisciplineAccessCharacter; disciplineId: string; acquisitionSource: AcquisitionSource; targetLevel: number;
}) {
  const discipline = disciplineDefinition(disciplineId)
  const blockers: { code: string; message: string }[] = []
  const block = (code: string, message: string) => blockers.push({ code, message })
  const inClan = Boolean(discipline && (CLAN_DISCIPLINES[character.clanCode ?? ''] ?? []).includes(discipline.id))
  const waived = (requirement: DisciplineRequirement) => character.grants?.some(grant => !grant.revokedAt && grant.requirement === requirement && (requirement !== 'CLAN_ASSOCIATION' || grant.clanCode === character.clanCode) && grant.disciplineId === discipline?.id && grant.acquisitionSource === acquisitionSource && grant.targetLevel === targetLevel && grant.campaignId === character.campaignId && grant.createdByUserId === character.masterId && Boolean(character.masterId))
  if (!discipline) block('UNKNOWN_DISCIPLINE', 'Disciplina desconhecida.')
  if (!Number.isSafeInteger(targetLevel) || targetLevel < 1 || targetLevel > 5) block('INVALID_LEVEL', 'O nível deve ser um inteiro de 1 a 5.')
  const thinBlood = character.clanCode === 'THIN_BLOOD' || character.isThinBlood
  if (thinBlood && acquisitionSource === 'CLAN') block('THIN_BLOOD_POLICY', 'Sangue-fraco não recebe o pacote inicial 2+1.')
  if (discipline?.id === 'THIN_BLOOD_ALCHEMY' || thinBlood && acquisitionSource === 'XP') block('RULES_NOT_CONFIGURED', 'Alquimia e aquisições permanentes de sangue-fraco exigem catálogo próprio; aquisição indisponível.')
  if (acquisitionSource === 'CLAN' && !thinBlood) {
    const caitiff = character.clanCode === 'CAITIFF'
    const available = caitiff ? character.caitiffDisciplines?.map(value => disciplineDefinition(value)?.id) ?? [] : CLAN_DISCIPLINES[character.clanCode ?? ''] ?? []
    if (!discipline || !available.includes(discipline.id)) {
      if (!waived('CLAN_ASSOCIATION')) block('CLAN_ASSOCIATION', `${discipline?.name ?? disciplineId} não está disponível para a distribuição inicial do clã ${CLANS.find(clan => clan.code === character.clanCode)?.name ?? 'não definido'}.`)
    }
    if (targetLevel > 2) block('INITIAL_LEVEL_LIMIT', 'A distribuição inicial permite 2 pontos em uma Disciplina e 1 em outra.')
  }
  if (acquisitionSource === 'PREDATOR') {
    const definition = PREDATOR_TYPE_BY_CODE.get(character.predatorCode as PredatorTypeCode)
    if (!discipline || !definition?.disciplineOptions.some(name => disciplineDefinition(name)?.id === discipline.id) || disciplineDefinition(character.predatorDiscipline)?.id !== discipline.id) block('PREDATOR_CHOICE', 'A Disciplina não corresponde à escolha válida de predação.')
    if (['BAGGER', 'OSIRIS'].includes(character.predatorCode ?? '') && discipline?.id === 'BLOOD_SORCERY' && character.clanCode !== 'TREMERE') block('PREDATOR_CLAN', 'Esta escolha de Feitiçaria de Sangue exige Tremere.')
    if (targetLevel !== (character.currentLevel ?? 0) + 1) block('PREDATOR_LEVEL', 'Predação concede exatamente um ponto.')
  }
  const xpCost = acquisitionSource === 'XP' ? targetLevel * (character.clanCode === 'CAITIFF' ? 6 : inClan ? 5 : 7) : 0
  if (acquisitionSource === 'XP') {
    if (!character.clanCode || !Object.hasOwn(CLAN_DISCIPLINES, character.clanCode)) block('CLAN_REQUIRED', 'Defina o clã ou a política Caitiff antes de evoluir.')
    if (targetLevel !== (character.currentLevel ?? 0) + 1) block('NEXT_LEVEL_REQUIRED', 'Compre somente o próximo nível.')
    if (!waived('LEARNING_APPROVAL')) block('LEARNING_APPROVAL', 'O aprendizado precisa de autorização específica do Narrador para esta Disciplina e nível.')
  }
  return { eligible: blockers.length === 0, blockers, inClan, xpCost }
}

