/**
 * In-memory database for local development (no DATABASE_URL required).
 * State is stored on globalThis so it survives Next.js hot-reloads.
 *
 * Activated automatically when DATABASE_URL is absent in non-production env.
 */

import { randomUUID } from 'crypto'

// ─── Types ────────────────────────────────────────────────────────────────────

export type DevCharacter = {
  id: string
  userId: string
  name: string
  concept: string | null
  clan: string | null
  generation: string | null
  status: string
  campaignId: string | null
  data: Record<string, unknown>
  spentXp: number
  totalXp: number
  updatedAt: Date
  createdAt: Date
}

export type DevCampaign = {
  id: string
  masterUserId: string
  name: string
  theme: string | null
  principios: string | null
  averageXp: number | null
  status: string
  lastSessionAt: Date | null
  updatedAt: Date
  createdAt: Date
}

// ─── Singleton store ───────────────────────────────────────────────────────────

type DevStore = {
  characters: DevCharacter[]
  campaigns: DevCampaign[]
}

declare global {
  // eslint-disable-next-line no-var
  var __devDb: DevStore | undefined
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
      principios: 'Sem mortes de inocentes. Toda ação tem consequência.',
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
      name: 'Míriam das Sombras',
      concept: 'Artista decadente',
      clan: 'Toreador',
      generation: '9ª',
      status: 'Ativo',
      campaignId,
      data: { conceito: 'Artista decadente', cla: 'Toreador', geracao: '9ª' },
      spentXp: 8,
      totalXp: 12,
      updatedAt: now,
      createdAt: now,
    },
    {
      id: randomUUID(),
      userId: DEV_USER_ID,
      name: 'Viktor Morel',
      concept: 'Advogado corrupto',
      clan: 'Ventrue',
      generation: '10ª',
      status: 'Ativo',
      campaignId: null,
      data: { conceito: 'Advogado corrupto', cla: 'Ventrue', geracao: '10ª' },
      spentXp: 0,
      totalXp: 0,
      updatedAt: new Date(now.getTime() - 86400000),
      createdAt: new Date(now.getTime() - 86400000),
    },
  ]

  return { characters, campaigns }
}

function getStore(): DevStore {
  if (!global.__devDb) {
    global.__devDb = seed()
  }
  return global.__devDb
}

// ─── Characters ───────────────────────────────────────────────────────────────

export function devGetCharactersForUser(userId: string) {
  const { characters, campaigns } = getStore()
  return characters
    .filter((c) => c.userId === userId)
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .map((c) => {
      const campaign = c.campaignId ? campaigns.find((camp) => camp.id === c.campaignId) : null
      return {
        id: c.id,
        name: c.name,
        concept: c.concept,
        clan: c.clan,
        generation: c.generation,
        status: c.status,
        updatedAt: c.updatedAt.toISOString(),
        campaignId: c.campaignId,
        campaignName: campaign?.name ?? null,
        spentXp: String(c.spentXp),
        totalXp: String(c.totalXp),
      }
    })
}

export function devGetCharacterById(id: string, userId: string) {
  const { characters, campaigns } = getStore()
  const c = characters.find((ch) => ch.id === id && ch.userId === userId)
  if (!c) return null
  const campaign = c.campaignId ? campaigns.find((camp) => camp.id === c.campaignId) : null
  return {
    id: c.id,
    name: c.name,
    data: c.data,
    campaignId: c.campaignId,
    campaign: campaign
      ? { id: campaign.id, name: campaign.name, theme: campaign.theme, principios: campaign.principios, averageXp: campaign.averageXp }
      : null,
  }
}

export function devCreateCharacter(
  userId: string,
  payload: { name?: string; data?: Record<string, unknown>; campaignId?: string | null }
) {
  const store = getStore()
  const now = new Date()
  const character: DevCharacter = {
    id: randomUUID(),
    userId,
    name: payload.name ?? 'Personagem sem nome',
    concept: (payload.data?.conceito as string) ?? null,
    clan: (payload.data?.cla as string) ?? null,
    generation: (payload.data?.geracao as string) ?? null,
    status: 'Ativo',
    campaignId: payload.campaignId ?? null,
    data: payload.data ?? {},
    spentXp: 0,
    totalXp: 0,
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
    character.concept = (payload.data.conceito as string) ?? null
    character.clan = (payload.data.cla as string) ?? null
    character.generation = (payload.data.geracao as string) ?? null
  }
  if (payload.campaignId !== undefined) character.campaignId = payload.campaignId
  character.updatedAt = new Date()
  return character
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

export function devCreateCampaign(
  masterUserId: string,
  input: { name: string; theme: string | null; principios: string | null; averageXp: number | null; status: string; lastSessionAt: string | null }
) {
  const store = getStore()
  const now = new Date()
  const campaign: DevCampaign = {
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
