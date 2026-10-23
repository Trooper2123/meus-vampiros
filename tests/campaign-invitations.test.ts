import { beforeEach, expect, it, vi } from 'vitest'

const session = vi.hoisted(() => {
  vi.stubEnv('NODE_ENV', 'test')
  return vi.fn()
})
vi.mock('@/lib/auth0', () => ({ getSessionOrDev: session }))

import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { createTestCampaign, preparePostgresTest } from './postgres-test-helpers'
import { createCampaignPolicy, getCampaignForJoining, campaignPredatorOverrides, validateCampaignExceptions } from '@/lib/campaign-invitations'
import { POST as preview } from '@/app/api/campaign-invitations/route'
import { POST as createCharacter, PUT as editCharacter } from '@/app/api/characters/route'
import { duplicateCharacter } from '@/lib/characters'
import { savePredatorTypeSettings } from '@/lib/predator-types'
import { PREDATOR_TYPE_BY_CODE, validatePredatorType } from '@/lib/vtm-v5/predator-types'
import { validateCharacter } from '@/lib/vtm-v5/validation'
import { normalizeCharacterRulesInput } from '@/lib/vtm-v5/normalize'
import { POST as markAvailability } from '@/app/api/campaign-availability/route'

let campaignId: string
async function isMember(id: string, userId: string) {
  const result = await db.execute<{ member: boolean }>(sql`SELECT EXISTS (SELECT 1 FROM campaigns WHERE id = ${id}::uuid AND master_user_id = ${userId} UNION SELECT 1 FROM characters WHERE campaign_id = ${id}::uuid AND user_id = ${userId}) AS member`)
  return result.rows[0].member
}
const request = (body: unknown, path = '/api/campaign-invitations') => new Request(`http://localhost${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
beforeEach(async () => {
  await preparePostgresTest()
  const campaign = await createTestCampaign('narrator', 'Mesa compartilhada')
  campaignId = campaign.id
  await db.execute(sql`UPDATE campaigns SET principios = 'privado', enabled_clan_codes = '["VENTRUE"]'::jsonb WHERE id = ${campaignId}::uuid`)
  await createCampaignPolicy('narrator', campaignId, ['PREDATOR_BAGGER_VENTRUE'])
  session.mockResolvedValue({ user: { sub: 'player' } })
})

it('consulta regras pelo ID sem vincular nem revelar dados privados', async () => {
  const response = await preview(request({ campaignId }))
  expect(response.status).toBe(200)
  const body = await response.json()
  expect(body).toMatchObject({ id: campaignId, name: 'Mesa compartilhada', exceptions: [{ code: 'PREDATOR_BAGGER_VENTRUE' }] })
  expect(Object.keys(body).sort()).toEqual(['clans', 'exceptions', 'id', 'name', 'predatorTypes', 'restrictions'])
  expect(JSON.stringify(body)).not.toMatch(/principios|masterUserId|inviteHash|token/)
  expect(body.restrictions).toContain('Farmer não é permitido para Ventrue ou Potência do Sangue 3 ou maior.')
  expect(await isMember(campaignId, 'player')).toBe(false)
  expect(response.headers.get('cache-control')).toContain('no-store')
})

it('permite que mais de um jogador use o mesmo ID e registra os aceites', async () => {
  const create = (name: string) => createCharacter(request({ name, data: { characterType: 'PLAYER_VAMPIRE' }, invitation: { campaignId } }, '/api/characters'))
  expect((await create('Jogador um')).status).toBe(201)
  session.mockResolvedValue({ user: { sub: 'player-two' } })
  expect((await create('Jogador dois')).status).toBe(201)
  expect(await isMember(campaignId, 'player')).toBe(true)
  expect(await isMember(campaignId, 'player-two')).toBe(true)
  const members = await db.execute(sql`SELECT user_id, game_state->'policyConsent'->>'acceptedBy' AS accepted_by FROM characters WHERE campaign_id = ${campaignId}::uuid ORDER BY user_id`)
  expect(members.rows).toEqual([{ user_id: 'player', accepted_by: 'player' }, { user_id: 'player-two', accepted_by: 'player-two' }])
})

it('recusa ID ausente ou inválido, tipo privilegiado e clã bloqueado', async () => {
  expect((await createCharacter(request({ campaignId }, '/api/characters'))).status).toBe(403)
  expect((await createCharacter(request({ invitation: { campaignId: 'invalid' } }, '/api/characters'))).status).toBe(400)
  expect((await createCharacter(request({ invitation: { campaignId }, data: { characterType: 'HUMAN_NPC' } }, '/api/characters'))).status).toBe(400)
  expect((await createCharacter(request({ invitation: { campaignId }, data: { cla: 'Brujah' } }, '/api/characters'))).status).toBe(422)
  expect((await db.execute(sql`SELECT id FROM characters WHERE campaign_id = ${campaignId}::uuid`)).rows).toHaveLength(0)
})

it('consulta e vínculo exigem autenticação e origem same-origin', async () => {
  const crossSite = request({ campaignId })
  crossSite.headers.set('origin', 'https://evil.invalid')
  expect((await preview(crossSite)).status).toBe(403)
  const crossSiteJoin = request({ invitation: { campaignId } }, '/api/characters')
  crossSiteJoin.headers.set('origin', 'https://evil.invalid')
  expect((await createCharacter(crossSiteJoin)).status).toBe(403)
  session.mockResolvedValue(null)
  expect((await preview(request({ campaignId }))).status).toBe(401)
  expect((await createCharacter(request({ invitation: { campaignId } }, '/api/characters'))).status).toBe(401)
})

it('somente o Narrador cria a política e ela não pode ser alterada depois', async () => {
  await expect(createCampaignPolicy('player', campaignId, [])).rejects.toThrow('Acesso negado')
  await expect(createCampaignPolicy('narrator', campaignId, [])).rejects.toThrow('apenas na criação')
  await expect(savePredatorTypeSettings(campaignId, { enabledSources: ['COREBOOK'], enabledCodes: null, disabledCodes: [] }, 'narrator')).rejects.toMatchObject({ status: 409 })
})

it('exceções aplicam-se somente à mesa autorizada e não liberam tipo desativado', async () => {
  const definition = PREDATOR_TYPE_BY_CODE.get('BAGGER')!
  const overrides = await campaignPredatorOverrides(campaignId)
  expect(validatePredatorType(definition, { clan: 'Ventrue', bloodPotency: 1, isThinBlood: false, enabled: true, overrides }).valid).toBe(true)
  expect(validatePredatorType(definition, { clan: 'Ventrue', bloodPotency: 1, isThinBlood: false, enabled: true, overrides: await campaignPredatorOverrides(null) }).valid).toBe(false)
  expect(validatePredatorType(definition, { clan: 'Ventrue', bloodPotency: 1, isThinBlood: false, enabled: false, overrides }).valid).toBe(false)
})

it.each([['INVALID'], ['PREDATOR_TYPE_DISABLED_FOR_CAMPAIGN'], ['PREDATOR_BAGGER_VENTRUE', 'PREDATOR_BAGGER_VENTRUE']])('recusa exceções inválidas: %j', (...codes) => {
  expect(() => validateCampaignExceptions(codes)).toThrow()
})

it('duplicação não transfere vínculo ou aceite e criação independente continua normal', async () => {
  const response = await createCharacter(request({ name: 'Original', invitation: { campaignId } }, '/api/characters'))
  const { id } = await response.json()
  const copy = await duplicateCharacter(id, 'player')
  const stored = await db.execute<{ campaign_id: string | null; game_state: Record<string, unknown> }>(sql`SELECT campaign_id, game_state FROM characters WHERE id = ${copy!.id}::uuid`)
  expect(stored.rows[0].campaign_id).toBeNull()
  expect(stored.rows[0].game_state).not.toHaveProperty('policyConsent')
  expect((await createCharacter(request({ name: 'Independente' }, '/api/characters'))).status).toBe(201)
})

it('vínculo inicial não pode ser contornado ao criar outra ficha nem ao editar', async () => {
  const response = await createCharacter(request({ invitation: { campaignId } }, '/api/characters'))
  const { id } = await response.json()
  expect((await editCharacter(request({ id, expectedRevision: 0, data: { cla: 'Brujah' } }, '/api/characters'))).status).toBe(422)
  expect((await createCharacter(request({ campaignId, name: 'Sem vínculo' }, '/api/characters'))).status).toBe(409)
})

it('validação final usa exceção da mesa sem dispensar outros requisitos', async () => {
  const input = normalizeCharacterRulesInput({ cla: 'Ventrue', predador: 'Bagger' })
  expect(validateCharacter(input).errors.some(error => error.code === 'PREDATOR_BAGGER_VENTRUE')).toBe(true)
  const report = validateCharacter(input, (await campaignPredatorOverrides(campaignId)).map(rule => rule.ruleCode))
  expect(report.errors.some(error => error.code === 'PREDATOR_BAGGER_VENTRUE')).toBe(false)
  expect(report.valid).toBe(false)
  expect(report.errors.some(error => error.code === 'ATTRIBUTES_OUT_OF_RANGE')).toBe(true)
})

it('Narrador em outra mesa ingressa como jogador sem privilégio de planejamento', async () => {
  await createTestCampaign('player', 'Outra mesa')
  const response = await createCharacter(request({ invitation: { campaignId } }, '/api/characters'))
  expect(response.status).toBe(201)
  const availabilityRequest = new Request('http://localhost/api/campaign-availability', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ campaignId, date: '2026-10-15', status: 'disponível', suggested: true }) })
  const availability = await markAvailability(availabilityRequest)
  expect(availability.status).toBe(200)
  expect((await availability.json()).entry).toMatchObject({ userId: 'player', suggested: false })
})
