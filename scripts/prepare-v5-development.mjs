import nextEnvironment from '@next/env'
import process from 'node:process'
import console from 'node:console'
import { devCreateCampaign, devCreateCharacter, devGetCampaignsForMaster } from '../lib/dev-db.ts'

nextEnvironment.loadEnvConfig(process.cwd(), true, { info() {}, error() {} })
if (process.env.NODE_ENV === 'production' || process.env.DATABASE_URL) throw new Error('Preparação restrita ao banco descartável em memória, sem conexão externa.')

globalThis.__devDb = undefined
devGetCampaignsForMaster('dev|local')
const createCampaign = (masterId, name) => devCreateCampaign(masterId, { name, theme: null, principios: null, averageXp: 0, status: 'Ativa', lastSessionAt: null })
const campaignA = createCampaign('test|narrator-a', 'Mesa de testes A')
const campaignB = createCampaign('test|narrator-b', 'Mesa de testes B')
for (const fixture of [
  { name: 'Jogador A', owner: 'test|player-a', campaignId: campaignA.id, condition: 'ACTIVE', hunger: 1 },
  { name: 'Jogador B', owner: 'test|player-b', campaignId: campaignB.id, condition: 'ACTIVE', hunger: 1 },
  { name: 'Independente', owner: 'test|player-a', campaignId: null, condition: 'ACTIVE', hunger: 1 },
  { name: 'Fome máxima', owner: 'test|player-a', campaignId: campaignA.id, condition: 'ACTIVE', hunger: 5 },
  { name: 'Estaqueado', owner: 'test|player-a', campaignId: campaignA.id, condition: 'STAKED', hunger: 3 },
  { name: 'Torpor', owner: 'test|player-a', campaignId: campaignA.id, condition: 'TORPOR', hunger: 5 },
]) {
  const character = devCreateCharacter(fixture.owner, { name: fixture.name, campaignId: fixture.campaignId, data: { characterType: 'PLAYER_VAMPIRE', vigor: 3, determinacao: 2, compostura: 2, fome: fixture.hunger } })
  character.gameState = { hunger: fixture.hunger, condition: fixture.condition }
}

const store = globalThis.__devDb
if (!store || !store.characters.every(character => !character.campaignId || store.campaigns.some(campaign => campaign.id === character.campaignId))) throw new Error('Falha de integridade das fichas/campanhas.')
if (!store.possessions.every(item => store.characters.some(character => character.id === item.characterId))) throw new Error('Falha de integridade dos itens.')
console.log(JSON.stringify({ environment: 'test-memory', reset: 'once-this-process', schema: 'current-in-memory-provider', characters: store.characters.length, campaigns: store.campaigns.length, integrity: 'ok', externalDatabaseModified: false, runningServerModified: false }))
