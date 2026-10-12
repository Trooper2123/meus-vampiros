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
  devUpdateCampaignEventCalendarConfig,
  devUpdateCampaignEvent,
} from '../lib/db'

const campaignId = '11111111-1111-4111-8111-111111111111'

beforeEach(() => {
  global.__devDbCampaignCalendar = undefined
  global.__devDbCampaignCalendarV2 = undefined
})

describe('calendários da campanha', () => {
  it('preserva o estado independente dos dois toggles', () => {
    expect(devGetCampaignEventCalendarStatus(campaignId)).toBeNull()
    expect(devGetCampaignSchedulingCalendarStatus(campaignId)).toBeNull()

    devToggleCampaignEventCalendar(campaignId, true)
    devToggleCampaignSchedulingCalendar(campaignId, true)
    devToggleCampaignEventCalendar(campaignId, false)

    expect(devGetCampaignEventCalendarStatus(campaignId)).toMatchObject({ enabled: false, mode: 'real' })
    expect(devGetCampaignSchedulingCalendarStatus(campaignId)).toEqual({ enabled: true })
  })

  it('salva calendário personalizado e ordena eventos pelo ano, mês e dia narrativos', () => {
    devToggleCampaignEventCalendar(campaignId, true)
    devUpdateCampaignEventCalendarConfig(campaignId, { mode: 'custom', weekdays: ['Aurora', 'Ocaso'], months: ['Cinzas', 'Sangue'] })
    devCreateCampaignEvent(campaignId, 'Segundo mês', null, null, null, 'everyone', { fictionalYear: 450, fictionalMonth: 'Sangue', fictionalMonthIndex: 2, fictionalWeekday: 'Aurora', fictionalWeekdayIndex: 1 })
    devCreateCampaignEvent(campaignId, 'Primeiro mês', null, null, null, 'everyone', { fictionalYear: 450, fictionalMonth: 'Cinzas', fictionalMonthIndex: 1, fictionalWeekday: 'Ocaso', fictionalWeekdayIndex: 2 })

    expect(devGetCampaignEventCalendarStatus(campaignId)).toMatchObject({ mode: 'custom', weekdays: ['Aurora', 'Ocaso'], months: ['Cinzas', 'Sangue'] })
    expect(devGetCampaignEventsByYear(campaignId, 450).map((event) => event.title)).toEqual(['Primeiro mês', 'Segundo mês'])
  })

  it('executa o fluxo de criar, listar, atualizar e excluir eventos', () => {
    const created = devCreateCampaignEvent(campaignId, 'Elysium', 'Encontro da corte', '2026-10-31', '21:00', 'everyone')
    devCreateCampaignEvent(campaignId, 'Primeiro encontro', null, '2026-01-10', '20:00', 'everyone')
    devCreateCampaignEvent(campaignId, 'Evento sem horário', null, '2026-10-31', null, 'everyone')
    devCreateCampaignEvent(campaignId, 'Evento mais cedo', null, '2026-10-31', '19:00', 'everyone')

    expect(devGetCampaignEventsByYear(campaignId, 2025)).toHaveLength(0)
    expect(devGetCampaignEventsByYear(campaignId, 2026).map((event) => event.title)).toEqual([
      'Primeiro encontro',
      'Evento mais cedo',
      'Elysium',
      'Evento sem horário',
    ])

    devUpdateCampaignEvent(created.id, { title: 'Elysium atualizado', visibility: 'master' })
    expect(devGetCampaignEventsByYear(campaignId, 2026)[2]).toMatchObject({ title: 'Elysium atualizado', visibility: 'master' })

    devDeleteCampaignEvent(created.id)
    expect(devGetCampaignEventsByYear(campaignId, 2026)).toHaveLength(3)
  })

  it('mantém uma sala virtual por campanha', () => {
    devCreateLiveKitRoom(campaignId, `campanha-${campaignId}`, 'wss://example.livekit.cloud', 'auth0|master')
    expect(devGetLiveKitRoom(campaignId)).toMatchObject({ roomName: `campanha-${campaignId}`, hostUserId: 'auth0|master' })
  })
})
