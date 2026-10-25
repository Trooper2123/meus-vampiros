import { beforeEach, expect, it, vi } from 'vitest'
import { randomUUID } from 'node:crypto'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { preparePostgresTest, createTestCampaign, createTestCharacter } from './postgres-test-helpers'
import { updateCharacter, getCharacterForViewer } from '@/lib/characters'
import { getCommandCharacter } from '@/lib/character-commands'
import { applyPredatorEffects } from '@/lib/predator-effects'
import { validateDisciplineAllocation } from '@/lib/discipline-allocation'
import { PREDATOR_TYPE_BY_CODE, toPlayerPredatorTypeDto, validatePredatorChoices } from '@/lib/vtm-v5/predator-types'
import { manualSkillValues, projectCreationGrants } from '@/lib/vtm-v5/creation-grants'
import { normalizeCharacterRulesInput } from '@/lib/vtm-v5/normalize'
import { matchesDistribution } from '@/lib/vtm-v5/creation-guidance'
import { SKILL_DISTRIBUTIONS } from '@/lib/vtm-v5/presets'
import { SPECIALTY_SKILL_NAMES } from '@/lib/vtm-v5/skills'
import { dots } from '@/components/character-form/dot-track'
import { disciplineDefinition } from '@/lib/vtm-v5/disciplines'

const auth = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth0', () => ({ getSessionOrDev: auth }))
import { GET, PUT } from '@/app/api/characters/route'
import { PATCH } from '@/app/api/characters/[id]/status/route'

let owner: string, master: string, other: string, id: string
beforeEach(async () => {
  preparePostgresTest()
  owner = `owner-${randomUUID()}`; master = `master-${randomUUID()}`; other = `other-${randomUUID()}`
  const campaign = await createTestCampaign(master)
  id = (await createTestCharacter(owner, campaign.id, 'Malkavian', { cla: 'Malkavian', 'habilidade-briga': 2 })).id
  auth.mockResolvedValue({ user: { sub: owner } })
})
const request = (data: object) => new Request('http://localhost/api/characters', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id, expectedRevision: 0, data }) })

it.each(['Presence', 'Oblivion'])('Confidant concede %s a Malkavian sem consumir pontos do clã', async discipline => {
  const definition = PREDATOR_TYPE_BY_CODE.get('CONFIDANT')!
  expect(toPlayerPredatorTypeDto(definition).disciplineOptions).toContain(discipline)
  expect(validatePredatorChoices(definition, definition.specialtyOptions[0], discipline, [])).toEqual([])
  const character = (await getCommandCharacter(id))!
  character.data.predatorTypeSelection = { code: 'CONFIDANT', specialty: definition.specialtyOptions[0], discipline, optionCodes: [] }
  applyPredatorEffects(character)
  expect(() => validateDisciplineAllocation(character)).not.toThrow()
  expect(character.data.disciplinas).toEqual([expect.objectContaining({ level: 1 })])
})
it('concessão de habilidade não consome a distribuição base nem muda seu total', async () => {
  const character = (await getCommandCharacter(id))!
  const definition = PREDATOR_TYPE_BY_CODE.get('CONFIDANT')!
  const skills = Object.keys(SPECIALTY_SKILL_NAMES).filter(id => id !== 'sagacidade')
  character.data = { ...character.data, skillMode: 'BALANCED', ...Object.fromEntries(skills.map((skill, index) => [`habilidade-${skill}`, SKILL_DISTRIBUTIONS.BALANCED[index] ?? 0])), 'habilidade-sagacidade': 0, predatorTypeSelection: { code: 'CONFIDANT', specialty: definition.specialtyOptions[0], discipline: 'Presence', optionCodes: [] } }
  applyPredatorEffects(character)
  const grants = projectCreationGrants(character.gameState)
  const normalized = normalizeCharacterRulesInput(character.data, grants)
  expect(character.data['habilidade-sagacidade']).toBe(1)
  expect(normalized.skills.sagacidade).toBe(0)
  expect(matchesDistribution(Object.values(normalized.skills), SKILL_DISTRIBUTIONS.BALANCED)).toBe(true)
  expect(manualSkillValues({ Sagacidade: 1 }, grants)).toEqual({ Sagacidade: 0 })
})
it('dono reduz até zero no rascunho inicial', async () => {
  expect((await PUT(request({ 'habilidade-Briga': 0 }))).status).toBe(200)
  expect((await getCommandCharacter(id))?.data['habilidade-briga']).toBe(0)
})
it('controle de pontos permite zerar clicando no valor atual', () => {
  const onChange = vi.fn()
  const control = dots(5, 1, onChange, 'habilidade-briga', true)
  control.props.children[1][0].props.onClick()
  expect(onChange).toHaveBeenCalledWith(0)
})
it('envia para revisão sem contar a concessão de predação na distribuição base', async () => {
  const character = (await getCommandCharacter(id))!
  const skills = Object.keys(SPECIALTY_SKILL_NAMES).filter(id => id !== 'sagacidade')
  character.data = {
    ...character.data, characterType: 'PLAYER_VAMPIRE', creationType: 'FLEDGLING', skillMode: 'BALANCED', geracao: 13, humanidade: 7, 'potencia-de-sangue': 1,
    forca: 4, destreza: 3, vigor: 3, carisma: 3, manipulacao: 2, compostura: 2, inteligencia: 2, raciocinio: 2, determinacao: 1,
    'convicoes-crenca-1': 'Proteger', 'convicoes-pilar-1': 'Pessoa',
    ...Object.fromEntries(skills.map((skill, index) => [`habilidade-${skill}`, SKILL_DISTRIBUTIONS.BALANCED[index] ?? 0])), 'habilidade-sagacidade': 0,
    disciplinas: [{ id: 'auspex', name: 'Auspícios', level: 2, powers: ['Sentidos aguçados', 'Premonição'] }, { id: 'dominate', name: 'Dominação', level: 1, powers: ['Compelir'] }],
    predatorTypeSelection: { code: 'CONFIDANT', specialty: 'Sagacidade (Empatia)', discipline: 'Presence', optionCodes: [] },
    vantagens: [], defeitos: [],
  }
  applyPredatorEffects(character)
  const disciplines = character.data.disciplinas as { name: string; powers: string[] }[]
  disciplines.find(row => disciplineDefinition(row.name)?.id === 'PRESENCE')!.powers = ['Fascínio']
  await db.execute(sql`UPDATE characters SET data=${JSON.stringify(character.data)}::jsonb,game_state=${JSON.stringify(character.gameState)}::jsonb WHERE id=${id}::uuid`)
  const response = await PATCH(new Request('http://localhost', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'PENDING_REVIEW', expectedRevision: 0 }) }), { params: Promise.resolve({ id }) })
  const result = await response.json()
  expect(result.report?.errors ?? result).toEqual([])
  expect(response.status).toBe(200)
  expect((await getCommandCharacter(id))?.gameState.skillDistributionFinalized).toBe(true)
  auth.mockResolvedValue({ user: { sub: master } })
  const approval = { status: 'APPROVED', expectedRevision: 1, idempotencyKey: randomUUID() }
  const approve = () => PATCH(new Request('http://localhost', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(approval) }), { params: Promise.resolve({ id }) })
  const approved = await approve()
  expect(approved.status).toBe(200)
  const approvedBody = await approved.json()
  expect(approvedBody).toMatchObject({ status: 'APPROVED', revision: 2 })
  expect(await (await approve()).json()).toEqual(approvedBody)
})
it('ficha finalizada bloqueia redução pelo dono e permite ao mestre atual', async () => {
  await db.execute(sql`UPDATE characters SET status='APPROVED' WHERE id=${id}::uuid`)
  expect((await PUT(request({ 'habilidade-briga': 1 }))).status).toBe(403)
  auth.mockResolvedValue({ user: { sub: master } })
  expect((await GET(new Request(`http://localhost/api/characters?id=${id}`))).status).toBe(200)
  expect((await PUT(request({ 'habilidade-briga': 0 }))).status).toBe(200)
  expect((await getCommandCharacter(id))?.data['habilidade-briga']).toBe(0)
})
it('retornar a rascunho não reabre redução e cliente não remove o bloqueio', async () => {
  await db.execute(sql`UPDATE characters SET status='APPROVED' WHERE id=${id}::uuid`)
  await updateCharacter(id, owner, { data: { forca: 2 }, expectedRevision: 0 })
  expect((await getCharacterForViewer(id, owner))?.canReduceSkills).toBe(false)
  await expect(updateCharacter(id, owner, { data: { skillDistributionFinalized: false, 'habilidade-briga': 1 }, expectedRevision: 1 })).rejects.toMatchObject({ status: 403 })
  await expect(updateCharacter(id, owner, { data: { gameState: { skillDistributionFinalized: false } }, expectedRevision: 1 })).rejects.toMatchObject({ status: 422 })
})
it('transição de status preserva bloqueio ao reabrir uma ficha já aprovada', async () => {
  await db.execute(sql`UPDATE characters SET status='APPROVED' WHERE id=${id}::uuid`)
  auth.mockResolvedValue({ user: { sub: master } })
  const response = await PATCH(new Request('http://localhost', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'DRAFT', expectedRevision: 0 }) }), { params: Promise.resolve({ id }) })
  expect(response.status).toBe(200)
  expect((await getCharacterForViewer(id, owner))?.canReduceSkills).toBe(false)
})
it('terceiros e narrador de outra mesa não leem nem reduzem habilidades', async () => {
  await createTestCampaign(other)
  auth.mockResolvedValue({ user: { sub: other } })
  expect((await GET(new Request(`http://localhost/api/characters?id=${id}`))).status).toBe(404)
  expect((await PUT(request({ 'habilidade-briga': 0 }))).status).toBe(403)
  expect(await updateCharacter(id, other, { data: { 'habilidade-briga': 0 } })).toBeNull()
  auth.mockResolvedValue(null)
  expect((await PUT(request({ 'habilidade-briga': 0 }))).status).toBe(401)
})
