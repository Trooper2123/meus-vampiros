import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  connect: vi.fn(),
  clientQuery: vi.fn(),
  release: vi.fn(),
  ensure: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  pool: { query: mocks.query, connect: mocks.connect },
  ensureAllTables: mocks.ensure,
}))
vi.mock('@/lib/character-commands', () => ({
  CharacterCommandError: class extends Error {
    constructor(public status: number, message: string) { super(message) }
  },
}))

import { smsMessages, smsSend, smsSettings, setSmsSettings, smsUuid } from '@/lib/character-sms'

const campaignId = '11111111-1111-4111-8111-111111111111'
const threadId = '22222222-2222-4222-8222-222222222222'
const senderId = '33333333-3333-4333-8333-333333333333'
const recipientId = '44444444-4444-4444-8444-444444444444'
const key = '55555555-5555-4555-8555-555555555555'

function result(rows: unknown[] = []) {
  return { rows, rowCount: rows.length }
}

beforeEach(() => {
  mocks.query.mockResolvedValue(result())
  mocks.ensure.mockResolvedValue(undefined)
  mocks.connect.mockResolvedValue({ query: mocks.clientQuery, release: mocks.release })
  mocks.clientQuery.mockReset()
})

describe('SMS persistente e permissões', () => {
  it('valida UUID antes de consultar entidades', () => {
    expect(smsUuid(campaignId)).toBe(true)
    expect(smsUuid('../../wrong')).toBe(false)
  })

  it('bloqueia envio quando o Narrador desabilitou o SMS', async () => {
    mocks.clientQuery.mockImplementation(async (query: string) => {
      if (query.includes('FOR UPDATE')) return result([{ id: campaignId }])
      if (query.includes('master_user_id,character_sms_enabled')) {
        return result([{ master_user_id: 'narrator', character_sms_enabled: false }])
      }
      return result()
    })

    await expect(smsSend(campaignId, 'narrator', threadId, {
      senderCharacterId: senderId,
      body: 'Mensagem bloqueada.',
      idempotencyKey: key,
    })).rejects.toMatchObject({ status: 409, message: 'SMS_DISABLED' })

    expect(mocks.clientQuery.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO character_messages'))).toBe(false)
    expect(mocks.clientQuery.mock.calls.some(([sql]) => String(sql).includes('ROLLBACK'))).toBe(true)
  })

  it('não permite que jogador altere a configuração do Narrador', async () => {
    mocks.clientQuery.mockImplementation(async (query: string) => {
      if (query.includes('master_user_id,character_sms_enabled')) return result([{ master_user_id: 'narrator', character_sms_enabled: true }])
      if (query.includes('SELECT 1 FROM characters')) return result([{ member: 1 }])
      return result()
    })

    await expect(setSmsSettings(campaignId, 'player', false)).rejects.toMatchObject({ status: 403 })
    expect(mocks.clientQuery.mock.calls.some(([sql]) => String(sql).includes('UPDATE campaigns SET'))).toBe(false)
  })

  it('retorna ao Narrador o estado da configuração', async () => {
    mocks.clientQuery.mockImplementation(async (query: string) =>
      query.includes('master_user_id,character_sms_enabled') ?
        result([{ master_user_id: 'narrator', character_sms_enabled: true }]) : result()
    )
    await expect(smsSettings(campaignId, 'narrator')).resolves.toEqual({ enabled: true, isNarrator: true })
  })

  it('restringe leitura do jogador a entregas de suas próprias fichas', async () => {
    mocks.clientQuery.mockImplementation(async (query: string) => {
      if (query.includes('master_user_id,character_sms_enabled')) return result([{ master_user_id: 'narrator', character_sms_enabled: true }])
      if (query.includes('SELECT 1 FROM characters WHERE campaign_id=')) return result([{ member: 1 }])
      if (query.includes('SELECT t.*,ca.name')) return result([{
        id: threadId, character_a_id: senderId, character_b_id: recipientId,
        name_a: 'A', name_b: 'B',
      }])
      if (query.includes('SELECT 1 FROM character_messages m')) return result([{ visible: true }])
      return result()
    })
    const messages = await smsMessages(campaignId, 'player', threadId)
    expect(messages.messages).toEqual([])
    const query = mocks.clientQuery.mock.calls.find(([statement]) => String(statement).includes('FROM character_messages m JOIN characters c'))
    expect(query?.[0]).toContain('character_message_deliveries')
    expect(query?.[0]).toContain('ch.user_id=$2')
    expect(query?.[1]?.[1]).toBe('player')
  })
})
