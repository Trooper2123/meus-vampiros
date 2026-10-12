import { beforeEach, describe, expect, it } from 'vitest'
import {
  devCreateCampaignEvent,
  devCreateLiveKitRoom,
  devDeleteCampaignEvent,
  devGetCampaignEventCalendarStatus,
  devGetCampaignEventsByYear,
  devGetCampaignSchedulingCalendarStatus,
  devGetLiveKitRoom,
  devToggleCampaignEventCalendar,
  devToggleCampaignSchedulingCalendar,
  devUpdateCampaignEvent,
} from '../lib/db'

const campaignId = '11111111-1111-4111-8111-111111111111'

beforeEach(() => {
  global.__devDbCampaignCalendar = undefined
})

describe('calendários da campanha', () => {
  it('preserva o estado independente dos dois toggles', () => {
    expect(devGetCampaignEventCalendarStatus(campaignId)).toBeNull()
    expect(devGetCampaignSchedulingCalendarStatus(campaignId)).toBeNull()

    devToggleCampaignEventCalendar(campaignId, true)
    devToggleCampaignSchedulingCalendar(campaignId, true)
    devToggleCampaignEventCalendar(campaignId, false)

    expect(devGetCampaignEventCalendarStatus(campaignId)).toEqual({ enabled: false })
    expect(devGetCampaignSchedulingCalendarStatus(campaignId)).toEqual({ enabled: true })
  })

  it('executa o fluxo de criar, listar, atualizar e excluir eventos', () => {
    const created = devCreateCampaignEvent(campaignId, 'Elysium', 'Encontro da corte', '2026-10-31', '21:00', 'everyone')

    expect(devGetCampaignEventsByYear(campaignId, 2025)).toHaveLength(0)
    expect(devGetCampaignEventsByYear(campaignId, 2026)).toMatchObject([{ id: created.id, title: 'Elysium' }])

    devUpdateCampaignEvent(created.id, { title: 'Elysium atualizado', visibility: 'master' })
    expect(devGetCampaignEventsByYear(campaignId, 2026)[0]).toMatchObject({ title: 'Elysium atualizado', visibility: 'master' })

    devDeleteCampaignEvent(created.id)
    expect(devGetCampaignEventsByYear(campaignId, 2026)).toHaveLength(0)
  })

  it('mantém uma sala virtual por campanha', () => {
    devCreateLiveKitRoom(campaignId, `campanha-${campaignId}`, 'wss://example.livekit.cloud', 'auth0|master')
    expect(devGetLiveKitRoom(campaignId)).toMatchObject({ roomName: `campanha-${campaignId}`, hostUserId: 'auth0|master' })
  })
})
