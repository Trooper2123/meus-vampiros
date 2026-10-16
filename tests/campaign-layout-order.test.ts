import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('ordem da gestão da mesa', () => {
  it('mantém título, anotações, ferramentas, noite, revisões e catálogos nessa ordem', () => {
    const source = readFileSync('app/campaigns/[id]/page.tsx', 'utf8')
    const sections = ['Ficha da mesa', '<CampaignNotesDialog', '<CampaignTools', '<AwakePanel', '<CampaignPossessionsManager', '<CampaignNpcCreator', '<CampaignClans', '<MasterPredatorCatalog']
    const positions = sections.map(section => source.indexOf(section))
    expect(positions.every(position => position >= 0)).toBe(true)
    expect(positions).toEqual([...positions].sort((first, second) => first - second))
    for (const section of sections.slice(1)) expect(source.split(section)).toHaveLength(2)
    expect(source).not.toContain('MasterPredatorReviewPanel')
  })

  it('mantém calendários antes do acesso à sessão', () => {
    const source = readFileSync('components/campaign-calendar/campaign-tools.tsx', 'utf8')
    expect(source.indexOf('<DateAvailabilityCalendar')).toBeLessThan(source.indexOf('<LiveKitRoomLink'))
    expect(source.indexOf('<CampaignEventCalendar')).toBeLessThan(source.indexOf('<LiveKitRoomLink'))
  })
})
