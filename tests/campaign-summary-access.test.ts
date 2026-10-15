import { beforeEach, expect, it, vi } from 'vitest'
import { devCreateCampaign, devCreateCharacter } from '@/lib/dev-db'
import { getCharacterForViewer } from '@/lib/characters'
import { getCharacterSummaryData } from '@/lib/character-summary'

beforeEach(() => {
  vi.stubEnv('NODE_ENV', 'test')
  vi.stubEnv('DATABASE_URL', '')
  global.__devDb = undefined
})

it('projeção compartilhada mantém habilidades, concessões e autorização', async () => {
  const character = devCreateCharacter('owner', { name: 'Ficha', data: { 'habilidade-briga': '3', forca: 'inválido', anotacaoPrivada: 'segredo' } })
  const summary = await getCharacterSummaryData(character.id, 'owner')
  expect(summary?.skills.Briga).toBe(3)
  expect(summary?.attributes.forca).toBe(0)
  expect(JSON.stringify(summary)).not.toContain('segredo')
  expect(await getCharacterSummaryData(character.id, 'other')).toBeNull()
})

it('permite resumo ao dono/Narrador atual e revoga após desvínculo ou troca', async () => {
  const campaign = devCreateCampaign('narrator', { name: 'Mesa', theme: null, principios: null, averageXp: 0, status: 'Ativa', lastSessionAt: null })
  const character = devCreateCharacter('owner', { campaignId: campaign.id, name: 'Participante' })
  expect(await getCharacterForViewer(character.id, 'owner')).not.toBeNull()
  expect(await getCharacterForViewer(character.id, 'narrator')).not.toBeNull()
  expect(await getCharacterForViewer(character.id, 'other')).toBeNull()
  global.__devDb!.campaigns.find(entry => entry.id === campaign.id)!.masterUserId = 'new-narrator'
  expect(await getCharacterForViewer(character.id, 'narrator')).toBeNull()
  expect(await getCharacterForViewer(character.id, 'new-narrator')).not.toBeNull()
  character.campaignId = null
  expect(await getCharacterForViewer(character.id, 'new-narrator')).toBeNull()
  expect(await getCharacterForViewer(character.id, 'owner')).not.toBeNull()
})
