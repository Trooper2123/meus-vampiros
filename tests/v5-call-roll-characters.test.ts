import { beforeEach, expect, it } from 'vitest'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { createTestCampaign, createTestCharacter, preparePostgresTest } from './postgres-test-helpers'
import { getCallRollCharacters } from '@/lib/call-roll-characters'

beforeEach(preparePostgresTest)

it('jogador recebe somente fichas próprias aprovadas e Narrador recebe as fichas autorizadas', async () => {
  const campaign = await createTestCampaign('roll-narrator')
  const otherCampaign = await createTestCampaign('roll-stranger')
  const create = async (owner: string, campaignId: string, name: string, type = 'PLAYER_VAMPIRE') => {
    const character = await createTestCharacter(owner, campaignId, name)
    await db.execute(sql`UPDATE characters SET status = 'APPROVED', character_type = ${type}, data = '{"narratorNotes":"PRIVATE"}'::jsonb WHERE id = ${character.id}::uuid`)
    return character
  }
  const owned = await create('roll-player', campaign.id, 'owned')
  const another = await create('roll-other-player', campaign.id, 'another')
  await create('roll-player', campaign.id, 'draft').then(character => db.execute(sql`UPDATE characters SET status = 'DRAFT' WHERE id = ${character.id}::uuid`))
  await create('roll-player', otherCampaign.id, 'outside')
  await create('roll-narrator', campaign.id, 'npc', 'HUMAN_NPC')

  expect(await getCallRollCharacters('roll-player', campaign.id)).toEqual({ characters: [{ id: owned.id, name: 'owned' }] })
  expect((await getCallRollCharacters('roll-narrator', campaign.id)).characters.map(entry => entry.id)).toEqual([another.id, owned.id])
  await expect(getCallRollCharacters('roll-outsider', campaign.id)).rejects.toThrow('Acesso negado')
  expect(JSON.stringify(await getCallRollCharacters('roll-narrator', campaign.id))).not.toContain('PRIVATE')
})
