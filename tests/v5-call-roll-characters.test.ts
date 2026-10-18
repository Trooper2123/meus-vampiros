import { beforeEach, expect, it, vi } from 'vitest'
vi.hoisted(() => { vi.stubEnv('NODE_ENV', 'test'); vi.stubEnv('DATABASE_URL', undefined) })
import { devCreateCampaign, devCreateCharacter } from '@/lib/dev-db'
import { getCallRollCharacters } from '@/lib/call-roll-characters'

beforeEach(() => { global.__devDb = undefined })

it('jogador recebe somente fichas próprias aprovadas da mesa, Narrador recebe as autorizadas', () => {
  const campaign = devCreateCampaign('narrator', { name: 'Mesa', theme: null, principios: null, averageXp: 0, status: 'Ativa', lastSessionAt: null })
  const otherCampaign = devCreateCampaign('stranger', { name: 'Outra', theme: null, principios: null, averageXp: 0, status: 'Ativa', lastSessionAt: null })
  const create = (owner: string, campaignId: string, status: string, characterType = 'PLAYER_VAMPIRE') => {
    const character = devCreateCharacter(owner, { campaignId, name: owner, data: { characterType, narratorNotes: 'PRIVATE' } })
    character.status = status
    return character
  }
  const owned = create('player', campaign.id, 'APPROVED')
  const another = create('other-player', campaign.id, 'APPROVED')
  create('player', campaign.id, 'DRAFT')
  create('player', otherCampaign.id, 'APPROVED')
  create('narrator', campaign.id, 'APPROVED', 'HUMAN_NPC')
  expect(getCallRollCharacters('player', campaign.id)).toEqual({ characters: [{ id: owned.id, name: 'player' }] })
  expect(getCallRollCharacters('narrator', campaign.id).characters.map(entry => entry.id)).toEqual([owned.id, another.id])
  expect(() => getCallRollCharacters('outsider', campaign.id)).toThrow('Acesso negado')
  expect(JSON.stringify(getCallRollCharacters('narrator', campaign.id))).not.toContain('PRIVATE')
})
