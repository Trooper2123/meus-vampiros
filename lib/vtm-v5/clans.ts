export const DISCIPLINE_NAMES = ['Animalismo', 'Auspícios', 'Dominação', 'Fortitude', 'Ofuscação', 'Potência', 'Presença', 'Rapidez', 'Proteanismo', 'Feitiçaria de Sangue', 'Oblívio'] as const
export type ClanCode = 'BRUJAH' | 'GANGREL' | 'MALKAVIAN' | 'NOSFERATU' | 'TOREADOR' | 'TREMERE' | 'VENTRUE' | 'CAITIFF' | 'THIN_BLOOD'
export type ClanSelection = { code: ClanCode; disciplineDots: Record<string, number>; caitiffDisciplines?: string[]; feedingPreference?: string; afflictionCategory?: string }

const definitions = [
  { code: 'BRUJAH', name: 'Brujah', disciplines: ['Rapidez', 'Potência', 'Presença'], bane: 'Subtrai a Gravidade da Perdição ao resistir a frenesi de fúria, mínimo de um dado.', compulsion: 'Rebelião: desafiar autoridade, ordem ou expectativa.' },
  { code: 'GANGREL', name: 'Gangrel', disciplines: ['Animalismo', 'Fortitude', 'Proteanismo'], bane: 'Frenesi manifesta características animais e penalidades associadas à Gravidade da Perdição.', compulsion: 'Impulsos ferais: fala e comportamento animalescos.' },
  { code: 'MALKAVIAN', name: 'Malkavian', disciplines: ['Auspícios', 'Dominação', 'Ofuscação'], bane: 'Falha bestial ou compulsão impõe penalidade à categoria de pools configurada por uma cena.', compulsion: 'Delírio: percepções distorcidas prejudicam ações e resistência ao terror.' },
  { code: 'NOSFERATU', name: 'Nosferatu', disciplines: ['Animalismo', 'Ofuscação', 'Potência'], bane: 'Repulsivo 2; não melhora Aparência. Disfarces humanos sofrem penalidade pela Gravidade da Perdição.', compulsion: 'Criptofilia: necessidade de buscar informações ocultas.' },
  { code: 'TOREADOR', name: 'Toreador', disciplines: ['Auspícios', 'Rapidez', 'Presença'], bane: 'Ambiente sem beleza impõe penalidade pela Gravidade da Perdição ao usar disciplinas.', compulsion: 'Obsessão: fixação em algo belo prejudica outras ações.' },
  { code: 'TREMERE', name: 'Tremere', disciplines: ['Auspícios', 'Dominação', 'Feitiçaria de Sangue'], bane: 'Vitae não cria Laço de Sangue em Membros; mortais e carniçais exigem ingestões adicionais.', compulsion: 'Perfeccionismo: penalidade até obter resultado crítico ou repetir a tarefa com rigor.' },
  { code: 'VENTRUE', name: 'Ventrue', disciplines: ['Dominação', 'Fortitude', 'Presença'], bane: 'Alimentação fora da preferência exige Força de Vontade conforme a Gravidade da Perdição.', compulsion: 'Arrogância: assumir comando e conseguir obediência não sobrenatural.' },
  { code: 'CAITIFF', name: 'Caitiff', disciplines: [], bane: 'Sem Perdição comum; Suspeito 1 e sem Status positivo na criação.', compulsion: 'Sem compulsão padrão de clã; decisão contextual do Narrador.' },
  { code: 'THIN_BLOOD', name: 'Sangue-fraco', disciplines: ['Alquimia de Sangue-Fraco'], bane: 'Sem Perdição de clã; Potência de Sangue 0 e limitações de Laço, Abraço e carniçais.', compulsion: 'Sem compulsão de clã tradicional.' },
] as const

export const CLANS = definitions.map(entry => ({ ...entry, version: 1, source: 'REFERENCIA_LOCAL_V5', guidance: `Revise os gatilhos e consequências de ${entry.name} com a crônica antes de aplicar penalidades contextuais. Não automatize Perdição ou Compulsão sem contexto narrativo.` }))

export function normalizeDiscipline(name: string): string {
  const key = name.normalize('NFD').replace(/\p{M}/gu, '').trim().toLowerCase()
  const aliases: Record<string, string> = { animalism: 'Animalismo', auspex: 'Auspícios', dominate: 'Dominação', celerity: 'Rapidez', potence: 'Potência', presence: 'Presença', obfuscate: 'Ofuscação', protean: 'Proteanismo', 'blood sorcery': 'Feitiçaria de Sangue', oblivion: 'Oblívio' }
  return aliases[key] ?? [...DISCIPLINE_NAMES, 'Presença', 'Alquimia de Sangue-Fraco'].find(entry => entry.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase() === key) ?? name.trim()
}

export function validateClanSelection(selection: ClanSelection) {
  if (!selection || typeof selection !== 'object' || Array.isArray(selection)) throw new Error('Escolha de clã inválida.')
  if (Object.keys(selection).some(key => !['code', 'disciplineDots', 'caitiffDisciplines', 'feedingPreference', 'afflictionCategory'].includes(key))) throw new Error('Campos de clã desconhecidos.')
  const definition = CLANS.find(entry => entry.code === selection.code)
  if (!definition) throw new Error('Clã não disponível na referência implementada.')
  if (!selection.disciplineDots || typeof selection.disciplineDots !== 'object' || Array.isArray(selection.disciplineDots)) throw new Error('Escolhas de disciplinas inválidas.')
  if (selection.code === 'THIN_BLOOD') {
    if (Object.keys(selection.disciplineDots).length) throw new Error('Sangue-fraco não recebe o pacote comum de disciplinas.')
    return definition
  }
  const available = selection.code === 'CAITIFF' ? selection.caitiffDisciplines ?? [] : [...definition.disciplines]
  if (selection.code === 'CAITIFF' && (!Array.isArray(available) || available.length !== 3 || new Set(available).size !== 3 || available.some(name => !DISCIPLINE_NAMES.includes(name as typeof DISCIPLINE_NAMES[number])))) throw new Error('Caitiff deve escolher três disciplinas disponíveis distintas.')
  const choices = Object.entries(selection.disciplineDots)
  if (choices.length !== 2 || choices.some(([name, dots]) => !available.includes(name as never) || !Number.isSafeInteger(dots)) || choices.map(([, dots]) => dots).sort().join(',') !== '1,2') throw new Error('Escolha duas disciplinas disponíveis, uma com 2 pontos e outra com 1.')
  if (selection.code === 'VENTRUE' && (typeof selection.feedingPreference !== 'string' || !selection.feedingPreference.trim() || selection.feedingPreference.length > 200)) throw new Error('Defina a preferência alimentar do Ventrue.')
  if (selection.code === 'MALKAVIAN' && !['PHYSICAL', 'SOCIAL', 'MENTAL'].includes(selection.afflictionCategory ?? '')) throw new Error('Escolha a categoria de pools afetada pela Perdição.')
  return definition
}
