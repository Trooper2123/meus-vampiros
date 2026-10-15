import { beforeEach, expect, it, vi } from 'vitest'

const session = vi.hoisted(() => {
  vi.stubEnv('NODE_ENV', 'test')
  vi.stubEnv('DATABASE_URL', undefined)
  return vi.fn()
})
vi.mock('@/lib/auth0', () => ({ getSessionOrDev: session }))
vi.mock('@/lib/db', () => ({ ensureAllTables: vi.fn(), db: null }))

import { devCreateCampaign, devIsUserInCampaign } from '@/lib/dev-db'
import { createCampaignInvitation, invitedCampaign, campaignPredatorOverrides, validateCampaignExceptions } from '@/lib/campaign-invitations'
import { POST as preview } from '@/app/api/campaign-invitations/route'
import { POST as createCharacter, PUT as editCharacter } from '@/app/api/characters/route'
import { duplicateCharacter } from '@/lib/characters'
import { savePredatorTypeSettings } from '@/lib/predator-types'
import { PREDATOR_TYPE_BY_CODE, validatePredatorType } from '@/lib/vtm-v5/predator-types'
import { validateCharacter } from '@/lib/vtm-v5/validation'
import { normalizeCharacterRulesInput } from '@/lib/vtm-v5/normalize'
import { POST as markAvailability } from '@/app/api/campaign-availability/route'

let campaignId: string
let token: string
const request = (body: unknown) => new Request('http://localhost/api/campaign-invitations', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
beforeEach(() => {
  global.__devDb = { characters: [], campaigns: [], possessions: [], characterLedgerEvents: [] }
  const campaign = devCreateCampaign('narrator', { name: 'Mesa convidada', theme: null, principios: 'privado', averageXp: null, status: 'Ativa', lastSessionAt: null, enabledClanCodes: ['VENTRUE'] })
  campaignId = campaign.id
  token = createCampaignInvitation('narrator', campaignId, ['PREDATOR_BAGGER_VENTRUE'])
  session.mockResolvedValue({ user: { sub: 'player' } })
})
it('armazena somente hash e não concede acesso apenas pela leitura', async () => {
  expect(JSON.stringify(global.__devDb)).not.toContain(token)
  const response = await preview(request({ campaignId, token }))
  expect(response.status).toBe(200)
  expect(await response.json()).toMatchObject({ id: campaignId, name: 'Mesa convidada', exceptions: [{ code: 'PREDATOR_BAGGER_VENTRUE' }] })
  expect(devIsUserInCampaign(campaignId, 'player')).toBe(false)
  expect(response.headers.get('cache-control')).toContain('no-store')
})
it('ciência com convite cria vínculo, acesso como jogador e registro sem token', async () => {
  const response = await createCharacter(request({ name: 'Convidado', data: { characterType: 'PLAYER_VAMPIRE' }, invitation: { campaignId, token, accepted: true } }))
  expect(response.status).toBe(201)
  expect(devIsUserInCampaign(campaignId, 'player')).toBe(true)
  expect(global.__devDb!.characters[0]).toMatchObject({ campaignId, userId: 'player', status: 'DRAFT', gameState: { policyConsent: { campaignId, acceptedBy: 'player' } } })
  expect(JSON.stringify(global.__devDb)).not.toContain(token)
  expect(global.__devDb!.campaigns[0].masterUserId).toBe('narrator')
})
it.each([false, undefined])('não aceita convite sem ciência explícita: %j', async accepted => {
  expect((await createCharacter(request({ invitation: { campaignId, token, accepted } }))).status).toBe(400)
  expect(devIsUserInCampaign(campaignId, 'player')).toBe(false)
})
it('ID sozinho e convite forjado não permitem ingresso', async () => {
  expect((await createCharacter(request({ campaignId }))).status).toBe(403)
  expect((await createCharacter(request({ invitation: { campaignId, token: 'x'.repeat(43), accepted: true } }))).status).toBe(403)
  expect(global.__devDb!.characters).toHaveLength(0)
})
it('recusa clã proibido e tipo de ficha privilegiado', async () => {
  const invitation = { campaignId, token, accepted: true }
  expect((await createCharacter(request({ data: { cla: 'Brujah' }, invitation }))).status).toBe(422)
  expect((await createCharacter(request({ data: { characterType: 'HUMAN_NPC' }, invitation }))).status).toBe(400)
  expect(global.__devDb!.characters).toHaveLength(0)
})
it('consulta exige autenticação, token e origem válida, sem dados privados', async () => {
  const response = await preview(request({ campaignId, token }))
  const body = await response.json()
  expect(Object.keys(body).sort()).toEqual(['clans', 'exceptions', 'id', 'name', 'predatorTypes', 'restrictions'])
  expect(body.restrictions).toContain('Farmer não é permitido para Ventrue ou Potência do Sangue 3 ou maior.')
  expect(JSON.stringify(body)).not.toMatch(/inviteHash|principios|masterUserId|token/)
  expect((await preview(request({ campaignId, token: 'wrong' }))).status).toBe(403)
  const crossSite = request({ campaignId, token })
  crossSite.headers.set('origin', 'https://attacker.example')
  expect((await preview(crossSite)).status).toBe(403)
  const crossSiteAcceptance = request({ invitation: { campaignId, token, accepted: true } })
  crossSiteAcceptance.headers.set('origin', 'https://attacker.example')
  expect((await createCharacter(crossSiteAcceptance)).status).toBe(403)
  expect(devIsUserInCampaign(campaignId, 'player')).toBe(false)
  session.mockResolvedValue(null)
  expect((await preview(request({ campaignId, token }))).status).toBe(401)
  expect((await createCharacter(request({ invitation: { campaignId, token, accepted: true } }))).status).toBe(401)
})
it('política só é criada pelo Narrador e não é editável depois', async () => {
  expect(() => createCampaignInvitation('player', campaignId, [])).toThrow('Acesso negado')
  expect(() => createCampaignInvitation('narrator', campaignId, [])).toThrow('apenas na criação')
  await expect(savePredatorTypeSettings(campaignId, { enabledSources: ['COREBOOK'], enabledCodes: null, disabledCodes: [] }, 'narrator')).rejects.toMatchObject({ status: 409 })
})
it('exceção aplica-se somente à mesa autorizada e não libera tipo desativado', () => {
  const definition = PREDATOR_TYPE_BY_CODE.get('BAGGER')!
  const overrides = campaignPredatorOverrides(campaignId)
  expect(validatePredatorType(definition, { clan: 'Ventrue', bloodPotency: 1, isThinBlood: false, enabled: true, overrides }).valid).toBe(true)
  expect(validatePredatorType(definition, { clan: 'Ventrue', bloodPotency: 1, isThinBlood: false, enabled: true, overrides: campaignPredatorOverrides(null) }).valid).toBe(false)
  expect(validatePredatorType(definition, { clan: 'Ventrue', bloodPotency: 1, isThinBlood: false, enabled: false, overrides }).valid).toBe(false)
})
it.each([['INVALID'], ['PREDATOR_TYPE_DISABLED_FOR_CAMPAIGN'], ['PREDATOR_BAGGER_VENTRUE', 'PREDATOR_BAGGER_VENTRUE']])('recusa exceções inválidas: %j', (...codes) => {
  expect(() => validateCampaignExceptions(codes)).toThrow()
})
it('duplicação não transfere acesso nem aceite e criação independente continua normal', async () => {
  const response = await createCharacter(request({ name: 'Original', invitation: { campaignId, token, accepted: true } }))
  const { id } = await response.json()
  const copy = await duplicateCharacter(id, 'player')
  const stored = global.__devDb!.characters.find(character => character.id === copy!.id)!
  expect(stored.campaignId).toBeNull()
  expect(stored.gameState).not.toHaveProperty('policyConsent')
  expect((await createCharacter(request({ name: 'Independente' }))).status).toBe(201)
})
it('não usa memória como fallback para convites em produção', () => {
  vi.stubEnv('NODE_ENV', 'production')
  try { expect(() => invitedCampaign(campaignId, token)).toThrow('banco externo') }
  finally { vi.stubEnv('NODE_ENV', 'test') }
})
it('edição geral não contorna clãs permitidos e membro não pode pular ciência em nova ficha', async () => {
  const response = await createCharacter(request({ invitation: { campaignId, token, accepted: true } }))
  const { id } = await response.json()
  expect((await editCharacter(request({ id, expectedRevision: 0, data: { cla: 'Brujah' } }))).status).toBe(422)
  expect((await createCharacter(request({ campaignId, name: 'Sem ciência' }))).status).toBe(409)
})
it('validação final usa a exceção da mesa sem dispensar outros requisitos', () => {
  const input = normalizeCharacterRulesInput({ cla: 'Ventrue', predador: 'Bagger' })
  expect(validateCharacter(input).errors.some(error => error.code === 'PREDATOR_BAGGER_VENTRUE')).toBe(true)
  const report = validateCharacter(input, campaignPredatorOverrides(campaignId).map(rule => rule.ruleCode))
  expect(report.errors.some(error => error.code === 'PREDATOR_BAGGER_VENTRUE')).toBe(false)
  expect(report.valid).toBe(false)
  expect(report.errors.some(error => error.code === 'ATTRIBUTES_OUT_OF_RANGE')).toBe(true)
})
it('Narrador em outra mesa ingressa como jogador, sem privilégio de planejamento', async () => {
  devCreateCampaign('player', { name: 'Outra mesa', theme: null, principios: null, averageXp: null, status: 'Ativa', lastSessionAt: null })
  await createCharacter(request({ invitation: { campaignId, token, accepted: true } }))
  const response = await markAvailability(request({ campaignId, date: '2026-10-15', status: 'disponível', suggested: true }))
  expect(response.status).toBe(200)
  expect((await response.json()).entry).toMatchObject({ userId: 'player', name: 'Jogador', suggested: false })
})
