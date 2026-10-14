export function hasSummaryName(value?: unknown): boolean {
  const name = typeof value === 'string' ? value.trim().toLocaleLowerCase('pt-BR') : ''
  return Boolean(name && !['sem nome', 'personagem sem nome'].includes(name))
}
