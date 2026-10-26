import { beforeEach, describe, expect, it, vi } from 'vitest'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { getCommandCharacter } from '@/lib/character-commands'
import { createTestCampaign, createTestCharacter, preparePostgresTest } from './postgres-test-helpers'

const session = vi.hoisted(() => { vi.stubEnv('NODE_ENV', 'test'); return vi.fn() })
vi.mock('@/lib/auth0', () => ({ getSessionOrDev: session }))

import { updateCharacter, getCharacterById } from '@/lib/characters'
import { executeCharacterRoll } from '@/lib/character-rolls'
import { PUT } from '@/app/api/characters/route'
import { PATCH as transition } from '@/app/api/characters/[id]/status/route'
import { validateCharacter } from '@/lib/vtm-v5/validation'
import { normalizeCharacterRulesInput } from '@/lib/vtm-v5/normalize'

let id: string, campaignId: string
let context: { params: Promise<{ id: string }> }
async function ledger() { return (await db.execute(sql`SELECT id FROM character_ledger_events WHERE character_id = ${id}::uuid`)).rows }
const provider = { rollD10: vi.fn<(count: number) => number[]>() }
const roll = { attribute: 'forca', skillId: 'briga', difficulty: 1, visibility: 'PUBLIC' as const, reason: 'Teste', expectedRevision: 0, idempotencyKey: 'roll' }

function data() {
  return { characterType: 'PLAYER_VAMPIRE', creationType: 'FLEDGLING', cla: 'Toreador', geracao: 13, humanidade: 7, 'potencia-de-sangue': 1,
    forca: 4, destreza: 3, vigor: 3, carisma: 3, manipulacao: 2, compostura: 2, inteligencia: 2, raciocinio: 2, determinacao: 1,
    'habilidade-briga': 2, 'convicoes-crenca-1': 'Proteger os inocentes', 'convicoes-pilar-1': 'Helena', predador: 'Siren',
    disciplinas: [{ name: 'Presença', level: 2, powers: ['Fascínio', 'Assombro'] }, { name: 'Rapidez', level: 1, powers: ['Reflexos rápidos'] }],
    vantagens: [{ name: 'Recursos', level: 3 }, { name: 'Aliados', level: 4 }], defeitos: [{ name: 'Inimigo', level: 1 }, { name: 'Segredo sombrio', level: 1 }], masterOverride: false }
}
function request(body: unknown, method = 'PUT') {
  return new Request('http://localhost/api/characters', { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
}

describe('edição da ficha com aprovação única', () => {
  beforeEach(async () => {
    preparePostgresTest()
    campaignId = (await createTestCampaign('narrator')).id
    id = (await createTestCharacter('owner', campaignId, 'Helena', data())).id
    context = { params: Promise.resolve({ id }) }
    await db.execute(sql`UPDATE characters SET status = 'APPROVED', total_xp = 10, spent_xp = 3, game_state = '{"hunger":2,"condition":"ACTIVE"}'::jsonb WHERE id = ${id}::uuid`)
    session.mockReset()
    session.mockResolvedValue({ user: { sub: 'owner' } })
    provider.rollD10.mockReset()
    provider.rollD10.mockImplementation(count => Array(count).fill(6))
  })

  it('mudar mecânica mantém aprovação e permite rolar sem nova revisão', async () => {
    const previous = await getCharacterById(id, 'owner')
    expect(previous).toMatchObject({ status: 'APPROVED', revision: 0 })
    await updateCharacter(id, 'owner', { data: { forca: 3, destreza: 4 }, expectedRevision: 0 })
    expect(await getCommandCharacter(id)).toMatchObject({ status: 'APPROVED', revision: 1, data: { forca: 3, destreza: 4 } })
    expect(await executeCharacterRoll('owner', id, { ...roll, expectedRevision: 1 }, provider)).toMatchObject({ pool: 5 })
    expect((await transition(request({ status: 'PENDING_REVIEW', expectedRevision: 2 }, 'PATCH'), context)).status).toBe(409)
  })

  it('status APPROVED manual não permite rolar ficha com relatório inválido', async () => {
    const invalid = { ...data(), carisma: 0 }
    await db.execute(sql`UPDATE characters SET data = ${JSON.stringify(invalid)}::jsonb, validation_report = ${JSON.stringify(validateCharacter(normalizeCharacterRulesInput(invalid)))}::jsonb WHERE id = ${id}::uuid`)
    await expect(executeCharacterRoll('owner', id, roll, provider)).rejects.toMatchObject({ status: 422 })
    expect(provider.rollD10).not.toHaveBeenCalled()
    expect((await ledger())).toHaveLength(0)
  })

  it('API exige revisão e rejeita snapshot antigo sem desfazer edição concorrente', async () => {
    expect((await PUT(request({ id, name: 'Novo nome' }))).status).toBe(409)
    await updateCharacter(id, 'owner', { data: { forca: 3, destreza: 4 }, expectedRevision: 0 })
    expect((await PUT(request({ id, data: { forca: 4, destreza: 3 }, expectedRevision: 0 }))).status).toBe(409)
    session.mockResolvedValue({ user: { sub: 'narrator' } })
    expect((await transition(request({ status: 'APPROVED', expectedRevision: 0 }, 'PATCH'), context)).status).toBe(409)
    expect(await getCommandCharacter(id)).toMatchObject({ status: 'APPROVED', revision: 1, data: { forca: 3, destreza: 4 } })
    expect((await ledger())).toHaveLength(1)
  })

  it('edição geral não aceita XP, predador, overrides ou aprovação forjados', async () => {
    const result = await PUT(request({ id, expectedRevision: 0, status: 'APPROVED', totalXp: 999, spentXp: 0, data: { notas: 'Pessoais', 'experiencia-total': 999, 'experiencia-gasta': 0, totalXp: 999, spentXp: 0, masterOverride: true, predador: 'Blood Leech', predatorTypeCode: 'BLOOD_LEECH', predatorTypeOverrides: [{ ruleCode: 'IGNORE' }], predatorTypeSelection: { code: 'BLOOD_LEECH' } } }))
    expect(result.status).toBe(200)
    expect((await getCommandCharacter(id))!).toMatchObject({ totalXp: 10, spentXp: 3, status: 'APPROVED', data: { predador: 'Siren', masterOverride: false, notas: 'Pessoais' } })
    expect((await getCommandCharacter(id))!.data).not.toHaveProperty('predatorTypeOverrides')
    expect((await getCommandCharacter(id))!.data).not.toHaveProperty('totalXp')
    expect((await getCommandCharacter(id))!.data).not.toHaveProperty('experiencia-total')
  })

  it.each(['ARCHIVED', 'DISABLED'])('ficha %s não é editada nem reativada pela edição', async status => {
    await db.execute(sql`UPDATE characters SET status = ${status} WHERE id = ${id}::uuid`)
    const before = await getCommandCharacter(id)
    await expect(updateCharacter(id, 'owner', { data: { forca: 3 }, expectedRevision: 0 })).rejects.toMatchObject({ status: 409 })
    expect((await PUT(request({ id, name: 'Nome forjado', expectedRevision: 0 }))).status).toBe(409)
    expect((await getCommandCharacter(id))!).toEqual(before)
    expect((await ledger())).toHaveLength(0)
  })

  it('terceiro não edita ficha nem eleva personagem alterando status no JSON', async () => {
    session.mockResolvedValue({ user: { sub: 'other' } })
    expect((await PUT(request({ id, expectedRevision: 0, status: 'APPROVED', data: { forca: 5 } }))).status).toBe(403)
    expect((await getCommandCharacter(id))!).toMatchObject({ revision: 0, data: { forca: 4 } })
  })
})
