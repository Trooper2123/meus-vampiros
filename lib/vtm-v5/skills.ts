export const SPECIALTY_SKILL_NAMES: Readonly<Record<string, string>> = {
  'armas-brancas': 'Armas brancas', 'armas-de-fogo': 'Armas de fogo', atletismo: 'Atletismo', briga: 'Briga', conducao: 'Condução', furtividade: 'Furtividade', ladroagem: 'Ladroagem', oficios: 'Ofícios', sobrevivencia: 'Sobrevivência', 'empatia-com-animais': 'Empatia com animais', etiqueta: 'Etiqueta', intimidacao: 'Intimidação', lideranca: 'Liderança', manha: 'Manha', performance: 'Performance', persuasao: 'Persuasão', sagacidade: 'Sagacidade', subterfugio: 'Subterfúgio', ciencia: 'Ciência', academicos: 'Erudição', financas: 'Finanças', investigacao: 'Investigação', medicina: 'Medicina', ocultismo: 'Ocultismo', percepcao: 'Percepção', politica: 'Política', tecnologia: 'Tecnologia',
}

export type SkillValidationIssue = { field: string; skillId?: string; message: string }

export function normalizeSkillId(value: string): string {
  const normalized = value.replace(/^habilidade-/iu, '').normalize('NFD').replace(/\p{M}/gu, '').trim().toLowerCase().replace(/\s+/gu, '-')
  return normalized === 'erudicao' ? 'academicos' : normalized
}

export function validateSkillValues(values: Record<string, unknown>) {
  const skills: Record<string, number> = Object.fromEntries(Object.keys(SPECIALTY_SKILL_NAMES).map(skillId => [skillId, 0]))
  const issues: SkillValidationIssue[] = []
  const seen = new Map<string, number>()
  const invalid = new Set<string>()
  for (const [field, value] of Object.entries(values)) {
    const skillId = normalizeSkillId(field)
    if (!Object.hasOwn(SPECIALTY_SKILL_NAMES, skillId)) {
      issues.push({ field, message: 'Habilidade desconhecida.' })
      continue
    }
    const dots = typeof value === 'number' ? value : typeof value === 'string' && /^[0-5]$/u.test(value.trim()) ? Number(value.trim()) : Number.NaN
    if (!Number.isSafeInteger(dots) || dots < 0 || dots > 5 || (seen.has(skillId) && seen.get(skillId) !== dots)) {
      invalid.add(skillId)
      issues.push({ field, skillId, message: 'Pontos inválidos ou valores conflitantes para a habilidade.' })
      continue
    }
    seen.set(skillId, dots)
    skills[skillId] = dots
  }
  for (const skillId of invalid) skills[skillId] = 0
  return { valid: issues.length === 0, skills, issues }
}

export function validateCharacterSkills(data: Record<string, unknown>) {
  return validateSkillValues(Object.fromEntries(Object.entries(data).filter(([key]) => /^habilidade-/iu.test(key))))
}

export function serializeCharacterSkills(data: Record<string, unknown>, values: Record<string, unknown>) {
  const validation = validateSkillValues(values)
  if (!validation.valid) throw new Error(validation.issues.map(issue => `${issue.field}: ${issue.message}`).join(' '))
  return {
    ...Object.fromEntries(Object.entries(data).filter(([key]) => !/^habilidade-/iu.test(key))),
    ...Object.fromEntries(Object.entries(validation.skills).map(([skillId, dots]) => [`habilidade-${skillId}`, dots])),
  }
}

export function mergeCharacterSkills(current: Record<string, unknown>, incoming: Record<string, unknown>) {
  const fields = Object.keys(incoming).filter(key => /^habilidade-/iu.test(key))
  if (fields.length === 0) return { ...current, ...incoming }
  const validation = validateCharacterSkills(incoming)
  if (!validation.valid) throw new Error('Habilidades ou pontos inválidos.')
  const changed = new Set(fields.map(normalizeSkillId))
  const previous = Object.fromEntries(Object.entries(current).filter(([key]) => !/^habilidade-/iu.test(key) || (Object.hasOwn(SPECIALTY_SKILL_NAMES, normalizeSkillId(key)) && !changed.has(normalizeSkillId(key)))))
  const payload = Object.fromEntries(Object.entries(incoming).filter(([key]) => !/^habilidade-/iu.test(key)))
  return { ...previous, ...payload, ...Object.fromEntries([...changed].map(skillId => [`habilidade-${skillId}`, validation.skills[skillId]])) }
}
