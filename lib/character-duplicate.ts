const COPY_FIELDS = new Set([
  'characterType', 'creationType', 'skillMode', 'cla', 'conceito', 'geracao', 'sire',
  'idade-verdadeira', 'idade-aparente', 'dados-vida', 'dados-morte', 'historico', 'notas',
  'isCaitiff', 'isThinBlood', 'forca', 'destreza', 'vigor', 'carisma', 'manipulacao',
  'compostura', 'inteligencia', 'raciocinio', 'determinacao', 'potencia-de-sangue',
  'humanidade', 'vitalidade', 'vontade', 'fome', 'predador', 'predatorTypeCode',
  'advantages', 'flaws',
  'healthDamage', 'willpowerDamage', 'vitalidadeDanoSuperficial', 'vitalidadeDanoAgravado',
  'vontadeDanoSuperficial', 'vontadeDanoAgravado',
])

const POWER_FIELDS = ['name', 'level', 'description', 'effect', 'cost', 'prerequisite', 'amalgam', 'dicePool', 'opposingPool', 'system', 'duration', 'additionalNotes']

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {}
}

function stringOrEmpty(value: unknown) {
  return typeof value === 'string' ? value : ''
}

function stringList(value: unknown) {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : []
}

function isCopyField(key: string) {
  return COPY_FIELDS.has(key) || /^habilidade-[\p{L}\d -]+$/u.test(key) || /^convicoes-(?:crenca|pilar)-[123]$/.test(key)
}

function projectPower(power: unknown) {
  if (typeof power === 'string') return power
  const details = asRecord(power)
  return Object.fromEntries(POWER_FIELDS
    .filter((key) => typeof details[key] === 'string' || typeof details[key] === 'number')
    .map((key) => [key, details[key]]))
}

function projectDiscipline(entry: unknown) {
  const discipline = asRecord(entry)
  return {
    name: stringOrEmpty(discipline.name),
    level: typeof discipline.level === 'number' ? discipline.level : 0,
    powers: Array.isArray(discipline.powers) ? discipline.powers.map(projectPower) : [],
  }
}

function projectTrait(entry: unknown) {
  const trait = asRecord(entry)
  return {
    name: stringOrEmpty(trait.name),
    level: typeof trait.level === 'number' ? trait.level : 0,
    description: stringOrEmpty(trait.description),
  }
}

function projectSelection(selection: Record<string, unknown>) {
  return {
    code: stringOrEmpty(selection.code),
    specialty: stringOrEmpty(selection.specialty),
    discipline: stringOrEmpty(selection.discipline),
    optionCodes: stringList(selection.optionCodes),
    appliedVersion: 1,
  }
}

function projectDamage(value: unknown) {
  return Object.fromEntries(Object.entries(asRecord(value))
    .filter(([key, amount]) => ['superficial', 'aggravated'].includes(key) && typeof amount === 'number'))
}

function projectCollections(data: Record<string, unknown>, result: Record<string, unknown>) {
  for (const field of ['advantages', 'flaws']) {
    if (Array.isArray(data[field])) result[field] = stringList(data[field])
  }
  for (const field of ['vantagens', 'defeitos']) {
    if (Array.isArray(data[field])) result[field] = data[field].map(projectTrait)
  }
  if (Array.isArray(data.disciplinas)) result.disciplinas = data.disciplinas.map(projectDiscipline)
}

export function projectIndependentCharacter(data: Record<string, unknown>) {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data)) {
    if (isCopyField(key) && (value === null || ['string', 'number', 'boolean'].includes(typeof value))) result[key] = value
  }
  projectCollections(data, result)
  for (const field of ['healthDamage', 'willpowerDamage']) {
    const damage = data[field]
    if (damage && typeof damage === 'object' && !Array.isArray(damage)) result[field] = projectDamage(damage)
  }
  const selection = data.predatorTypeSelection
  if (selection && typeof selection === 'object' && !Array.isArray(selection)) result.predatorTypeSelection = projectSelection(asRecord(selection))
  return structuredClone(result)
}
