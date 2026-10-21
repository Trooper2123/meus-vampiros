import { characterText } from '@/lib/vtm-v5/text'
/**
 * In-memory database for local development (no DATABASE_URL required).
 * State is stored on globalThis so it survives Next.js hot-reloads.
 *
 * Activated automatically when DATABASE_URL is absent in non-production env.
 */

import { DISCIPLINE_CONTENTS } from './vtm-v5/discipline-contents'
import { CLAN_DISCIPLINES, DISCIPLINES } from './vtm-v5/disciplines'
import { DISCIPLINE_RESEARCH, SKILL_CATALOG } from './vtm-v5/research-catalog'
import { randomUUID } from 'node:crypto'
import { readSessionState } from './vtm-v5/session-state'
import type { CharacterVisibility } from './vtm-v5/types'

// ─── Types ────────────────────────────────────────────────────────────────────

export type DevCharacter = {
  id: string
  userId: string
  createdByUserId: string
  name: string
  concept: string | null
  clan: string | null
  generation: string | null
  status: string
  characterType?: string
  visibility?: string
  validationReport?: unknown
  validatedAt?: Date
  campaignId: string | null
  data: Record<string, unknown>
  spentXp: number
  totalXp: number
  revision?: number
  gameState?: Record<string, unknown>
  updatedAt: Date
  createdAt: Date
}

export type DevCampaign = {
  bloodPolicy?: import('./vtm-v5/blood-potency').BloodPolicy
  sessionStartTime?: string | null
  sessionEndTime?: string | null
  id: string
  masterUserId: string
  enabledClanCodes?: string[]
  creationPolicy?: { exceptionCodes: string[]; inviteHash: string }
  name: string
  theme: string | null
  principios: string | null
  averageXp: number | null
  status: string
  lastSessionAt: Date | null
  updatedAt: Date
  createdAt: Date
}

export type DevPossession = {
  id: string
  characterId: string
  campaignId: string | null
  label: string
  description: string | null
  origin: 'player' | 'master'
  status: 'pendente' | 'aprovado' | 'reprovado'
  masterComment: string | null
  createdAt: Date
  updatedAt: Date
}

export type DevCharacterLedgerEvent = {
  id: string
  characterId: string
  eventType: string
  origin: string
  payload: Record<string, unknown>
  createdByUserId: string
  createdAt: Date
}

// ─── Singleton store ───────────────────────────────────────────────────────────

type DevStore = {
  disciplineResearchCatalog?: typeof DISCIPLINE_RESEARCH
  skillCatalog?: typeof SKILL_CATALOG
  disciplineContents?: typeof DISCIPLINE_CONTENTS
  disciplineCatalog?: typeof DISCIPLINES
  clanDisciplines?: typeof CLAN_DISCIPLINES
  characters: DevCharacter[]
  campaigns: DevCampaign[]
  possessions: DevPossession[]
  characterLedgerEvents: DevCharacterLedgerEvent[]
}

declare global {

  var __devDb: DevStore | undefined
  var __notesMemory: { store: DevStore; notes: Map<string, { links: Array<{ targetId: string; targetType: string }>; revision: number; updatedAt: string }> } | undefined
  var __chronicleNightMemory: { store: DevStore; locks: Map<string, unknown>; nights: Array<{ actorId: string; hash: string; key: string; result: { id?: string; campaignId?: string; nightNumber?: number; inGameDate?: string; status?: string; results: Array<{ characterId: string }> } }> } | undefined
  var __characterCommandMemory: { store: DevStore; commands: Map<string, unknown> } | undefined
}

const DEV_USER_ID = 'dev|local'

function seed(): DevStore {
  const campaignId = randomUUID()
  const now = new Date()

  const campaigns: DevCampaign[] = [
    {
      id: campaignId,
      masterUserId: DEV_USER_ID,
      name: 'Sombras de Chicago',
      theme: 'Política e traição',
      principios: 'Sem mortes de inocentes. Toda a ação tem consequência.',
      averageXp: 12,
      status: 'Ativa',
      lastSessionAt: new Date('2025-07-20'),
      updatedAt: now,
      createdAt: now,
    },
  ]

  const characters: DevCharacter[] = [
    {
      id: randomUUID(),
      userId: DEV_USER_ID,
      createdByUserId: DEV_USER_ID,
      name: 'Míriam das Sombras',
      concept: 'Artista decadente',
      clan: 'Toreador',
      generation: '9ª',
      status: 'DRAFT',
      characterType: 'PLAYER_VAMPIRE',
      visibility: 'PLAYER_VISIBLE',
      campaignId,
      data: {
        conceito: 'Artista decadente',
        cla: 'Toreador',
        geracao: '9ª',
        forca: 2,
        destreza: 3,
        vigor: 2,
        carisma: 4,
        manipulacao: 3,
        compostura: 2,
        inteligencia: 3,
        raciocinio: 2,
        determinacao: 3,
        'potencia-de-sangue': 5,
        'surto-de-sangue': 'Sim',
        'quantidade-recuperada': 1,
        'bonus-de-poder': '+2',
        'rerrolagem-de-sangue': 'Sim',
        'penalidade-de-alimentacao': 'Nenhuma',
        'gravidade-da-perdicao': 4,
        humanidade: 7,
        vontade: 8,
        vitalidade: 6,
        fome: 2,
        disciplinas: [
          {
            id: 'disc-1',
            name: 'Presença',
            level: 3,
            powers: [
              { name: 'Efeito da Presença', effect: 'Atração natural', cost: '0 pontos', prerequisite: '-', amalgam: '-', duration: 'Permanente', dicePool: 'Social', opposingPool: 'Resistência', additionalNotes: '-', source: 'Manual do Jogador' },
            ],
          },
          {
            id: 'disc-2',
            name: 'Ofuscação',
            level: 2,
            powers: [
              { name: 'Manto das Sombras', effect: 'Invisibilidade', cost: '1 ponto', prerequisite: '-', amalgam: '-', duration: 'Por cena', dicePool: 'Furtividade', opposingPool: 'Percepção', additionalNotes: '-', source: 'Manual do Jogador' },
            ],
          },
        ],
        'Armas brancas': 2,
        'Armas de fogo': 1,
        'Atletismo': 2,
        Briga: 3,
        'Condução': 1,
        Furtividade: 2,
        Ladroagem: 1,
        Ofícios: 2,
        Sobrevivência: 1,
        'Empatia com animais': 1,
        Etiqueta: 3,
        Intimidação: 2,
        Liderança: 2,
        Manha: 3,
        Performance: 4,
        Persuasão: 3,
        Sagacidade: 2,
        Subterfúgio: 3,
        Ciência: 2,
        Erudição: 3,
        Finanças: 2,
        Investigação: 2,
        Medicina: 1,
        Ocultismo: 3,
        Percepção: 2,
        Política: 4,
        Tecnologia: 1,
      },
      spentXp: 8,
      totalXp: 12,
      updatedAt: now,
      createdAt: now,
    },
    {
      id: randomUUID(),
      userId: DEV_USER_ID,
      createdByUserId: DEV_USER_ID,
      name: 'Viktor Morel',
      concept: 'Advogado corrupto',
      clan: 'Ventrue',
      generation: '10ª',
      status: 'DRAFT',
      characterType: 'PLAYER_VAMPIRE',
      visibility: 'PLAYER_VISIBLE',
      campaignId: null,
      data: { conceito: 'Advogado corrupto', cla: 'Ventrue', geracao: '10ª' },
      spentXp: 0,
      totalXp: 0,
      updatedAt: new Date(now.getTime() - 86400000),
      createdAt: new Date(now.getTime() - 86400000),
    },
  ]

  const possessions: DevPossession[] = [
    {
      id: randomUUID(),
      characterId: characters[0].id,
      campaignId,
      label: 'Carro Sedan 1998',
      description: 'Veículo com vidros insulfilmados para deslocamento noturno',
      origin: 'player',
      status: 'aprovado',
      masterComment: 'Aprovado pelo narrador.',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: randomUUID(),
      characterId: characters[0].id,
      campaignId,
      label: 'Chave do Refúgio da Capela',
      description: 'Concedido pelo Regente Tremere',
      origin: 'master',
      status: 'aprovado',
      masterComment: 'Item de história concedido na sessão 1.',
      createdAt: now,
      updatedAt: now,
    },
  ]

  for (const character of characters) {
    character.revision = 0
    character.gameState = character.characterType === 'PLAYER_VAMPIRE' ? readSessionState(character.data, {}) : {}
  }
  return { characters, campaigns, possessions, characterLedgerEvents: [], disciplineContents: DISCIPLINE_CONTENTS, disciplineCatalog: DISCIPLINES, clanDisciplines: CLAN_DISCIPLINES, disciplineResearchCatalog: DISCIPLINE_RESEARCH, skillCatalog: SKILL_CATALOG }
}

export function devGetMasterResearchCatalog() {
  const store = process.env.NODE_ENV !== 'production' && !process.env.DATABASE_URL ? getStore() : global.__devDb
  return { skills: store?.skillCatalog ?? SKILL_CATALOG, disciplines: store?.disciplineCatalog ?? DISCIPLINES, entries: store?.disciplineResearchCatalog ?? DISCIPLINE_RESEARCH }
}

function getStore(): DevStore {
  if (!global.__devDb) {
    global.__devDb = seed()
  }
  return global.__devDb
}

export function devGetCharactersForCampaign(campaignId: string) {
  const { characters } = getStore()
  return characters
    .filter((c) => c.campaignId === campaignId)
    .map((c) => ({
      id: c.id,
      name: c.name,
      concept: c.concept,
      clan: c.clan,
      generation: c.generation,
      status: c.status,
      updatedAt: c.updatedAt.toISOString(),
      campaignId: c.campaignId,
      spentXp: c.spentXp ?? 0,
      totalXp: c.totalXp ?? 0,
    }))
}

export function devUpdateCharacterXp(characterId: string, totalXp: number) {
  const store = getStore()
  const character = store.characters.find((c) => c.id === characterId)
  if (!character) return null
  character.totalXp = totalXp
  character.updatedAt = new Date()
  return character
}

export function devGetCharactersForUser(userId: string) {
  const { characters, campaigns } = getStore()
  return characters
    .filter((c) => c.userId === userId)
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .map((c) => {
      const campaign = c.campaignId ? campaigns.find((camp) => camp.id === c.campaignId) : null
      return {
        id: c.id,
        characterType: c.characterType ?? 'PLAYER_VAMPIRE',
        name: c.name,
        concept: c.concept,
        clan: c.clan,
        generation: c.generation,
        status: c.status,
        updatedAt: c.updatedAt.toISOString(),
        campaignId: c.campaignId,
        campaignName: campaign?.name ?? null,
        campaignTheme: campaign?.theme ?? null,
        campaignPrincipios: campaign?.principios ?? null,
        spentXp: characterText(c.spentXp),
        totalXp: characterText(c.totalXp),
      }
    })
}

export function devGetCharacterById(id: string, userId: string) {
  const { characters, campaigns } = getStore()
  const c = characters.find((ch) => ch.id === id && ch.userId === userId)
  if (!c) return null
  const campaign = c.campaignId ? campaigns.find((camp) => camp.id === c.campaignId) : null
  const state = c.gameState ?? {}
  return {
    id: c.id,
    name: c.name,
    status: c.status,
    characterType: c.characterType ?? 'PLAYER_VAMPIRE',
    revision: c.revision ?? 0,
    data: structuredClone({ ...c.data, 'experiencia-total': c.totalXp, 'experiencia-gasta': c.spentXp, ...(state.hunger !== undefined ? { fome: state.hunger } : {}), ...(state.humanity !== undefined ? { humanidade: state.humanity } : {}), ...(state.healthCurrent !== undefined ? { vitalidade: state.healthCurrent } : {}), ...(state.willpowerCurrent !== undefined ? { vontade: state.willpowerCurrent } : {}), ...(state.healthDamage ? { healthDamage: state.healthDamage, willpowerDamage: state.willpowerDamage } : {}) }) as Record<string, unknown>,
    campaignId: c.campaignId,
    campaign: campaign
      ? { id: campaign.id, name: campaign.name, theme: campaign.theme, principios: campaign.principios, averageXp: campaign.averageXp }
      : null,
  }
}

export function devCreateCharacter(
  userId: string,
  payload: { name?: string; data?: Record<string, unknown>; campaignId?: string | null; visibility?: CharacterVisibility }
) {
  const store = getStore()
  if (payload.campaignId && !store.campaigns.some(campaign => campaign.id === payload.campaignId)) throw new Error('Campanha inexistente.')
  const now = new Date()
  const character: DevCharacter = {
    id: randomUUID(),
    userId,
    createdByUserId: userId,
    name: payload.name ?? 'Personagem sem nome',
    concept: (payload.data?.conceito as string) ?? null,
    clan: (payload.data?.cla as string) ?? null,
    generation: (payload.data?.geracao as string) ?? null,
    status: 'DRAFT',
    characterType: characterText(payload.data?.characterType ?? 'PLAYER_VAMPIRE'),
    visibility: payload.visibility ?? 'PLAYER_VISIBLE',
    campaignId: payload.campaignId ?? null,
    data: structuredClone(payload.data ?? {}),
    spentXp: 0,
    totalXp: 0,
    revision: 0,
    gameState: {},
    updatedAt: now,
    createdAt: now,
  }
  store.characters.push(character)
  return character
}

export function devUpdateCharacter(
  id: string,
  userId: string,
  payload: { name?: string; data?: Record<string, unknown>; campaignId?: string | null | undefined }
) {
  const store = getStore()
  const character = store.characters.find((c) => c.id === id && c.userId === userId)
  if (!character) return null

  if (payload.name !== undefined) character.name = payload.name
  if (payload.data !== undefined) {
    character.data = payload.data
    character.characterType = characterText(payload.data.characterType ?? character.characterType ?? 'PLAYER_VAMPIRE')
    character.concept = (payload.data.conceito as string) ?? null
    character.clan = (payload.data.cla as string) ?? null
    character.generation = (payload.data.geracao as string) ?? null
  }
  if (payload.campaignId !== undefined) character.campaignId = payload.campaignId
  character.updatedAt = new Date()
  return character
}

export function devUpdateCharacterStatus(id: string, userId: string, status: string) {
  const store = getStore()
  const character = store.characters.find((c) => c.id === id && c.userId === userId)
  if (!character) return null
  character.status = status
  character.updatedAt = new Date()
  return character
}

function removeNoteLinks(targetId: string, targetTypes: string[]) {
  if (global.__notesMemory?.store !== global.__devDb) return
  for (const note of global.__notesMemory?.notes.values() ?? []) {
    const links = note.links.filter(link => link.targetId !== targetId || !targetTypes.includes(link.targetType))
    if (links.length !== note.links.length) { note.links = links; note.revision += 1; note.updatedAt = new Date().toISOString() }
  }
}

export function devDeleteCharacter(id: string, userId: string) {
  const store = getStore()
  const index = store.characters.findIndex((c) => c.id === id && c.userId === userId)
  if (index === -1) return null
  if (global.__chronicleNightMemory?.store === store && global.__chronicleNightMemory.nights.some(night => night.result.results.some(result => result.characterId === id))) throw new Error('A ficha possui registros de despertar.')
  store.characters.splice(index, 1)
  removeNoteLinks(id, ['CHARACTER', 'NPC'])
  store.possessions = store.possessions.filter(possession => possession.characterId !== id)
  store.characterLedgerEvents = store.characterLedgerEvents.filter(event => event.characterId !== id)
  if (global.__characterCommandMemory?.store === store) {
    for (const key of global.__characterCommandMemory.commands.keys()) if (key.startsWith(`${id}:`)) global.__characterCommandMemory.commands.delete(key)
  }
  return { ok: true }
}

export function devGetCharacterAccessRecord(id: string) {
  return getStore().characters.find((character) => character.id === id) ?? null
}

export function devAppendCharacterLedgerEvent(characterId: string, eventType: string, origin: string, payload: Record<string, unknown>, createdByUserId: string) {
  const store = getStore()
  if (!store.characters.some(character => character.id === characterId)) throw new Error('Ficha inexistente.')
  const event: DevCharacterLedgerEvent = { id: randomUUID(), characterId, eventType, origin, payload: structuredClone(payload), createdByUserId, createdAt: new Date() }
  store.characterLedgerEvents.push(event)
  return event
}

// ─── Campaigns ────────────────────────────────────────────────────────────────

export function devGetCampaignsForMaster(masterUserId: string) {
  const { characters, campaigns } = getStore()
  return campaigns
    .filter((c) => c.masterUserId === masterUserId)
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .map((c) => ({
      id: c.id,
      name: c.name,
      theme: c.theme,
      principios: c.principios,
      averageXp: c.averageXp,
      status: c.status,
      lastSessionAt: c.lastSessionAt ? c.lastSessionAt.toISOString() : null,
      playerCount: characters.filter((ch) => ch.campaignId === c.id).length,
    }))
}

export function devGetCampaignById(id: string) {
  const campaign = getStore().campaigns.find((c) => c.id === id)
  if (!campaign) return null
  return {
    id: campaign.id,
    name: campaign.name,
    theme: campaign.theme,
    principios: campaign.principios,
    averageXp: campaign.averageXp,
  }
}

export function devIsUserInCampaign(campaignId: string, userId: string): boolean {
  const store = getStore()
  const campaign = store.campaigns.find(entry => entry.id === campaignId)
  return Boolean(campaign && (campaign.masterUserId === userId || store.characters.some(character => character.campaignId === campaignId && character.userId === userId)))
}

export function devCreateCampaign(
  masterUserId: string,
  input: { name: string; theme: string | null; principios: string | null; averageXp: number | null; status: string; lastSessionAt: string | null; enabledClanCodes?: string[] }
) {
  const store = getStore()
  const now = new Date()
  const campaign: DevCampaign = {
    enabledClanCodes: input.enabledClanCodes ? [...input.enabledClanCodes] : undefined,
    id: randomUUID(),
    masterUserId,
    name: input.name,
    theme: input.theme,
    principios: input.principios,
    averageXp: input.averageXp,
    status: input.status,
    lastSessionAt: input.lastSessionAt ? new Date(input.lastSessionAt) : null,
    updatedAt: now,
    createdAt: now,
  }
  store.campaigns.push(campaign)
  return {
    id: campaign.id,
    name: campaign.name,
    theme: campaign.theme,
    principios: campaign.principios,
    averageXp: campaign.averageXp,
    status: campaign.status,
    lastSessionAt: campaign.lastSessionAt ? campaign.lastSessionAt.toISOString() : null,
    playerCount: 0,
  }
}

// ─── Possessions ──────────────────────────────────────────────────────────────

export function devGetPossessionsForCharacter(characterId: string) {
  const { possessions } = getStore()
  return possessions.filter((p) => p.characterId === characterId)
}

export function devGetPossessionsForCampaign(campaignId: string) {
  const { possessions } = getStore()
  return possessions.filter((p) => p.campaignId === campaignId)
}

export function devCreatePossession(
  characterId: string,
  input: { label: string; description?: string | null; origin?: 'player' | 'master'; campaignId?: string | null }
) {
  const store = getStore()
  if (!store.characters.some(character => character.id === characterId)) throw new Error('Ficha inexistente.')
  if (input.campaignId && !store.campaigns.some(campaign => campaign.id === input.campaignId)) throw new Error('Campanha inexistente.')
  const character = store.characters.find(entry => entry.id === characterId)!
  const now = new Date()
  const possession: DevPossession = {
    id: randomUUID(),
    characterId,
    campaignId: character.campaignId ?? null,
    label: input.label,
    description: input.description ?? null,
    origin: input.origin ?? 'player',
    status: !character.campaignId || input.origin === 'master' ? 'aprovado' : 'pendente',
    masterComment: null,
    createdAt: now,
    updatedAt: now,
  }
  store.possessions.push(possession)
  return possession
}

export function devUpdatePossessionStatus(
  id: string,
  input: { status: 'pendente' | 'aprovado' | 'reprovado'; masterComment?: string | null }
) {
  const store = getStore()
  const possession = store.possessions.find((p) => p.id === id)
  if (!possession) return null
  possession.status = input.status
  if (input.masterComment !== undefined) possession.masterComment = input.masterComment
  possession.updatedAt = new Date()
  return possession
}

// ─── Campaign Event Calendar Helpers ──────────────────────────────────────────

declare global {
  var __devDbCampaignCalendar: {
    eventCalendars: Record<string, boolean>
    schedulingCalendars: Record<string, boolean>
    events: Array<{
      id: string
      campaignId: string
      title: string
      description: string | null
      eventDate: string
      eventTime: string | null
      visibility: 'master' | 'everyone'
      createdAt: string
    }>
    liveKitRooms: Record<string, {
      roomName: string
      roomUrl: string
      hostUserId: string
    }>
  } | undefined
}

function getCalendarStore() {
  if (!global.__devDbCampaignCalendar) {
    global.__devDbCampaignCalendar = {
      eventCalendars: {},
      schedulingCalendars: {},
      events: [],
      liveKitRooms: {},
    }
  }
  return global.__devDbCampaignCalendar
}

export function devGetCampaignEventCalendarStatus(campaignId: string): { enabled: boolean } | null {
  const store = getCalendarStore()
  const enabled = store.eventCalendars[campaignId]
  if (enabled === undefined) return null
  return { enabled }
}

export function devToggleCampaignEventCalendar(campaignId: string, enabled: boolean): { enabled: boolean } {
  const store = getCalendarStore()
  store.eventCalendars[campaignId] = enabled
  return { enabled }
}

export function devGetCampaignSchedulingCalendarStatus(campaignId: string): { enabled: boolean } | null {
  const store = getCalendarStore()
  const enabled = store.schedulingCalendars[campaignId]
  if (enabled === undefined) return null
  return { enabled }
}

export function devToggleCampaignSchedulingCalendar(campaignId: string, enabled: boolean): { enabled: boolean } {
  const store = getCalendarStore()
  store.schedulingCalendars[campaignId] = enabled
  return { enabled }
}

export function devCreateCampaignEvent(
  campaignId: string,
  title: string,
  description: string | null,
  eventDate: string,
  eventTime: string | null,
  visibility: 'master' | 'everyone'
): { id: string } {
  const store = getCalendarStore()
  const id = randomUUID()
  const now = new Date().toISOString()
  
  store.events.push({
    id,
    campaignId,
    title,
    description,
    eventDate,
    eventTime,
    visibility,
    createdAt: now,
  })
  
  return { id }
}

export function devGetCampaignEventsByYear(campaignId: string, year: number) {
  const store = getCalendarStore()
  return store.events
    .filter((e) => e.campaignId === campaignId)
    .filter((e) => {
      const eventYear = new Date(e.eventDate).getFullYear()
      return eventYear === year
    })
    .map((e) => ({
      id: e.id,
      campaignId: e.campaignId,
      title: e.title,
      description: e.description,
      eventDate: e.eventDate,
      eventTime: e.eventTime,
      visibility: e.visibility,
      createdAt: new Date(e.createdAt),
    }))
}

export function devUpdateCampaignEvent(
  eventId: string,
  data: Partial<{ title: string; description: string | null; eventDate: string; eventTime: string | null; visibility: 'master' | 'everyone' }>
): void {
  const store = getCalendarStore()
  const event = store.events.find((e) => e.id === eventId)
  if (!event) return

  if (data.title !== undefined) event.title = data.title
  if (data.description !== undefined) event.description = data.description
  if (data.eventDate !== undefined) event.eventDate = data.eventDate
  if (data.eventTime !== undefined) event.eventTime = data.eventTime
  if (data.visibility !== undefined) event.visibility = data.visibility
}

export function devDeleteCampaignEvent(eventId: string): void {
  const store = getCalendarStore()
  const index = store.events.findIndex((e) => e.id === eventId)
  if (index === -1) return
  store.events.splice(index, 1)
  removeNoteLinks(eventId, ['EVENT'])
}

export function devGetLiveKitRoom(campaignId: string) {
  const store = getCalendarStore()
  const room = store.liveKitRooms[campaignId]
  if (!room) return null

  const now = new Date()
  return {
    campaignId,
    roomName: room.roomName,
    roomUrl: room.roomUrl,
    hostUserId: room.hostUserId,
    createdAt: now,
    updatedAt: now,
  }
}

export function devCreateLiveKitRoom(
  campaignId: string,
  roomName: string,
  roomUrl: string,
  hostUserId: string
): void {
  const store = getCalendarStore()
  store.liveKitRooms[campaignId] = { roomName, roomUrl, hostUserId }
}
