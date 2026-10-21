import { beforeEach, describe, expect, it } from 'vitest'
import { createCampaignEvent, createLiveKitRoom, deleteCampaignEvent, getCampaignEventCalendarStatus, getCampaignEventsByYear, getCampaignSchedulingCalendarStatus, getLiveKitRoom, toggleCampaignEventCalendar, toggleCampaignSchedulingCalendar, updateCampaignEvent, updateCampaignEventCalendarConfig } from '@/lib/db'
import { createTestCampaign, preparePostgresTest } from './postgres-test-helpers'

let campaignId: string

beforeEach(async () => {
  await preparePostgresTest()
  campaignId = (await createTestCampaign('calendar-master')).id
})

describe('calendários da campanha no PostgreSQL', () => {
  it('preserva o estado independente dos dois toggles', async () => {
    expect(await getCampaignEventCalendarStatus(campaignId)).toBeNull()
    expect(await getCampaignSchedulingCalendarStatus(campaignId)).toBeNull()

    await toggleCampaignEventCalendar(campaignId, true)
    await toggleCampaignSchedulingCalendar(campaignId, true)
    await toggleCampaignEventCalendar(campaignId, false)

    expect(await getCampaignEventCalendarStatus(campaignId)).toMatchObject({ enabled: false, mode: 'real' })
    expect(await getCampaignSchedulingCalendarStatus(campaignId)).toEqual({ enabled: true })
  })

  it('salva o calendário personalizado e ordena eventos por data narrativa', async () => {
    await toggleCampaignEventCalendar(campaignId, true)
    await updateCampaignEventCalendarConfig(campaignId, { mode: 'custom', weekdays: ['Aurora', 'Ocaso'], months: ['Cinzas', 'Sangue'] })
    await createCampaignEvent(campaignId, 'Segundo mês', null, null, null, 'everyone', { fictionalYear: 450, fictionalMonth: 'Sangue', fictionalMonthIndex: 2, fictionalWeekday: 'Aurora', fictionalWeekdayIndex: 1 })
    await createCampaignEvent(campaignId, 'Primeiro mês', null, null, null, 'everyone', { fictionalYear: 450, fictionalMonth: 'Cinzas', fictionalMonthIndex: 1, fictionalWeekday: 'Ocaso', fictionalWeekdayIndex: 2 })

    expect(await getCampaignEventCalendarStatus(campaignId)).toMatchObject({ mode: 'custom', weekdays: ['Aurora', 'Ocaso'], months: ['Cinzas', 'Sangue'] })
    expect((await getCampaignEventsByYear(campaignId, 450)).map(event => event.title)).toEqual(['Primeiro mês', 'Segundo mês'])
  })

  it('cria, lista, atualiza e exclui eventos sem afetar outras mesas', async () => {
    const created = await createCampaignEvent(campaignId, 'Elysium', 'Encontro da corte', '2026-10-31', '21:00', 'everyone')
    await createCampaignEvent(campaignId, 'Primeiro encontro', null, '2026-01-10', '20:00', 'everyone')
    await createCampaignEvent(campaignId, 'Evento sem horário', null, '2026-10-31', null, 'everyone')
    await createCampaignEvent(campaignId, 'Evento mais cedo', null, '2026-10-31', '19:00', 'everyone')

    expect(await getCampaignEventsByYear(campaignId, 2025)).toHaveLength(0)
    expect((await getCampaignEventsByYear(campaignId, 2026)).map(event => event.title)).toEqual(['Primeiro encontro', 'Evento mais cedo', 'Elysium', 'Evento sem horário'])
    await updateCampaignEvent(created.id, { title: 'Elysium atualizado', visibility: 'master' })
    expect((await getCampaignEventsByYear(campaignId, 2026))[2]).toMatchObject({ title: 'Elysium atualizado', visibility: 'master' })
    await deleteCampaignEvent(created.id)
    expect(await getCampaignEventsByYear(campaignId, 2026)).toHaveLength(3)
  })

  it('mantém uma sala virtual por campanha', async () => {
    await createLiveKitRoom(campaignId, `campanha-${campaignId}`, 'wss://example.livekit.cloud', 'auth0|master')
    expect(await getLiveKitRoom(campaignId)).toMatchObject({ roomName: `campanha-${campaignId}`, hostUserId: 'auth0|master' })
  })
})
