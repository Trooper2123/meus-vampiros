export const BLOOD_POTENCY_DERIVED_FIELDS = ['surto-de-sangue', 'quantidade-recuperada', 'bonus-de-poder', 'rerrolagem-de-sangue', 'penalidade-de-alimentacao', 'gravidade-da-perdicao', 'bloodPotencyEffects'] as const

const core = [
  { bloodSurgeDice: null, superficialMendAmount: 1, disciplinePowerBonusDice: null, disciplineRouseRerollMaxLevel: null, baneSeverity: 0 },
  { bloodSurgeDice: 1, superficialMendAmount: 1, disciplinePowerBonusDice: null, disciplineRouseRerollMaxLevel: 1, baneSeverity: 1 },
  { bloodSurgeDice: 1, superficialMendAmount: 2, disciplinePowerBonusDice: 1, disciplineRouseRerollMaxLevel: 1, baneSeverity: 1 },
  { bloodSurgeDice: 2, superficialMendAmount: 2, disciplinePowerBonusDice: 1, disciplineRouseRerollMaxLevel: 2, baneSeverity: 2 },
  { bloodSurgeDice: 2, superficialMendAmount: 3, disciplinePowerBonusDice: 2, disciplineRouseRerollMaxLevel: 2, baneSeverity: 2 },
  { bloodSurgeDice: 3, superficialMendAmount: 3, disciplinePowerBonusDice: 2, disciplineRouseRerollMaxLevel: 3, baneSeverity: 3 },
] as const

export function calculateBloodPotencyEffects(data: Record<string, unknown>, rulesetVersion = 'CORE_V5') {
  if (rulesetVersion !== 'CORE_V5') throw new Error('Perfil de Potência do Sangue não cadastrado.')
  const raw = data['potencia-de-sangue']
  const bloodPotency = typeof raw === 'number' || (typeof raw === 'string' && raw.trim()) ? Number(raw) : NaN
  if (!Number.isSafeInteger(bloodPotency) || bloodPotency < 0 || bloodPotency > 10) throw new Error('Informe uma Potência do Sangue inteira de 0 a 10.')
  const row = core[bloodPotency]
  if (!row) throw new Error('Potência 6–10 sem tabela verificada. Solicite revisão ao Narrador; nenhum valor foi presumido.')
  const clan = String(data.cla ?? '').trim().toLocaleLowerCase('pt-BR')
  const thinBlood = data.isThinBlood === true || data.creationType === 'THIN_BLOOD' || data.clanCode === 'THIN_BLOOD' || clan === 'sangue-fraco'
  if (thinBlood && bloodPotency !== 0) throw new Error('Sangue-fraco exige Potência do Sangue 0.')
  const caitiff = data.isCaitiff === true || data.clanCode === 'CAITIFF' || clan === 'caitiff'
  const descriptions = ['Sem efeito', 'Sem efeito', 'Sangue animal e ensacado saciam metade da Fome habitual.', 'Sangue animal e ensacado não saciam Fome.', 'Sangue animal e ensacado não saciam Fome; sangue humano sacia 1 ponto a menos por humano.', 'Sangue animal e ensacado não saciam Fome; sangue humano sacia 1 ponto a menos por humano; somente drenar e matar um humano reduz Fome abaixo de 2.']
  return {
    ...row, bloodPotency, rulesetVersion,
    baneSeverity: thinBlood ? 0 : caitiff ? null : row.baneSeverity,
    feedingPenalty: { code: `CORE_V5_BP_${bloodPotency}`, params: { animalAndBaggedMultiplier: bloodPotency >= 3 ? 0 : bloodPotency === 2 ? 0.5 : 1, humanReductionPenalty: bloodPotency >= 4 ? 1 : 0, minimumHungerWithoutKilling: bloodPotency >= 5 ? 2 : null }, displayText: descriptions[bloodPotency] },
    sourceReference: 'Referência local: spec-autopreenchimento-potencia-sangue-vtm-v5.md; CORE_V5, livro base pp. 216–218.',
  }
}

export type BloodPotencyEffects = ReturnType<typeof calculateBloodPotencyEffects>
