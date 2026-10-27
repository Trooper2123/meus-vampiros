export function awakeningExplanation(character: { eligible: boolean; status: string; condition: string }) {
  if (!character.eligible) {
    if (character.condition === 'FINAL_DEATH') return 'Morte definitiva: não participa do despertar'
    if (character.status !== 'APPROVED') return 'Ficha sem aprovação ativa do Narrador'
    return 'Este tipo de ficha não participa do despertar de vampiros jogáveis'
  }
  if (character.condition === 'TORPOR') return 'Em torpor: registra a noite sem rolar; exige intervenção do Narrador'
  if (character.condition === 'STAKED') return 'Empalado: realiza o despertar, mas continua impedido de agir'
  return null
}
export function nightStartBlockReason(characters: readonly { id: string; eligible: boolean }[], selected: readonly string[], date: string) {
  if (!characters.some(character => character.eligible)) return 'Nenhuma ficha elegível. Revise a aprovação e os impedimentos indicados abaixo.'
  if (!date) return 'Informe a data da crônica para iniciar a noite.'
  if (!characters.some(character => character.eligible && selected.includes(character.id))) return 'Selecione pelo menos uma ficha elegível para iniciar a noite.'
  return null
}
