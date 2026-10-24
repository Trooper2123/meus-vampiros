import { beforeEach, expect, it } from 'vitest'
import { randomUUID } from 'node:crypto'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { preparePostgresTest, createTestCampaign, createTestCharacter } from './postgres-test-helpers'
import { getCharacterForViewer } from '@/lib/characters'
import { getCharacterSummaryData } from '@/lib/character-summary'

beforeEach(() => { preparePostgresTest() })

it('projeção compartilhada mantém habilidades, concessões e autorização', async () => {
  const owner = `owner-${randomUUID()}`
  const character = await createTestCharacter(owner, null, 'Ficha', { 'habilidade-briga': '3', forca: 'inválido', anotacaoPrivada: 'segredo' })
  const summary = await getCharacterSummaryData(character.id, owner)
  expect(summary?.skills.Briga).toBe(3)
  expect(summary?.attributes.forca).toBe(0)
  expect(JSON.stringify(summary)).not.toContain('segredo')
  expect(await getCharacterSummaryData(character.id, 'other')).toBeNull()
})

it('permite resumo ao dono/Narrador atual e revoga após desvínculo ou troca', async () => {
  const owner = `owner-${randomUUID()}`, narrator = `narrator-${randomUUID()}`, newNarrator = `narrator-${randomUUID()}`
  const campaign = await createTestCampaign(narrator)
  const character = await createTestCharacter(owner, campaign.id, 'Participante')
  expect(await getCharacterForViewer(character.id, owner)).not.toBeNull()
  expect(await getCharacterForViewer(character.id, narrator)).not.toBeNull()
  expect(await getCharacterForViewer(character.id, 'other')).toBeNull()
  await db.execute(sql`UPDATE campaigns SET master_user_id=${newNarrator} WHERE id=${campaign.id}::uuid`)
  expect(await getCharacterForViewer(character.id, narrator)).toBeNull()
  expect(await getCharacterForViewer(character.id, newNarrator)).not.toBeNull()
  await db.execute(sql`UPDATE characters SET campaign_id=NULL WHERE id=${character.id}::uuid`)
  expect(await getCharacterForViewer(character.id, newNarrator)).toBeNull()
  expect(await getCharacterForViewer(character.id, owner)).not.toBeNull()
})
