import type { MechanicalOption, PredatorTypeCode } from './types'

export type PredatorChoiceGroup = { code: string; totalDots: number; mode: 'ONE' | 'DISTRIBUTE'; options: readonly MechanicalOption[] }
const trait = (code: string, label: string, dots: number, kind: MechanicalOption['kind'] = 'MERIT'): MechanicalOption => ({ code, label, dots, kind })
const group = (code: string, totalDots: number, mode: PredatorChoiceGroup['mode'], options: MechanicalOption[]): PredatorChoiceGroup => ({ code, totalDots, mode, options })

const fixed: Record<PredatorTypeCode, { merits?: [string, number][]; flaws?: [string, number][]; humanity?: number; potency?: number }> = {
  ALLEYCAT: { merits: [['Contatos criminosos', 3]], humanity: -1 },
  BAGGER: { merits: [['Estômago de Ferro', 3]], flaws: [['Inimigo', 2]] },
  BLOOD_LEECH: { flaws: [['Exclusão de Presa: mortais', 2]], humanity: -1, potency: 1 },
  CLEAVER: { merits: [['Rebanho', 2]], flaws: [['Segredo Sombrio: Cleaver', 1]] },
  CONSENSUALIST: { flaws: [['Segredo Sombrio: violação da Máscara', 1], ['Exclusão de Presa: sem consentimento', 1]], humanity: 1 },
  FARMER: { flaws: [['Vegano', 2]], humanity: 1 },
  OSIRIS: {}, SANDMAN: { merits: [['Recursos', 1]] },
  SCENE_QUEEN: { merits: [['Fama', 1], ['Contato', 1]] },
  SIREN: { merits: [['Aparência: Bela', 2]], flaws: [['Inimigo', 1]] },
  BUSINESS_OWNER: { merits: [['Proprietário de Negócio', 3]], flaws: [['Rotina', 2]] },
  CORPORATE_LEECH: { merits: [['Poder por trás do Trono', 3]], flaws: [['Sem graça', 1], ['Segredo Sombrio', 1]] },
  CONFIDANT: { merits: [['Presença de Apoio', 1]], flaws: [['Remorso', 1], ['Habitante do Memoriam', 1], ['Lealdades Conflitantes', 2]] },
  EAT_THE_RICH: { merits: [['Infiltrador de Clã', 3]], flaws: [['Besta Raivosa', 2]] },
  HIDE_AND_EAT: { merits: [['Alimentação Eficiente', 2], ['Escorregadio', 1]], flaws: [['Predador Óbvio', 2]] },
  KIDNAPPER: { merits: [['Refúgio Base', 2], ['Cela', 1]], flaws: [['Sádico', 2]], humanity: -1 },
  HOSPITAL_HUNTER: { merits: [['Curandeiro de Sangue', 3]], flaws: [['Aura Frígida', 2]] },
  LAB_RAT: { merits: [['Carniçais Aprimorados', 3]], flaws: [['Presas Embotadas', 1], ['Vício', 1]] },
  LOCAL_HAUNT: { merits: [['Conhecedor de Lendas', 3]], flaws: [['Presença Sinistra', 2]] },
  MANIC_PIXIE_PREDATOR: { merits: [['Engenheiro Social', 3]], flaws: [['Incapaz de Abraçar', 2]] },
  LURKER_IN_THE_CROWD: { merits: [['Obscuro', 3]], flaws: [['Forasteiro', 2]] },
  ONLINE_PREDATOR: { merits: [['Máscara', 2]], flaws: [['Paranoia', 2]] },
  OPPORTUNIST: { merits: [['Adiar Destruição', 3]], flaws: [['Excesso de Confiança', 2]] },
  PAY_FOR_BLOOD: { flaws: [['Desprezado', 2]] },
  PACK_HUNTER: { merits: [['Predador Alfa', 3]], flaws: [['Impetuoso', 1], ['Sono Profundo', 1]] },
  STREET_FEEDER: { merits: [['Senso de Perigo', 3]], flaws: [['Destituído', 1]] },
  WATCHER_FROM_THE_WATER: { merits: [['Sentidos Aguçados', 2], ['Escorregadio', 1]], flaws: [['Sem Refúgio', 1]] },
  WOLF_IN_SHEEPS_CLOTHING: { merits: [['Temerário', 3]], flaws: [['Subestimado', 1], ['Beijo da Morte', 2]] },
}

export const PREDATOR_CHOICE_GROUPS: Partial<Record<PredatorTypeCode, readonly PredatorChoiceGroup[]>> = {
  BLOOD_LEECH: [group('SECRET', 2, 'ONE', [trait('DIABLERIST', 'Segredo Sombrio: Diablerista', 2, 'FLAW'), trait('SHUNNED', 'Rejeitado', 2, 'FLAW')])],
  OSIRIS: [group('FOLLOWERS', 3, 'DISTRIBUTE', [trait('FAME', 'Fama', 3, 'BACKGROUND'), trait('HERD', 'Rebanho', 3, 'BACKGROUND')]), group('COSTS', 2, 'DISTRIBUTE', [trait('ENEMIES', 'Inimigos', 2, 'FLAW'), trait('MYTHIC', 'Defeitos Míticos', 2, 'FLAW')])],
  SCENE_QUEEN: [group('EXCLUSION', 1, 'ONE', [trait('DISLIKED', 'Influência: Malvisto', 1, 'FLAW'), trait('PREY', 'Exclusão de Presa: outra subcultura', 1, 'FLAW')])],
  ONLINE_PREDATOR: [group('IDENTITY', 1, 'ONE', [trait('ZEROED', 'Apagado', 1), trait('COBBLER', 'Falsificador', 1)])],
  PAY_FOR_BLOOD: [group('PAYMENT', 3, 'DISTRIBUTE', [trait('RESOURCES', 'Recursos', 3, 'BACKGROUND'), trait('INFLUENCE', 'Influência', 3, 'BACKGROUND')])],
}

export function predatorMechanics(code: PredatorTypeCode) {
  const entry = fixed[code]
  const bonusOptions = (entry.merits ?? []).map(([name, dots], index) => trait(`BONUS_${index}`, name, dots))
  const flawsOrCosts = (entry.flaws ?? []).map(([name, dots], index) => trait(`FLAW_${index}`, name, dots, 'FLAW'))
  if (entry.humanity) (entry.humanity > 0 ? bonusOptions : flawsOrCosts).push({ code: 'HUMANITY', label: `Humanidade ${entry.humanity}`, kind: 'HUMANITY', modifier: entry.humanity })
  if (entry.potency) bonusOptions.push({ code: 'BLOOD_POTENCY', label: 'Potência de Sangue +1', kind: 'BLOOD_POTENCY', modifier: entry.potency })
  return { bonusOptions, flawsOrCosts, choiceGroups: PREDATOR_CHOICE_GROUPS[code] ?? [] }
}

export function resolvePredatorChoices(code: PredatorTypeCode, values: readonly string[]) {
  if (values.length > 10 || new Set(values).size !== values.length) throw new Error('Escolhas duplicadas ou excessivas.')
  const groups = PREDATOR_CHOICE_GROUPS[code] ?? []
  const resolved: MechanicalOption[] = []
  const known = new Set<string>()
  for (const entry of groups) {
    const selected = values.filter(value => value.startsWith(`${entry.code}:`))
    if (entry.mode === 'ONE' && selected.length !== 1) throw new Error(`Escolha uma opção de ${entry.code}.`)
    let total = 0
    const selectedOptions = new Set<string>()
    for (const value of selected) {
      const parts = value.split(':')
      const option = entry.options.find(candidate => candidate.code === parts[1])
      const dots = Number(parts[2])
      if (parts.length !== 3 || !option || selectedOptions.has(option.code) || !Number.isSafeInteger(dots) || dots < 1 || dots > (option.dots ?? entry.totalDots)) throw new Error('Distribuição de escolhas inválida.')
      selectedOptions.add(option.code)
      total += dots
      known.add(value)
      resolved.push({ ...option, dots })
    }
    if (total !== entry.totalDots) throw new Error(`Distribua exatamente ${entry.totalDots} ponto(s) em ${entry.code}.`)
  }
  if (values.some(value => !known.has(value))) throw new Error('Opção mecânica desconhecida.')
  return resolved
}
