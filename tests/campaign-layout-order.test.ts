import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('ordem da gestão da mesa', () => {
  it('mantém entrada de sessão, pesquisas, ferramentas, revisões e participantes nessa ordem', () => {
    const source = readFileSync('app/campaigns/[id]/page.tsx', 'utf8')
    const sections = ['Ficha da mesa', 'Abrir modo sessão', 'Anotações do Narrador', 'Pesquisa de habilidades', 'Pesquisa de vantagens e defeitos', '<CampaignTools', 'Gestão de NPCs', 'NPCs da mesa', '<NpcCatalogue', 'Visualização de personagens', 'Fichas dos participantes', '<CampaignXpHistory', 'Conceder itens restritos', '<CampaignPossessionsManager']
    const positions = sections.map(section => source.indexOf(section))
    expect(positions.every(position => position >= 0)).toBe(true)
    expect(positions).toEqual([...positions].sort((first, second) => first - second))
    for (const section of sections.slice(1)) expect(source.split(section)).toHaveLength(2)
    expect(source).not.toContain('<AwakePanel')
    expect(source).not.toContain('<BloodPolicySettings')
    expect(source).not.toContain('<LiveKitRoomLink')
    expect(source).not.toContain('/npcs?campaignId=')
    expect(source).not.toContain('/npcs/new')
    expect(source).not.toContain('MasterPredatorReviewPanel')
    expect(source).toContain('target="_blank" rel="noopener noreferrer"')
    expect(source).not.toContain('/evolution')
  })

  it('deixa a videochamada somente dentro do modo sessão', () => {
    const tools = readFileSync('components/campaign-calendar/campaign-tools.tsx', 'utf8')
    const session = readFileSync('components/game-session/session-workspace.tsx', 'utf8')
    expect(tools).not.toContain('LiveKitRoomLink')
    expect(session).toContain('<LiveKitRoomLink')
    expect(session).toContain('Videochamada')
  })

  it('reaproveita catálogo filtrado e criação contextual de NPCs', () => {
    const catalogue = readFileSync('components/npcs/npc-catalogue.tsx', 'utf8')
    expect(catalogue).toContain('<NewNpcModal campaignId={campaignId} />')
    expect(catalogue).toContain('data?.npcs.map(npc =>')
    expect(catalogue).toContain('`/npcs/${npc.id}`')
  })
})
