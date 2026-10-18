import { beforeEach, describe, expect, it, vi } from 'vitest'
const session = vi.hoisted(() => { vi.stubEnv('NODE_ENV', 'test'); vi.stubEnv('DATABASE_URL', undefined); return vi.fn() })
vi.mock('@/lib/auth0', () => ({ getSessionOrDev: session }))
import { DISCIPLINE_CONTENTS, evaluateDisciplineContentAccess } from '@/lib/vtm-v5/discipline-contents'
import { CLAN_DISCIPLINES, DISCIPLINES } from '@/lib/vtm-v5/disciplines'
import { evaluateDisciplineAccess } from '@/lib/vtm-v5/discipline-access'
import { selectCharacterClan } from '@/lib/character-clans'
import { changeCharacterDiscipline, disciplineView } from '@/lib/character-disciplines'
import { updateCharacter, createCharacter } from '@/lib/characters'
import { getCommandCharacter } from '@/lib/character-commands'
import { GET, POST } from '@/app/api/characters/[id]/disciplines/route'
import { applyPredatorEffects } from '@/lib/predator-effects'
import { devGetCampaignsForMaster } from '@/lib/dev-db'

const id = '11111111-1111-4111-8111-111111111111'
const campaignId = '22222222-2222-4222-8222-222222222222'
const context = { params: Promise.resolve({ id }) }
const key = () => crypto.randomUUID()
const stored = () => global.__devDb!.characters[0]
const command = (overrides = {}) => ({ kind: 'PURCHASE' as const, disciplineId: 'DOMINATE', targetLevel: 1, reason: 'Aprendizado revisado', expectedRevision: stored().revision ?? 0, idempotencyKey: key(), ...overrides })
const request = (body = command()) => new Request('http://localhost/api/characters/' + id + '/disciplines', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
async function clan() { await selectCharacterClan(id, 'player', { code: 'BRUJAH', disciplineDots: { Rapidez: 2, Potência: 1 } }, 0, key()) }
async function authorize(targetLevel = 1, disciplineId = 'DOMINATE') {
  return changeCharacterDiscipline('narrator', id, command({ kind: 'AUTHORIZE', disciplineId, targetLevel, acquisitionSource: 'XP', requirement: 'LEARNING_APPROVAL' }))
}
beforeEach(() => {
  const now = new Date()
  global.__devDb = { characters: [{ id, userId: 'player', createdByUserId: 'player', name: 'Helena', concept: null, clan: null, generation: null, status: 'DRAFT', characterType: 'PLAYER_VAMPIRE', campaignId, data: { humanidade: 7, 'potencia-de-sangue': 1 }, totalXp: 100, spentXp: 0, revision: 0, gameState: {}, createdAt: now, updatedAt: now }], campaigns: [{ id: campaignId, masterUserId: 'narrator', name: 'Mesa', theme: null, principios: null, averageXp: null, status: 'Ativa', lastSessionAt: null, createdAt: now, updatedAt: now }], possessions: [], characterLedgerEvents: [] }
  session.mockResolvedValue({ user: { sub: 'player' } })
})
describe('catálogo e política de Disciplinas', () => {
  it('custo de predação usa somente a escolha válida e mantém política Caitiff', () => {
    const cost = (character: Parameters<typeof evaluateDisciplineAccess>[0]['character'], disciplineId = 'DOMINATE') => evaluateDisciplineAccess({ character: { currentLevel: 1, ...character }, disciplineId, acquisitionSource: 'XP', targetLevel: 2 }).xpCost
    expect(cost({ clanCode: 'BRUJAH', predatorCode: 'CLEAVER', predatorDiscipline: 'Dominação' })).toBe(10)
    expect(cost({ clanCode: 'BRUJAH', predatorCode: 'CLEAVER', predatorDiscipline: 'Animalismo' })).toBe(14)
    expect(cost({ clanCode: 'BRUJAH', predatorCode: 'UNKNOWN', predatorDiscipline: 'Dominação' })).toBe(14)
    expect(cost({ clanCode: 'CAITIFF', predatorCode: 'CLEAVER', predatorDiscipline: 'Dominação' })).toBe(12)
    expect(cost({ clanCode: 'BRUJAH', predatorCode: 'BAGGER', predatorDiscipline: 'Feitiçaria de Sangue' }, 'BLOOD_SORCERY')).toBe(14)
  })
  it('seeds contêm a matriz integral e IDs únicos', () => {
    const previous = global.__devDb
    global.__devDb = undefined
    devGetCampaignsForMaster('dev|local')
    expect(global.__devDb!.disciplineCatalog).toEqual(DISCIPLINES)
    expect(global.__devDb!.clanDisciplines).toEqual(CLAN_DISCIPLINES)
    expect(DISCIPLINES).toHaveLength(12)
    expect(new Set(DISCIPLINES.map(row => row.id)).size).toBe(12)
    expect(CLAN_DISCIPLINES.TOREADOR).toEqual(['AUSPEX', 'CELERITY', 'PRESENCE'])
    expect(CLAN_DISCIPLINES.TZIMISCE).toEqual(['ANIMALISM', 'DOMINATE', 'PROTEAN'])
    expect(Object.values(CLAN_DISCIPLINES).flat()).toHaveLength(43)
    global.__devDb = previous
  })
  it('restringe somente os pontos iniciais, respeita predação e políticas próprias', () => {
    expect(evaluateDisciplineAccess({ character: { clanCode: 'BRUJAH' }, disciplineId: 'DOMINATE', acquisitionSource: 'CLAN', targetLevel: 1 }).eligible).toBe(false)
    expect(evaluateDisciplineAccess({ character: { clanCode: 'BRUJAH', predatorCode: 'CLEAVER', predatorDiscipline: 'Dominação' }, disciplineId: 'DOMINATE', acquisitionSource: 'PREDATOR', targetLevel: 1 }).eligible).toBe(true)
    expect(evaluateDisciplineAccess({ character: { clanCode: 'BRUJAH', predatorCode: 'CLEAVER', predatorDiscipline: 'Dominação' }, disciplineId: 'AUSPEX', acquisitionSource: 'PREDATOR', targetLevel: 1 }).eligible).toBe(false)
    expect(evaluateDisciplineAccess({ character: { clanCode: 'THIN_BLOOD' }, disciplineId: 'THIN_BLOOD_ALCHEMY', acquisitionSource: 'CLAN', targetLevel: 1 }).eligible).toBe(false)
    expect(evaluateDisciplineAccess({ character: { clanCode: 'CAITIFF', caitiffDisciplines: ['Animalismo', 'Dominação', 'Presença'] }, disciplineId: 'DOMINATE', acquisitionSource: 'CLAN', targetLevel: 1 }).eligible).toBe(true)
    expect(evaluateDisciplineAccess({ character: { clanCode: 'CAITIFF' }, disciplineId: 'DOMINATE', acquisitionSource: 'XP', targetLevel: 1 }).xpCost).toBe(6)
  })
})
describe('domínio transacional e segurança', () => {
  it('bloqueia criação, edição livre e troca com alocação incompatível', async () => {
    await expect(createCharacter('player', { campaignId, data: { cla: 'Brujah', disciplinas: [{ name: 'Dominação', level: 1 }] } })).rejects.toMatchObject({ status: 422 })
    await clan()
    await expect(updateCharacter(id, 'player', { data: { disciplinas: [{ id: 'forged', name: 'Dominação', level: 3 }] }, expectedRevision: 1 })).rejects.toMatchObject({ status: 422 })
    await expect(selectCharacterClan(id, 'player', { code: 'TOREADOR', disciplineDots: { Dominação: 2, Potência: 1 } }, 1, key())).rejects.toMatchObject({ status: 422 })
    await selectCharacterClan(id, 'player', { code: 'TOREADOR', disciplineDots: { Auspícios: 2, Presença: 1 } }, 1, key())
    expect(stored().data.disciplinas).toEqual(expect.arrayContaining([expect.objectContaining({ disciplineId: 'AUSPEX', level: 2 })]))
  })
  it('jogador e narrador de outra mesa não criam autorizações; concessão não cria nível/XP', async () => {
    await clan()
    expect(stored().data.clanSelection).toMatchObject({ disciplineDots: { CELERITY: 2, POTENCE: 1 } })
    const before = structuredClone(stored())
    for (const actor of ['player', 'other-narrator']) await expect(changeCharacterDiscipline(actor, id, command({ kind: 'AUTHORIZE', requirement: 'LEARNING_APPROVAL', acquisitionSource: 'XP' }))).rejects.toMatchObject({ status: 403 })
    await authorize()
    expect(stored().spentXp).toBe(before.spentXp)
    expect(stored().data.disciplinas).toEqual(before.data.disciplinas)
    expect(stored().gameState!.disciplineAccessGrants).toEqual([expect.objectContaining({ disciplineId: 'DOMINATE', targetLevel: 1, createdByUserId: 'narrator' })])
  })
  it('cobra custo fora do clã, mantém origens por aquisição e retry não gasta novamente', async () => {
    await clan()
    await expect(changeCharacterDiscipline('player', id, command())).rejects.toMatchObject({ status: 422 })
    await authorize()
    const purchase = command()
    const result = await changeCharacterDiscipline('player', id, purchase)
    expect(result).toMatchObject({ ok: true, availableXp: 93 })
    expect(stored().data.disciplinas).toEqual(expect.arrayContaining([expect.objectContaining({ disciplineId: 'DOMINATE', level: 1 })]))
    expect(stored().gameState!.disciplineAcquisitions).toEqual(expect.arrayContaining([expect.objectContaining({ disciplineId: 'DOMINATE', source: 'XP', targetLevel: 1, xpCost: 7 }), expect.objectContaining({ source: 'CLAN', disciplineId: 'CELERITY' })]))
    expect(await changeCharacterDiscipline('player', id, purchase)).toEqual(result)
    expect(stored().spentXp).toBe(7)
    await expect(changeCharacterDiscipline('player', id, command({ targetLevel: 2 }))).rejects.toMatchObject({ status: 422 })
    await expect(updateCharacter(id, 'player', { data: { disciplinas: (stored().data.disciplinas as { name: string }[]).filter(row => row.name !== 'Dominação') }, expectedRevision: stored().revision })).rejects.toMatchObject({ status: 422 })
  })
  it('predação fora do clã pode evoluir por XP; origem não pertence à Disciplina inteira', async () => {
    await clan()
    const candidate = (await getCommandCharacter(id))!
    candidate.data.predatorTypeSelection = { code: 'CLEAVER', specialty: 'Persuasão (Gaslighting)', discipline: 'Dominação', optionCodes: [] }
    candidate.data['habilidade-persuasao'] = 2
    applyPredatorEffects(candidate)
    stored().data = candidate.data
    stored().gameState = candidate.gameState
    await authorize(2)
    await changeCharacterDiscipline('player', id, command({ targetLevel: 2 }))
    expect(stored().spentXp).toBe(10)
    expect(stored().gameState!.disciplineAcquisitions).toEqual(expect.arrayContaining([expect.objectContaining({ disciplineId: 'DOMINATE', source: 'PREDATOR', xpCost: 0 }), expect.objectContaining({ disciplineId: 'DOMINATE', source: 'XP', xpCost: 10 })]))
  })
  it('não debita saldo insuficiente, revisão antiga ou compras concorrentes', async () => {
    await clan()
    await authorize()
    stored().totalXp = 1
    const before = structuredClone(stored())
    await expect(changeCharacterDiscipline('player', id, command())).rejects.toMatchObject({ status: 422 })
    expect(stored()).toEqual(before)
    stored().totalXp = 100
    const revision = stored().revision
    const results = await Promise.allSettled([changeCharacterDiscipline('player', id, command()), changeCharacterDiscipline('player', id, command())])
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1)
    await expect(changeCharacterDiscipline('player', id, command({ expectedRevision: revision }))).rejects.toMatchObject({ status: 409 })
    expect(stored().spentXp).toBe(7)
  })
  it('grants revogados, de outra mesa ou de antigo narrador não liberam aprendizado', async () => {
    await clan()
    await authorize()
    const grant = (stored().gameState!.disciplineAccessGrants as { id: string; revokedAt?: string }[])[0]
    await changeCharacterDiscipline('narrator', id, command({ kind: 'REVOKE', grantId: grant.id }))
    await expect(changeCharacterDiscipline('player', id, command())).rejects.toMatchObject({ status: 422 })
    ;(stored().gameState!.disciplineAccessGrants as { revokedAt?: string }[])[0].revokedAt = undefined
    global.__devDb!.campaigns[0].masterUserId = 'new-narrator'
    await expect(changeCharacterDiscipline('player', id, command())).rejects.toMatchObject({ status: 422 })
    expect(disciplineView((await getCommandCharacter(id))!, 'player').grants[0]).not.toHaveProperty('reason')
  })
  it('API exige autenticação, autorização, IDs válidos e rejeita autoridade/saldo forjados', async () => {
    session.mockResolvedValue(null)
    expect((await GET(request(), context)).status).toBe(401)
    expect((await POST(request(), context)).status).toBe(401)
    session.mockResolvedValue({ user: { sub: 'other' } })
    expect((await GET(request(), context)).status).toBe(403)
    expect((await POST(request(), context)).status).toBe(403)
    session.mockResolvedValue({ user: { sub: 'player' } })
    expect((await POST(request(command({ kind: 'AUTHORIZE', requirement: 'LEARNING_APPROVAL', acquisitionSource: 'XP' })), context)).status).toBe(403)
    expect((await POST(request({ ...command(), totalXp: 999 } as ReturnType<typeof command>), context)).status).toBe(400)
    expect((await GET(request(), { params: Promise.resolve({ id: '../../other' }) })).status).toBe(400)
    expect(global.__devDb!.characterLedgerEvents).toHaveLength(0)
  })
})


it('rituais e cerimônias têm vínculos, níveis e requisitos próprios', () => {
  expect(DISCIPLINE_CONTENTS.find(entry => entry.id === 'BLOOD_WALK')).toMatchObject({ disciplineId: 'BLOOD_SORCERY', kind: 'RITUAL', level: 1 })
  expect(evaluateDisciplineContentAccess('BLOOD_WALK', {}, []).eligible).toBe(false)
  expect(evaluateDisciplineContentAccess('BLOOD_WALK', { BLOOD_SORCERY: 1 }, []).eligible).toBe(true)
  expect(evaluateDisciplineContentAccess('SUMMON_SPIRIT', { OBLIVION: 1 }, []).eligible).toBe(false)
  expect(evaluateDisciplineContentAccess('SUMMON_SPIRIT', { OBLIVION: 1 }, ['THE_BINDING_FETTER']).eligible).toBe(true)
})
it.each([
  ['ANIMALISM', ['GANGREL', 'NOSFERATU', 'RAVNOS', 'TZIMISCE']],
  ['AUSPEX', ['HECATA', 'MALKAVIAN', 'SALUBRI', 'TOREADOR', 'TREMERE']],
  ['BLOOD_SORCERY', ['BANU_HAQIM', 'TREMERE']],
  ['CELERITY', ['BANU_HAQIM', 'BRUJAH', 'TOREADOR']],
  ['DOMINATE', ['LASOMBRA', 'MALKAVIAN', 'SALUBRI', 'TREMERE', 'TZIMISCE', 'VENTRUE']],
  ['FORTITUDE', ['GANGREL', 'HECATA', 'SALUBRI', 'VENTRUE']],
  ['OBFUSCATE', ['BANU_HAQIM', 'MALKAVIAN', 'MINISTRY', 'NOSFERATU', 'RAVNOS']],
  ['OBLIVION', ['HECATA', 'LASOMBRA']],
  ['POTENCE', ['BRUJAH', 'NOSFERATU', 'LASOMBRA']],
  ['PRESENCE', ['BRUJAH', 'RAVNOS', 'TOREADOR', 'MINISTRY', 'VENTRUE']],
  ['PROTEAN', ['GANGREL', 'MINISTRY', 'TZIMISCE']],
  ['THIN_BLOOD_ALCHEMY', ['THIN_BLOOD']],
] as const)('matriz de %s corresponde exatamente à solicitação', (disciplineId, clans) => {
  expect(Object.entries(CLAN_DISCIPLINES).filter(([, ids]) => ids.includes(disciplineId)).map(([code]) => code).sort()).toEqual([...clans].sort())
})
it('exceção de clã é específica ao requisito, nível e clã, sem dar pontos', async () => {
  await clan()
  await changeCharacterDiscipline('narrator', id, command({ kind: 'AUTHORIZE', acquisitionSource: 'CLAN', requirement: 'CLAN_ASSOCIATION', targetLevel: 1 }))
  const before = stored().spentXp
  await selectCharacterClan(id, 'player', { code: 'BRUJAH', disciplineDots: { Rapidez: 2, Dominação: 1 } }, stored().revision!, key())
  expect(stored().spentXp).toBe(before)
  expect(stored().data.disciplinas).toEqual(expect.arrayContaining([expect.objectContaining({ disciplineId: 'DOMINATE', level: 1 })]))
  await expect(selectCharacterClan(id, 'player', { code: 'TOREADOR', disciplineDots: { Rapidez: 2, Dominação: 1 } }, stored().revision!, key())).rejects.toMatchObject({ status: 422 })
})
it('bloqueia CSRF e formatos maliciosos sem criar histórico', async () => {
  const hostile = new Request('http://localhost/api/characters/' + id + '/disciplines', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://attacker.example' }, body: JSON.stringify(command()) })
  expect((await POST(hostile, context)).status).toBe(403)
  expect((await POST(request(command({ disciplineId: '__proto__', targetLevel: 99 })), context)).status).toBe(400)
  expect((await POST(request(command({ targetLevel: 1.5 })), context)).status).toBe(400)
  expect(global.__devDb!.characterLedgerEvents).toHaveLength(0)
})

it('revogar exceção de distribuição reabre revisão sem apagar níveis nem devolver XP', async () => {
  await clan()
  await changeCharacterDiscipline('narrator', id, command({ kind: 'AUTHORIZE', acquisitionSource: 'CLAN', requirement: 'CLAN_ASSOCIATION', targetLevel: 1 }))
  await selectCharacterClan(id, 'player', { code: 'BRUJAH', disciplineDots: { Rapidez: 2, Dominação: 1 } }, stored().revision!, key())
  stored().status = 'APPROVED'
  const grant = (stored().gameState!.disciplineAccessGrants as { id: string }[])[0]
  const before = structuredClone(stored().data.disciplinas)
  await changeCharacterDiscipline('narrator', id, command({ kind: 'REVOKE', grantId: grant.id }))
  expect(stored().status).toBe('DRAFT')
  expect(stored().data.disciplinas).toEqual(before)
  expect(stored().spentXp).toBe(0)
})

it('não permite reutilizar a mesma origem de predação em duas Disciplinas', async () => {
  await clan()
  const current = (await getCommandCharacter(id))!
  current.data.predatorTypeSelection = { code: 'CLEAVER', specialty: 'Persuasão (Gaslighting)', discipline: 'Dominação', optionCodes: [] }
  current.data['habilidade-persuasao'] = 2
  applyPredatorEffects(current)
  stored().data = current.data; stored().gameState = current.gameState
  const rows = structuredClone(current.data.disciplinas) as { id: string; name: string; level: number }[]
  const predatorRow = rows.find(row => row.name === 'Dominação')!
  rows.push({ id: predatorRow.id, name: 'Auspícios', level: 1 })
  const before = structuredClone(stored())
  await expect(updateCharacter(id, 'player', { data: { disciplinas: rows }, expectedRevision: stored().revision })).rejects.toMatchObject({ status: 422 })
  expect(stored()).toEqual(before)
})

it('rejeita aliases diferentes para a mesma Disciplina no pacote 2+1', async () => {
  await expect(selectCharacterClan(id, 'player', { code: 'BRUJAH', disciplineDots: { Rapidez: 2, Celerity: 1 } }, 0, key())).rejects.toMatchObject({ status: 422 })
  expect(stored().revision).toBe(0)
})
