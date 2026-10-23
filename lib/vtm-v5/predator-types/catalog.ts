import type { MechanicalOption, PredatorTypeCode, PredatorTypeDefinition, PredatorTypeSource, RelationshipRequirement } from './types'
import { predatorMechanics } from './mechanics'
import { PREDATOR_SUPPLEMENTS } from './supplements'

type Entry = Omit<PredatorTypeDefinition, 'optional' | 'enabledByDefault' | 'bonusOptions' | 'flawsOrCosts' | 'commonRisks' | 'validationNotes' | 'relationshipRequirements'> & Partial<Pick<PredatorTypeDefinition, 'bonusOptions' | 'flawsOrCosts' | 'commonRisks' | 'validationNotes' | 'relationshipRequirements'>>
const merit = (code: string, label: string, dots: number): MechanicalOption => ({ code, label, dots, kind: 'MERIT' })
const flaw = (code: string, label: string, dots: number): MechanicalOption => ({ code, label, dots, kind: 'FLAW' })
const background = (code: string, label: string, dots: number): MechanicalOption => ({ code, label, dots, kind: 'BACKGROUND' })
const relationship = (kind: RelationshipRequirement['kind'], label: string): RelationshipRequirement => ({ kind, label })

const entries: Entry[] = [
  { code: 'ALLEYCAT', name: 'Alleycat', source: 'COREBOOK', summary: 'Caça por confronto direto e intimidação.', feedingStyle: 'Assalto, emboscada ou coerção física.', predatorRoll: 'Força + Briga', specialtyOptions: ['Intimidação (Assaltos)', 'Briga (Agarramento)'], disciplineOptions: ['Rapidez', 'Potência'], bonusOptions: [background('CRIMINAL_CONTACTS', 'Contatos criminosos', 3)], flawsOrCosts: [{ code: 'HUMANITY_MINUS_1', label: 'Humanidade -1', kind: 'HUMANITY', modifier: -1 }], commonRisks: ['Violência', 'Máscara'], relationshipRequirements: [relationship('CONTACT', 'Contato criminoso')] },
  { code: 'BAGGER', name: 'Bagger', source: 'COREBOOK', summary: 'Obtém sangue armazenado sem caçar diretamente.', feedingStyle: 'Hospitais, bancos de sangue e mercado ilegal.', predatorRoll: 'Inteligência + Manha', specialtyOptions: ['Ladroagem (Arrombamento)', 'Manha (Mercado negro)'], disciplineOptions: ['Feitiçaria de Sangue', 'Ofuscação'], bonusOptions: [merit('IRON_GULLET', 'Estômago de Ferro', 3)], flawsOrCosts: [flaw('ENEMY', 'Inimigo', 2)], commonRisks: ['Fornecedores', 'Investigação'], relationshipRequirements: [relationship('ENEMY', 'Inimigo ligado ao fornecimento')] },
  { code: 'BLOOD_LEECH', name: 'Blood Leech', source: 'COREBOOK', summary: 'Alimenta-se de outros vampiros.', feedingStyle: 'Caça, coerção ou acordos entre Membros.', predatorRoll: 'Cena planejada pelo Mestre', specialtyOptions: ['Briga (Vampiros)', 'Furtividade (Contra vampiros)'], disciplineOptions: ['Rapidez', 'Proteanismo'], bonusOptions: [{ code: 'BLOOD_POTENCY_PLUS_1', label: 'Potência de Sangue +1', kind: 'BLOOD_POTENCY', modifier: 1 }], flawsOrCosts: [{ code: 'HUMANITY_MINUS_1', label: 'Humanidade -1', kind: 'HUMANITY', modifier: -1 }, flaw('DARK_SECRET', 'Segredo Sombrio ou Rejeitado', 2)], commonRisks: ['Política vampírica', 'Diablerie'], relationshipRequirements: [relationship('ENEMY', 'Vampiro caçado ou ofendido')] },
  { code: 'CLEAVER', name: 'Cleaver', source: 'COREBOOK', summary: 'Mantém laços mortais como fonte recorrente.', feedingStyle: 'Familiares e pessoas próximas.', predatorRoll: 'Manipulação + Subterfúgio', specialtyOptions: ['Persuasão (Gaslighting)', 'Subterfúgio (Encobrimentos)'], disciplineOptions: ['Dominação', 'Animalismo'], bonusOptions: [background('HERD', 'Rebanho', 2)], flawsOrCosts: [flaw('DARK_SECRET_CLEAVER', 'Segredo Sombrio: Cleaver', 1)], commonRisks: ['Família', 'Máscara'], relationshipRequirements: [relationship('FAMILY', 'Família ou pessoas próximas'), relationship('HERD', 'Rebanho familiar')] },
  { code: 'CONSENSUALIST', name: 'Consensualist', source: 'COREBOOK', summary: 'Busca consentimento antes de se alimentar.', feedingStyle: 'Acordos e comunidades informadas.', predatorRoll: 'Manipulação + Persuasão', specialtyOptions: ['Medicina (Flebotomia)', 'Persuasão (Vítimas)'], disciplineOptions: ['Auspícios', 'Fortitude'], bonusOptions: [{ code: 'HUMANITY_PLUS_1', label: 'Humanidade +1', kind: 'HUMANITY', modifier: 1 }], flawsOrCosts: [flaw('MASQUERADE_BREACHER', 'Segredo: violação da Máscara', 1)], commonRisks: ['Exposição', 'Consentimento'], relationshipRequirements: [relationship('OTHER', 'Pessoa que conhece o método')] },
  { code: 'FARMER', name: 'Farmer', source: 'COREBOOK', summary: 'Evita humanos e caça animais.', feedingStyle: 'Animais domésticos ou selvagens.', predatorRoll: 'Compostura + Empatia com Animais', specialtyOptions: ['Empatia com Animais (Espécie)', 'Sobrevivência (Caça)'], disciplineOptions: ['Animalismo', 'Proteanismo'], bonusOptions: [{ code: 'HUMANITY_PLUS_1', label: 'Humanidade +1', kind: 'HUMANITY', modifier: 1 }], flawsOrCosts: [flaw('VEGAN', 'Vegano', 2)], commonRisks: ['Fome', 'Limitação de potência'] },
  { code: 'OSIRIS', name: 'Osiris', source: 'COREBOOK', summary: 'Alimenta-se de seguidores e admiradores.', feedingStyle: 'Culto, fé, fama ou comunidade.', predatorRoll: 'Manipulação + Subterfúgio ou Intimidação + Fama', specialtyOptions: ['Ocultismo (Tradição)', 'Performance (Campo)'], disciplineOptions: ['Feitiçaria de Sangue', 'Presença'], bonusOptions: [background('FAME_HERD', 'Fama e Rebanho', 3)], flawsOrCosts: [flaw('ENEMIES_MYTHIC', 'Inimigos ou Falhas Míticas', 2)], commonRisks: ['Culto', 'Exposição pública'], relationshipRequirements: [relationship('CULT', 'Culto, igreja ou comunidade'), relationship('HERD', 'Seguidores')] },
  { code: 'SANDMAN', name: 'Sandman', source: 'COREBOOK', summary: 'Alimenta-se de vítimas adormecidas.', feedingStyle: 'Invasão silenciosa e furtividade.', predatorRoll: 'Destreza + Furtividade', specialtyOptions: ['Medicina (Anestésicos)', 'Furtividade (Invasão)'], disciplineOptions: ['Auspícios', 'Ofuscação'], bonusOptions: [background('RESOURCES', 'Recursos', 1)], commonRisks: ['Invasão', 'Vigilância'], relationshipRequirements: [relationship('HAVEN', 'Acesso seguro às vítimas')] },
  { code: 'SCENE_QUEEN', name: 'Scene Queen', source: 'COREBOOK', summary: 'Caça dentro de uma subcultura em que possui status.', feedingStyle: 'Cena artística, política, musical ou criminosa.', predatorRoll: 'Manipulação + Persuasão', specialtyOptions: ['Etiqueta (Subcultura)', 'Liderança (Subcultura)', 'Manha (Subcultura)'], disciplineOptions: ['Dominação', 'Potência'], bonusOptions: [background('FAME', 'Fama', 1), background('CONTACT', 'Contato', 1)], flawsOrCosts: [flaw('DISLIKED', 'Desprezado fora da cena', 1)], commonRisks: ['Rivalidade', 'Exposição'], relationshipRequirements: [relationship('CONTACT', 'Contato da subcultura')] },
  { code: 'SIREN', name: 'Siren', source: 'COREBOOK', summary: 'Usa sedução e intimidade para caçar.', feedingStyle: 'Encontros românticos ou sexuais.', predatorRoll: 'Carisma + Subterfúgio', specialtyOptions: ['Persuasão (Sedução)', 'Subterfúgio (Sedução)'], disciplineOptions: ['Fortitude', 'Presença'], bonusOptions: [merit('BEAUTIFUL', 'Aparência: Bonito', 2)], flawsOrCosts: [flaw('REJECTED_LOVER', 'Inimigo: amante rejeitado', 1)], commonRisks: ['Conteúdo sensível', 'Relacionamentos'], relationshipRequirements: [relationship('ENEMY', 'Amante rejeitado ou parceiro ciumento')] },
]

entries.push(...PREDATOR_SUPPLEMENTS)
entries.push({
  ...entries.find(entry => entry.code === 'BAGGER')!,
  code: 'BAGGER_COTBG_OBLIVION', baseCode: 'BAGGER', name: 'Ensacador (variante Oblívio)', originalName: 'Bagger (Oblivion)',
  source: 'COTBG_BACKER', sourceReference: 'Cults of the Blood Gods, Backer’s Copy, p. 150; PDF 151',
  disciplineOptions: ['Oblívio', 'Ofuscação'],
  rulesText: 'Substitui a alternativa Feitiçaria de Sangue por Oblívio; mantém Ofuscação, os benefícios, custos e restrições de Bagger. Não exige exclusividade de clã.',
  validationNotes: 'Variante de pré-publicação: adotar apenas com aprovação do Narrador e conferir a edição final.',
})

export const PREDATOR_TYPES: readonly PredatorTypeDefinition[] = Object.freeze(entries.map((entry) => Object.freeze({
  ...entry,
  name: entry.originalName ?? entry.name,
  aliases: entry.originalName && entry.originalName !== entry.name ? [entry.name] : [],
  ...predatorMechanics(entry.code),
  optional: entry.source !== 'COREBOOK',
  enabledByDefault: entry.source === 'COREBOOK',
  bonusOptions: Object.freeze([...predatorMechanics(entry.code).bonusOptions]),
  flawsOrCosts: Object.freeze([...predatorMechanics(entry.code).flawsOrCosts]),
  commonRisks: Object.freeze([...(entry.commonRisks ?? [])]),
  validationNotes: entry.validationNotes ?? 'Aplicar restrições e escolhas conforme a campanha.',
  relationshipRequirements: Object.freeze([...(entry.relationshipRequirements ?? [])]),
})))

export const PREDATOR_TYPE_BY_CODE = new Map<PredatorTypeCode, PredatorTypeDefinition>(PREDATOR_TYPES.map((entry) => [entry.code, entry]))
export const PREDATOR_TYPES_BY_SOURCE = (source: PredatorTypeSource) => PREDATOR_TYPES.filter((entry) => entry.source === source)
