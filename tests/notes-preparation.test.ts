import { expect, it, vi } from 'vitest'
import { randomUUID } from 'node:crypto'
import { devCreateCharacter, devCreateCampaignEvent } from '@/lib/dev-db'

it('prepara exclusivamente memória isolada e valida seeds da SPEC P2', async () => {
  vi.stubEnv('DATABASE_URL', '')
  expect(process.env.NODE_ENV).not.toBe('production')
  expect(process.env.DATABASE_URL).toBeFalsy()
  const preparationScript = '../scripts/prepare-v5-development.mjs'
  await import(preparationScript)
  const campaign = global.__devDb!.campaigns.find(entry => entry.masterUserId === 'test|narrator-a')!
  const npc = devCreateCharacter(campaign.masterUserId, { campaignId: campaign.id, name: 'NPC reservado', data: { characterType: 'HUMAN_NPC' } })
  npc.visibility = 'ST_ONLY'
  global.__devDbCampaignCalendar = undefined
  devCreateCampaignEvent(campaign.id, 'Evento público', null, '2026-10-13', null, 'everyone')
  global.__chronicleNightMemory = { store: global.__devDb!, locks: new Map(), nights: [{ actorId: campaign.masterUserId, hash: 'fixture', key: 'fixture', result: { id: randomUUID(), campaignId: campaign.id, nightNumber: 1, inGameDate: '2026-10-13', status: 'ACTIVE', results: [] } }] }
  expect(global.__devDb!.campaigns.filter(entry => entry.masterUserId.startsWith('test|'))).toHaveLength(2)
  expect(global.__devDb!.characters.some(entry => entry.campaignId === null)).toBe(true)
  expect(global.__devDb!.characters.every(entry => !entry.campaignId || global.__devDb!.campaigns.some(campaign => campaign.id === entry.campaignId))).toBe(true)
  expect(global.__devDbCampaignCalendar!.events[0].campaignId).toBe(campaign.id)
  expect(global.__chronicleNightMemory!.nights[0].result.campaignId).toBe(campaign.id)
})
