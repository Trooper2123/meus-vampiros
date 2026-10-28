import { beforeEach, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ execute: vi.fn(), character: vi.fn() }))
vi.mock('@/lib/db', () => ({ db: { execute: mocks.execute } }))
vi.mock('@/lib/character-commands', async original => ({ ...await original<typeof import('@/lib/character-commands')>(), getCommandCharacter: mocks.character }))

import { hasMasterAccess } from '@/lib/campaigns'
import { canManageCampaign } from '@/lib/auth/authorization'
import { getCharacterForViewer } from '@/lib/characters'
import { ownNpc, requireNpcCampaign } from '@/lib/npc-store'

const id = '11111111-1111-4111-8111-111111111111'
beforeEach(() => vi.resetAllMocks())

it('acesso comum não concede gestão de uma mesa de terceiro', async () => {
  expect(await hasMasterAccess({ sub: 'user' })).toBe(true)
  mocks.execute.mockResolvedValue({ rows: [] })
  expect(await canManageCampaign('user', id)).toBe(false)
  mocks.execute.mockResolvedValue({ rows: [{ id, last_session_at: null }] })
  expect(await canManageCampaign('owner', id)).toBe(true)
})

it('perfil comum não permite consultar ficha de outro usuário', async () => {
  expect(await hasMasterAccess({ sub: 'other' })).toBe(true)
  mocks.character.mockResolvedValue({ ownerId: 'owner', masterId: 'narrator' })
  expect(await getCharacterForViewer(id, 'other')).toBeNull()
  expect(mocks.execute).not.toHaveBeenCalled()
})

it('preserva acesso do dono e Narrador atual e revoga o Narrador após desvínculo', async () => {
  mocks.execute.mockResolvedValue({ rows: [{ id, data: {}, game_state: {}, campaign_id: id }] })
  mocks.character.mockResolvedValue({ ownerId: 'owner', masterId: 'narrator', gameState: {} })
  expect(await getCharacterForViewer(id, 'owner')).not.toBeNull()
  expect(await getCharacterForViewer(id, 'narrator')).not.toBeNull()
  mocks.character.mockResolvedValue({ ownerId: 'owner', masterId: null, gameState: {} })
  expect(await getCharacterForViewer(id, 'narrator')).toBeNull()
  expect(await getCharacterForViewer(id, 'owner')).not.toBeNull()
})

it('NPC e vínculo de NPC com mesa continuam exigindo proprietário específico', async () => {
  expect(await hasMasterAccess({ sub: 'other' })).toBe(true)
  mocks.execute.mockResolvedValue({ rows: [{ id, owner_id: 'owner', master_user_id: 'owner' }] })
  await expect(ownNpc('other', id)).rejects.toMatchObject({ status: 403 })
  await expect(requireNpcCampaign('other', id)).rejects.toMatchObject({ status: 403 })
  expect(await ownNpc('owner', id)).toMatchObject({ owner_id: 'owner' })
  await expect(requireNpcCampaign('owner', id)).resolves.toBeUndefined()
})
