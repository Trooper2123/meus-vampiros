export function fitsDistribution(values: number[], distribution: readonly number[]): boolean {
  return [1, 2, 3, 4, 5].every((level) =>
    values.filter((value) => value >= level).length <= distribution.filter((value) => value >= level).length
  )
}

export function remainingPoints(values: number[], distribution: readonly number[]): number {
  return Math.max(0, distribution.reduce((total, value) => total + value, 0) - values.reduce((total, value) => total + value, 0))
}

export function matchesDistribution(values: number[], distribution: readonly number[]): boolean {
  const sortedValues = [...values].filter((value) => value > 0).sort((first, second) => second - first)
  return sortedValues.length === distribution.length && sortedValues.every((value, index) => value === distribution[index])
}
