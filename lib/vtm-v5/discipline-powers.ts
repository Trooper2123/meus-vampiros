import rows from './research-catalog.json'

export function disciplinePowerOptions(disciplineId: string, maxLevel: number) {
  return rows.filter(row => row.disciplineId === disciplineId && row.type === 'Poder' && row.status === 'Publicação' && row.level <= maxLevel).map(row => ({
    id: row.id,
    level: row.level,
    power: {
      name: row.name,
      effect: row.effect,
      cost: row.cost,
      prerequisite: row.prerequisite,
      amalgam: row.amalgam,
      duration: row.duration,
      dicePool: row.pool,
      opposingPool: row.opposing_pool,
      additionalNotes: row.notes,
      source: `${row.source} · p. ${row.printed_page}`,
    },
  }))
}

export type DisciplinePowerOption = ReturnType<typeof disciplinePowerOptions>[number]
