import { describe, expect, it } from 'vitest'
import { subtractActiveStakes } from '@/lib/background-availability'

describe('Project Stake availability projection', () => {
  it('subtracts active commitments without mutating total dots', () => {
    expect(subtractActiveStakes([{trait:'Resources',dots:3}], [{trait:'Recursos',dots:2}])).toEqual([
      {trait:'RESOURCES',totalDots:3,reservedDots:2,availableDots:1}
    ])
  })
  it('does not mix different Backgrounds and combines commitments', () => {
    expect(subtractActiveStakes([{trait:'Resources',dots:3},{trait:'Contacts',dots:2}], [
      {trait:'RESOURCES',dots:1},{trait:'Recursos',dots:1}
    ])).toEqual([
      {trait:'RESOURCES',totalDots:3,reservedDots:2,availableDots:1},
      {trait:'CONTACTS',totalDots:2,reservedDots:0,availableDots:2}
    ])
  })
  it('clamps available dots to zero on inconsistent historical records', () => {
    expect(subtractActiveStakes([{trait:'Haven',dots:1}],[{trait:'HAVEN',dots:2}])[0]).toMatchObject({
      totalDots:1,reservedDots:2,availableDots:0
    })
  })
})
