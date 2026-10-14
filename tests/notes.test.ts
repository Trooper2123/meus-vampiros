import { beforeEach, describe, expect, it, vi } from 'vitest'
import { randomUUID } from 'node:crypto'

const session = vi.hoisted(() => { vi.stubEnv('DATABASE_URL', undefined); vi.stubEnv('NODE_ENV', 'test'); return vi.fn() })
vi.mock('@/lib/auth0', () => ({ getSessionOrDev: session }))
import { devCreateCampaign, devCreateCharacter, devCreateCampaignEvent, devDeleteCampaignEvent } from '@/lib/dev-db'
import { isUserInCampaign } from '@/lib/availability'
import { createNote, deleteNote, getNote, listNotes, notesContext, updateNote } from '@/lib/notes'
import { GET, POST } from '@/app/api/notes/route'
import { GET as read, PATCH, DELETE } from '@/app/api/notes/[id]/route'
import { GET as backlinks } from '@/app/api/notes/links/route'
import { duplicateCharacter } from '@/lib/characters'

let campaignId: string
let otherCampaignId: string
let characterId: string
let npcId: string
let eventId: string
let sessionId: string
const draft = (fields = {}) => ({ title: 'Segredo', body: '<script>texto</script>', idempotencyKey: randomUUID(), ...fields })
const request = (body?: unknown, method = 'POST', headers: Record<string, string> = {}) => new Request('http://localhost/api/notes', { method, headers: { 'Content-Type': 'application/json', ...headers }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })

describe('notas P2 em memória e APIs', () => {
  beforeEach(() => {
    global.__devDb = undefined
    global.__devDbCampaignCalendar = undefined
    campaignId = devCreateCampaign('narrator', { name: 'Mesa A', theme: null, principios: null, averageXp: 0, status: 'Ativa', lastSessionAt: null }).id
    otherCampaignId = devCreateCampaign('other-narrator', { name: 'Mesa B', theme: null, principios: null, averageXp: 0, status: 'Ativa', lastSessionAt: null }).id
    characterId = devCreateCharacter('player', { campaignId, name: 'Jogador', data: { characterType: 'PLAYER_VAMPIRE' } }).id
    devCreateCharacter('recipient', { campaignId, name: 'Outro', data: {} })
    const npc = devCreateCharacter('narrator', { campaignId, name: 'NPC secreto', data: { characterType: 'HUMAN_NPC' } })
    npc.visibility = 'ST_ONLY'
    npcId = npc.id
    eventId = devCreateCampaignEvent(campaignId, 'Evento público', null, '2026-10-13', null, 'everyone').id
    sessionId = randomUUID()
    global.__chronicleNightMemory = { store: global.__devDb, locks: new Map(), nights: [{ actorId: 'narrator', key: 'fixture', hash: 'fixture', result: { id: sessionId, campaignId, nightNumber: 1, inGameDate: '2026-10-13', status: 'ACTIVE', results: [] } }] }
    session.mockResolvedValue({ user: { sub: 'player' } })
  })

  it('corrige participação de dev sem depender de possuir notas', async () => {
    expect(await isUserInCampaign(campaignId, 'player')).toBe(true)
    expect(await isUserInCampaign(campaignId, 'narrator')).toBe(true)
    expect(await isUserInCampaign(otherCampaignId, 'player')).toBe(false)
    expect(await isUserInCampaign(randomUUID(), 'player')).toBe(false)
  })

  it('mantém privadas inclusive sem mesa, sem acesso implícito do Narrador', () => {
    const note = createNote('player', draft())
    expect(getNote('player', note.id).body).toContain('<script>')
    for (const actor of ['recipient', 'narrator', 'stranger']) {
      expect(listNotes(actor).total).toBe(0)
      expect(() => getNote(actor, note.id)).toThrow('não encontrada')
    }
    const copy = getNote('player', note.id)
    copy.title = 'mutado'
    expect(getNote('player', note.id).title).toBe('Segredo')
  })

  it('compartilha somente leitura e revoga imediatamente', () => {
    const note = createNote('player', draft({ campaignId, visibility: 'SHARED', recipientUserIds: ['recipient'] }))
    expect(getNote('recipient', note.id)).not.toHaveProperty('recipientUserIds')
    expect(() => updateNote('recipient', note.id, { title: 'forjado', expectedRevision: 0 })).toThrow('somente leitura')
    expect(() => deleteNote('recipient', note.id, 0)).toThrow('somente leitura')
    updateNote('player', note.id, { recipientUserIds: [], expectedRevision: 0 })
    expect(getNote('player', note.id).visibility).toBe('PRIVATE')
    expect(() => getNote('recipient', note.id)).toThrow('não encontrada')
  })

  it('considera saída da mesa, troca de Narrador e autoria histórica', () => {
    const shared = createNote('player', draft({ campaignId, visibility: 'SHARED', recipientUserIds: ['recipient'] }))
    global.__devDb!.characters.find(character => character.id === characterId)!.campaignId = null
    expect(() => getNote('recipient', shared.id)).toThrow('não encontrada')
    expect(updateNote('player', shared.id, { body: 'ainda pessoal', expectedRevision: 0 }).visibility).toBe('PRIVATE')
    const exclusive = createNote('narrator', draft({ campaignId, visibility: 'NARRATOR_ONLY' }))
    expect(() => getNote('player', exclusive.id)).toThrow('não encontrada')
    global.__devDb!.campaigns.find(campaign => campaign.id === campaignId)!.masterUserId = 'new-narrator'
    expect(() => getNote('narrator', exclusive.id)).toThrow('não encontrada')
    expect(getNote('new-narrator', exclusive.id).canEdit).toBe(true)
    expect(() => updateNote('new-narrator', exclusive.id, { visibility: 'SHARED', expectedRevision: 0 })).toThrow('categoria')
  })

  it('rejeita grants de outra mesa, duplicatas, campos forjados e limites', () => {
    expect(() => createNote('player', draft({ campaignId, visibility: 'SHARED', recipientUserIds: ['other-narrator'] }))).toThrow('participantes')
    expect(() => createNote('player', draft({ campaignId: otherCampaignId }))).toThrow('pertence')
    expect(() => createNote('player', draft({ authorUserId: 'narrator' }))).toThrow('Campos')
    expect(() => createNote('player', draft({ title: 'x'.repeat(121) }))).toThrow()
    expect(() => createNote('player', draft({ body: 'x'.repeat(20001) }))).toThrow()
    expect(() => createNote('player', draft({ recipientUserIds: Array(21).fill('recipient') }))).toThrow()
    expect(listNotes('player').total).toBe(0)
  })

  it('replay não duplica, conflito/erro não altera corpo nem relações', () => {
    const input = draft()
    const note = createNote('player', input)
    expect(createNote('player', input).id).toBe(note.id)
    expect(() => createNote('player', { ...input, title: 'diferente' })).toThrow('Chave')
    updateNote('player', note.id, { body: 'novo', expectedRevision: 0 })
    expect(() => updateNote('player', note.id, { body: 'perda', expectedRevision: 0 })).toThrow('alterada')
    expect(() => updateNote('player', note.id, { body: 'perda', expectedRevision: 1, links: [{ targetType: 'NPC', targetId: npcId }] })).toThrow()
    expect(getNote('player', note.id).body).toBe('novo')
  })

  it.each(['CHARACTER', 'NPC', 'EVENT', 'SESSION'] as const)('consulta os dois sentidos de %s', targetType => {
    const targetId = { CHARACTER: characterId, NPC: npcId, EVENT: eventId, SESSION: sessionId }[targetType]
    const actor = targetType === 'NPC' ? 'narrator' : 'player'
    const link = { targetType, targetId }
    const note = createNote(actor, draft({ campaignId, links: [link] }))
    expect(getNote(actor, note.id).links).toHaveLength(1)
    expect(listNotes(actor, { link }).notes[0].id).toBe(note.id)
    expect(listNotes('recipient').total).toBe(0)
    deleteNote(actor, note.id, 0)
    expect(listNotes(actor, { link }).total).toBe(0)
  })

  it('oculta vínculos a NPC/ficha privados sem ocultar texto compartilhado', () => {
    const note = createNote('narrator', draft({ campaignId, visibility: 'SHARED', recipientUserIds: ['player'], links: [{ targetType: 'NPC', targetId: npcId }] }))
    expect(getNote('player', note.id).links).toEqual([])
    expect(notesContext('player').targets.some(link => link.targetId === npcId)).toBe(false)
    expect(() => listNotes('player', { link: { targetType: 'NPC', targetId: npcId } })).toThrow('Contexto')
    expect(() => createNote('narrator', draft({ campaignId, links: [{ targetType: 'NPC', targetId: npcId }, { targetType: 'CHARACTER', targetId: npcId }] }))).toThrow()
  })

  it('atribui mesa uma vez e exige revalidar vínculos independentes', () => {
    const independent = devCreateCharacter('player', { name: 'Independente', data: {} })
    const note = createNote('player', draft({ links: [{ targetType: 'CHARACTER', targetId: independent.id }] }))
    expect(() => updateNote('player', note.id, { campaignId, expectedRevision: 0 })).toThrow('Vínculo')
    updateNote('player', note.id, { campaignId, links: [], expectedRevision: 0 })
    expect(() => updateNote('player', note.id, { campaignId: otherCampaignId, expectedRevision: 1 })).toThrow('alterada')
  })

  it('filtra antes de paginação e não copia notas ao duplicar ficha', async () => {
    createNote('narrator', draft({ campaignId, visibility: 'NARRATOR_ONLY' }))
    createNote('player', draft({ campaignId, links: [{ targetType: 'CHARACTER', targetId: characterId }] }))
    expect(listNotes('player', { pageSize: 1 }).total).toBe(1)
    const copy = await duplicateCharacter(characterId, 'player')
    expect(listNotes('player', { link: { targetType: 'CHARACTER', targetId: copy!.id } }).total).toBe(0)
  })

  it('API cobre autenticação, CSRF, no-store, leitura opaca e revisão', async () => {
    session.mockResolvedValue(null)
    expect((await GET(request(undefined, 'GET'))).status).toBe(401)
    expect((await POST(request(draft()))).status).toBe(401)
    session.mockResolvedValue({ user: { sub: 'player' } })
    expect((await POST(request(draft(), 'POST', { origin: 'https://evil.example' }))).status).toBe(403)
    const created = await POST(request(draft()))
    expect(created.status).toBe(201)
    expect(created.headers.get('cache-control')).toContain('no-store')
    const note = await created.json()
    const context = { params: Promise.resolve({ id: note.id }) }
    session.mockResolvedValue({ user: { sub: 'recipient' } })
    expect((await read(request(undefined, 'GET'), context)).status).toBe(404)
    session.mockResolvedValue({ user: { sub: 'player' } })
    expect((await PATCH(request({ body: 'novo', expectedRevision: 0 }, 'PATCH'), context)).status).toBe(200)
    expect((await DELETE(request({ expectedRevision: 0 }, 'DELETE'), context)).status).toBe(409)
    expect((await DELETE(request({ expectedRevision: 1 }, 'DELETE'), context)).status).toBe(200)
    expect((await backlinks(new Request(`http://localhost/api/notes/links?targetType=NPC&targetId=${npcId}`))).status).toBe(404)
  })

  it('não habilita fallback de memória em produção/SQL', () => {
    vi.stubEnv('DATABASE_URL', 'postgres://blocked')
    expect(() => listNotes('player')).toThrow('não está disponível')
    vi.stubEnv('DATABASE_URL', undefined)
  })

  it('rejeita corpo grande, JSON inválido, campos indevidos e paginação abusiva', async () => {
    expect((await POST(request(draft({ body: 'x'.repeat(100001) })))).status).toBe(413)
    expect((await POST(new Request('http://localhost/api/notes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{invalid' }))).status).toBe(400)
    expect((await GET(new Request('http://localhost/api/notes?pageSize=1000'))).status).toBe(400)
    expect((await POST(request(draft({ authorUserId: 'narrator' })))).status).toBe(400)
    expect(listNotes('player').total).toBe(0)
  })

  it('remove relações ao excluir evento sem apagar texto da nota', () => {
    const note = createNote('player', draft({ campaignId, links: [{ targetType: 'EVENT', targetId: eventId }] }))
    devDeleteCampaignEvent(eventId)
    expect(getNote('player', note.id)).toMatchObject({ title: 'Segredo', links: [], revision: 1 })
    expect(global.__notesMemory!.notes.get(note.id)!.links).toEqual([])
  })
})
