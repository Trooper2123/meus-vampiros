import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('ordem da gestão da mesa', () => {
  it('mantém título, anotações, ferramentas, noite, revisões e catálogos nessa ordem', () => {
    const source = readFileSync('app/campaigns/[id]/page.tsx', 'utf8')
    const sections = ['Ficha da mesa', '<Link href={`/notes?targetType=CAMPAIGN', '<CampaignTools', '<AwakePanel', '<CampaignPossessionsManager', 'Abrir criação de NPC', 'Fichas dos participantes']
    const positions = sections.map(section => source.indexOf(section))
    expect(positions.every(position => position >= 0)).toBe(true)
    expect(positions).toEqual([...positions].sort((first, second) => first - second))
    for (const section of sections.slice(1)) expect(source.split(section)).toHaveLength(2)
    expect(source).not.toContain('MasterPredatorReviewPanel')
    expect(source).toContain('target="_blank" rel="noopener noreferrer"')
    expect(source).not.toContain('/evolution')
  })

  it('mantém calendários antes do acesso à sessão', () => {
    const source = readFileSync('components/campaign-calendar/campaign-tools.tsx', 'utf8')
    expect(source.indexOf('<DateAvailabilityCalendar')).toBeLessThan(source.indexOf('<LiveKitRoomLink'))
    expect(source.indexOf('<CampaignEventCalendar')).toBeLessThan(source.indexOf('<LiveKitRoomLink'))
  })
})
