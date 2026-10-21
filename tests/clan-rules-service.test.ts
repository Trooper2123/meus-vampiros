import { beforeEach, expect, it, vi } from 'vitest'
import type { CommandCharacter } from '@/lib/character-commands'
import type { RollInput } from '@/lib/character-rolls'
import type { ClanCondition } from '@/lib/vtm-v5/clan-mechanics'

const mocks = vi.hoisted(() => {
  vi.stubEnv('DATABASE_URL', undefined)
  return { session: vi.fn(), run: vi.fn(), get: vi.fn(), ensure: vi.fn(), policy: vi.fn(), manages: vi.fn(), characters: vi.fn(), access: vi.fn() }
})
vi.mock('@/lib/auth0', () => ({ getSessionOrDev: mocks.session }))
vi.mock('@/lib/db', async original => ({ ...await original<typeof import('@/lib/db')>(), ensureAllTables: mocks.ensure }))
vi.mock('@/lib/character-commands', async original => ({ ...await original<typeof import('@/lib/character-commands')>(), runCharacterCommand: mocks.run, getCommandCharacter: mocks.get }))
vi.mock('@/lib/campaign-clans', () => ({ campaignClanCodes: async () => ['MINISTRY', 'LASOMBRA', 'HECATA', 'BANU_HAQIM', 'RAVNOS', 'SALUBRI', 'TZIMISCE'] }))
vi.mock('@/lib/blood-policy', () => ({ getBloodPolicy: mocks.policy }))
vi.mock('@/lib/auth/authorization', () => ({ canManageCampaign: mocks.manages }))
vi.mock('@/lib/characters', () => ({ getCharactersForCampaign: mocks.characters, getCharacterAccessRecord: mocks.access }))

import { CharacterCommandError } from '@/lib/character-commands'
import { getClanView, setCharacterClanConditions, selectCharacterClan } from '@/lib/character-clans'
import { executeCharacterRoll } from '@/lib/character-rolls'
import { characterRollHistory, visibleCharacterRolls } from '@/lib/character-roll-history'
import { GET as getClan, PATCH } from '@/app/api/characters/[id]/clan/route'
import { POST as roll, GET as getRolls } from '@/app/api/characters/[id]/rolls/route'
import { GET as getCampaignClans } from '@/app/api/campaigns/[id]/clans/route'
import { DEFAULT_BLOOD_POLICY } from '@/lib/vtm-v5/blood-potency'

const id = '11111111-1111-4111-8111-111111111111'
const campaignId = '22222222-2222-4222-8222-222222222222'
const key = '33333333-3333-4333-8333-333333333333'
const context = { params: Promise.resolve({ id }) }
const input: RollInput = { attribute: 'forca', skillId: 'briga', difficulty: 2, visibility: 'PUBLIC', reason: 'Teste', expectedRevision: 0, idempotencyKey: key }
let fixture: CommandCharacter
const provider = { rollD10: vi.fn((count: number) => Array<number>(count).fill(6)) }
const activate = (active: ClanCondition[]) => { fixture.gameState.clanConditions = { campaignId, clanCode: fixture.data.clanCode, active } }
const request = (body: unknown, method = 'PATCH', path = 'clan') => new Request(`http://localhost/api/characters/${id}/${path}`, { method, headers: { 'Content-Type': 'application/json', origin: 'http://localhost' }, body: JSON.stringify(body) })

beforeEach(() => {
  vi.clearAllMocks()
  fixture = { id, campaignId, ownerId: 'player', masterId: 'narrator', name: 'Fixture', status: 'APPROVED', characterType: 'PLAYER_VAMPIRE', totalXp: 9, spentXp: 2, revision: 0, data: { clanCode: 'MINISTRY', cla: 'Ministério', 'potencia-de-sangue': 1, geracao: 13, humanidade: 7, forca: 3, vigor: 2, determinacao: 3, compostura: 2, 'habilidade-briga': 3, 'habilidade-tecnologia': 2 }, gameState: { hunger: 2, healthDamage: { superficial: 1, aggravated: 0 } } }
  mocks.session.mockResolvedValue({ user: { sub: 'narrator' } })
  mocks.get.mockImplementation(async (characterId: string) => characterId === fixture.id ? fixture : null)
  mocks.policy.mockResolvedValue(DEFAULT_BLOOD_POLICY)
  mocks.manages.mockImplementation(async (actor: string, campaign: string) => actor === 'narrator' && campaign === campaignId)
  mocks.characters.mockResolvedValue([{ id }])
  mocks.access.mockImplementation(async () => fixture)
  // Isolar a fronteira de persistência; executar as validações/predicados reais dos serviços.
  mocks.run.mockImplementation(async (actor: string, characterId: string, command: { expectedRevision: number }, authorize: (character: CommandCharacter) => boolean, apply: (character: CommandCharacter) => Promise<Record<string, unknown>>) => {
    if (characterId !== fixture.id) throw new CharacterCommandError(404, 'Ficha não encontrada.')
    if (!authorize(fixture)) throw new CharacterCommandError(403, 'Acesso negado.')
    if (command.expectedRevision !== fixture.revision) throw new CharacterCommandError(409, 'Revisão obsoleta.')
    return { ...await apply(fixture), revision: ++fixture.revision }
  })
})

it.each(['player', 'other', 'other-narrator'])('não permite ativar condições como %s', async actor => {
  await expect(setCharacterClanConditions(id, actor, ['BRIGHT_LIGHT'], 0, key)).rejects.toMatchObject({ status: 403 })
  expect(fixture.gameState).not.toHaveProperty('clanConditions')
})

it('Narrador ativa/remove condições sem alterar dados, danos, status ou XP', async () => {
  const before = structuredClone(fixture)
  expect(await setCharacterClanConditions(id, 'narrator', ['BRIGHT_LIGHT'], 0, key)).toMatchObject({ ok: true, conditions: ['BRIGHT_LIGHT'] })
  expect(mocks.run.mock.calls[0][2]).toMatchObject({ key, expectedRevision: 0, type: 'CLAN_CONDITIONS_SET' })
  expect(fixture.data).toEqual(before.data)
  expect(fixture.gameState.healthDamage).toEqual(before.gameState.healthDamage)
  expect([fixture.totalXp, fixture.spentXp, fixture.status]).toEqual([9, 2, 'APPROVED'])
  await setCharacterClanConditions(id, 'narrator', [], 1, key)
  expect(fixture.gameState.clanConditions).toMatchObject({ active: [] })
})

it('rejeita condição incompatível, valor forjado, duplicidade e revisão obsoleta', async () => {
  await expect(setCharacterClanConditions(id, 'narrator', ['ELECTRONIC_DETECTION'], 0, key)).rejects.toMatchObject({ status: 422 })
  expect(() => setCharacterClanConditions(id, 'narrator', ['BRIGHT_LIGHT', 'BRIGHT_LIGHT'], 0, key)).toThrow()
  expect(() => setCharacterClanConditions(id, 'narrator', { dicePenalty: -10 }, 0, key)).toThrow()
  await expect(setCharacterClanConditions(id, 'narrator', ['BRIGHT_LIGHT'], 9, key)).rejects.toMatchObject({ status: 409 })
})

it('selecionar novamente o clã elimina condições anteriores para não reativá-las depois', async () => {
  activate(['BRIGHT_LIGHT'])
  await selectCharacterClan(id, 'narrator', { code: 'MINISTRY', disciplineDots: { Ofuscação: 2, Presença: 1 } }, 0, key)
  expect(fixture.gameState).not.toHaveProperty('clanConditions')
})

it('não concede poderes de Narrador ao dono de ficha independente', async () => {
  fixture.campaignId = null; fixture.masterId = null
  await expect(setCharacterClanConditions(id, 'player', ['BRIGHT_LIGHT'], 0, key)).rejects.toMatchObject({ status: 403 })
})

it('aplica luz + compulsão antes de distribuir Fome, registra fontes e mantém o histórico imutável', async () => {
  activate(['BRIGHT_LIGHT', 'COMPULSION_PENALTY'])
  const result = await executeCharacterRoll('player', id, input, provider)
  expect(result).toMatchObject({ pool: 3, clanModifiers: { dicePenalty: 3 }, result: { normalDice: [6], hungerDice: [6, 6] } })
  expect(provider.rollD10).toHaveBeenCalledExactlyOnceWith(3)
  expect(result.sources).toContainEqual(expect.objectContaining({ id: 'CLAN-MINISTRY' }))
  fixture.gameState.clanConditions = undefined
  expect(characterRollHistory(fixture)[0].clanModifiers?.dicePenalty).toBe(3)
})

it('respeita a severidade do perfil de sangue da campanha', async () => {
  mocks.policy.mockResolvedValue({ ...DEFAULT_BLOOD_POLICY, rulesetVersion: 'COMPANION_ERRATA_P63_V1' })
  activate(['BRIGHT_LIGHT'])
  expect(await executeCharacterRoll('player', id, input, provider)).toMatchObject({ pool: 4, clanModifiers: { dicePenalty: 2 } })
})

it('não aplica penalidade a checks e nunca gera pools negativos', async () => {
  activate(['COMPULSION_PENALTY', 'BRIGHT_LIGHT'])
  expect(await executeCharacterRoll('player', id, { ...input, mode: 'CHECK' }, provider)).toMatchObject({ pool: 1, result: { hungerDice: [] } })
  fixture.data.forca = 1; fixture.data['habilidade-briga'] = 0
  expect(await executeCharacterRoll('player', id, { ...input, expectedRevision: 1 }, provider)).toMatchObject({ pool: 0, result: { normalDice: [], hungerDice: [] } })
})

it('não aceita exceção ou dificuldade especial declarada pelo jogador', async () => {
  activate(['COMPULSION_PENALTY'])
  await expect(executeCharacterRoll('player', id, { ...input, clanContext: { pursuingCompulsion: true } }, provider)).rejects.toMatchObject({ status: 403 })
  expect(provider.rollD10).not.toHaveBeenCalled()
  expect(await executeCharacterRoll('narrator', id, { ...input, clanContext: { pursuingCompulsion: true } }, provider)).toMatchObject({ pool: 6, clanModifiers: { dicePenalty: 0 } })
})

it('Lasombra usa dificuldade calculada apenas no contexto de comunicação e preserva sigilo', async () => {
  fixture.data.clanCode = 'LASOMBRA'
  const command = { ...input, skillId: 'tecnologia', clanContext: { communication: true }, hiddenDifficulty: true }
  await expect(executeCharacterRoll('player', id, command, provider)).rejects.toMatchObject({ status: 403 })
  expect(await executeCharacterRoll('narrator', id, command, provider)).toMatchObject({ pool: 5, result: { difficulty: 3 } })
  const visible = visibleCharacterRolls(fixture, 'player')[0]
  expect(visible.result).not.toHaveProperty('difficulty')
  expect(visible.clanModifiers).not.toHaveProperty('difficulty')
  expect(visible).not.toHaveProperty('actorId')
})

it('bloqueia comunicação para habilidade/modo incorretos, contexto inválido e severidade indisponível', async () => {
  fixture.data.clanCode = 'LASOMBRA'
  await expect(executeCharacterRoll('narrator', id, { ...input, clanContext: { communication: true } }, provider)).rejects.toMatchObject({ status: 422 })
  expect(() => executeCharacterRoll('narrator', id, { ...input, clanContext: { dicePenalty: -3 } } as unknown as RollInput, provider)).toThrow()
  fixture.data['potencia-de-sangue'] = 'invalid'; activate(['ELECTRONIC_DETECTION'])
  await expect(executeCharacterRoll('player', id, input, provider)).rejects.toMatchObject({ status: 422 })
  expect(provider.rollD10).not.toHaveBeenCalled()
})

it('GET da ficha exige permissão, usa catálogo central, suporta ficha legada e não vaza guidance', async () => {
  delete fixture.data.clanCode
  const player = await getClanView(id, 'player')
  expect(player.selection).toMatchObject({ code: 'MINISTRY' })
  expect(player.canManageConditions).toBe(false)
  expect(player.clans.find(clan => clan.code === 'MINISTRY')).not.toHaveProperty('guidance')
  expect((await getClanView(id, 'narrator')).canManageConditions).toBe(true)
  await expect(getClanView(id, 'other')).rejects.toMatchObject({ status: 403 })
  expect((await getClan(new Request('http://localhost'), context)).headers.get('cache-control')).toBe('private, no-store')
})

it('PATCH exige sessão, papel da própria mesa, identificador válido, JSON e mesma origem', async () => {
  const body = { active: ['BRIGHT_LIGHT'], expectedRevision: 0, key }
  mocks.session.mockResolvedValue(null)
  expect((await PATCH(request(body), context)).status).toBe(401)
  mocks.session.mockResolvedValue({ user: { sub: 'player' } })
  expect((await PATCH(request(body), context)).status).toBe(403)
  mocks.session.mockResolvedValue({ user: { sub: 'narrator' } })
  expect((await PATCH(request(body), { params: Promise.resolve({ id: 'bad' }) })).status).toBe(400)
  expect((await PATCH(request({ ...body, dicePenalty: 0 }), context)).status).toBe(400)
  const crossSite = request(body); crossSite.headers.set('origin', 'https://evil.example')
  expect((await PATCH(crossSite, context)).status).toBe(403)
  expect((await PATCH(request(body), { params: Promise.resolve({ id: campaignId }) })).status).toBe(404)
  expect((await PATCH(request(body), context)).status).toBe(200)
})

it('API de rolagens rejeita modificadores/contexto forjados e aplica condições sem confiar no cliente', async () => {
  activate(['COMPULSION_PENALTY'])
  mocks.session.mockResolvedValue({ user: { sub: 'player' } })
  expect((await roll(request({ ...input, clanContext: { dicePenalty: -10 } }, 'POST', 'rolls'), context)).status).toBe(400)
  expect((await roll(request({ ...input, clanContext: { pursuingCompulsion: true } }, 'POST', 'rolls'), context)).status).toBe(403)
  const response = await roll(request(input, 'POST', 'rolls'), context)
  expect(response.status).toBe(200)
  expect(await response.json()).toMatchObject({ pool: 4, clanModifiers: { dicePenalty: 2 } })
  expect(await (await getRolls(new Request('http://localhost'), context)).json()).toMatchObject({ clanConditions: ['COMPULSION_PENALTY'] })
})

it('rolagens rejeitam origem cruzada, JSON excessivo e identidade não autenticada', async () => {
  const foreign = request(input, 'POST', 'rolls'); foreign.headers.set('origin', 'https://evil.example')
  expect((await roll(foreign, context)).status).toBe(403)
  expect((await roll(request({ ...input, reason: 'a'.repeat(100001) }, 'POST', 'rolls'), context)).status).toBe(413)
  mocks.session.mockResolvedValue(null)
  expect((await roll(request(input, 'POST', 'rolls'), context)).status).toBe(401)
})

it('campanha retorna somente clãs próprios completos com cache privado; bloqueia jogador e outra mesa', async () => {
  const campaignContext = { params: Promise.resolve({ id: campaignId }) }
  const response = await getCampaignClans(new Request('http://localhost'), campaignContext)
  expect(response.status).toBe(200)
  expect(response.headers.get('cache-control')).toBe('private, no-store')
  const body = await response.json()
  expect(body.clans).toHaveLength(1)
  expect(body.clans[0]).toMatchObject({ code: 'MINISTRY', baneRule: { sourceId: 'CLAN-MINISTRY' } })
  expect(body.clans[0]).not.toHaveProperty('guidance')
  mocks.session.mockResolvedValue({ user: { sub: 'player' } })
  expect((await getCampaignClans(new Request('http://localhost'), campaignContext)).status).toBe(403)
  mocks.session.mockResolvedValue(null)
  expect((await getCampaignClans(new Request('http://localhost'), campaignContext)).status).toBe(401)
  mocks.session.mockResolvedValue({ user: { sub: 'narrator' } })
  mocks.access.mockResolvedValue({ ...fixture, campaignId: 'other' })
  expect(await (await getCampaignClans(new Request('http://localhost'), campaignContext)).json()).toEqual({ clans: [] })
})

it('retorna erros genéricos na API sem expor detalhes do banco', async () => {
  mocks.run.mockRejectedValue(new Error('database-password-secret'))
  const response = await PATCH(request({ active: [], expectedRevision: 0, key }), context)
  expect(response.status).toBe(500)
  expect(await response.text()).not.toContain('database-password-secret')
})
