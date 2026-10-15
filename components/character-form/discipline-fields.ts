export type DisciplinePower = {
  name: string
  effect: string
  cost: string
  prerequisite: string
  amalgam: string
  duration: string
  dicePool: string
  opposingPool: string
  additionalNotes: string
  source: string
}

export const createEmptyPower = (): DisciplinePower => ({
  name: '', effect: '', cost: '', prerequisite: '', amalgam: '', duration: '', dicePool: '', opposingPool: '', additionalNotes: '', source: ''
})


export type Discipline = { id: string; name: string; level: number; powers: DisciplinePower[] }
