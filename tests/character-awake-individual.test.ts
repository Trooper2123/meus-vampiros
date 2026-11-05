import { randomUUID } from 'node:crypto'
import assert from 'node:assert/strict'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { sql } from 'drizzle-orm'
import { db, ensureAllTables } from '@/lib/db'
import { preparePostgresTest, createTestCampaign, createTestCharacter } from './postgres-test-helpers'
import { executeCharacterAwake, getCharacterAwake } from '@/lib/character-awake'
import { preparePlayerAwakeNight, saveCampaignAwakeSettings } from '@/lib/campaign-awake-settings'
import { startChronicleNight } from '@/lib/chronicle-nights'
import { startGameSession } from '@/lib/game-sessions'

describe('Awake individual e política por mesa',()=>{
 beforeEach(async()=>{preparePostgresTest();await ensureAllTables()})
 async function independent(hunger=2){
   const char=await createTestCharacter('player-awake',null,'Vampira independente',{fome:hunger,humanidade:7,vigor:2,determinacao:2,compostura:2})
   await db.execute(sql`UPDATE characters SET status='APPROVED',character_type='PLAYER_VAMPIRE',game_state=${JSON.stringify({hunger,humanity:7,condition:'ACTIVE'})}::jsonb WHERE id=${char.id}::uuid`)
   return char
 }
 it('inicia noite fora do app e registra um despertar idempotente',async()=>{
   const char=await independent()
   await executeCharacterAwake('player-awake',char.id,{action:'DECLARE_EXTERNAL',expectedRevision:0,idempotencyKey:randomUUID()})
   const night=await executeCharacterAwake('player-awake',char.id,{action:'START_NIGHT',expectedRevision:1,idempotencyKey:randomUUID(),inGameDate:'2001-05-01'})
   expect(night.night).toMatchObject({origin:'EXTERNAL_TABLE',number:1})
   assert(night.night && typeof night.night === 'object' && 'id' in night.night && typeof night.night.id === 'string')
   const rollD10=vi.fn(()=>[5]);const input={action:'AWAKE' as const,nightId:night.night.id,expectedRevision:2,idempotencyKey:randomUUID()}
   const a=await executeCharacterAwake('player-awake',char.id,input,{rollD10})
   const b=await executeCharacterAwake('player-awake',char.id,input,{rollD10})
   expect(a).toEqual(b)
   expect(rollD10).toHaveBeenCalledTimes(1)
   expect(a).toMatchObject({outcome:'AWAKENED_HUNGRIER',after:{hunger:3}})
   expect((await getCharacterAwake('player-awake',char.id)).last).toMatchObject({nightId:night.night.id})
   await expect(executeCharacterAwake('player-awake',char.id,{...input,idempotencyKey:randomUUID(),expectedRevision:3},{rollD10})).rejects.toMatchObject({status:409})
   await expect(getCharacterAwake('stranger',char.id)).rejects.toMatchObject({status:403})
 })
 it('falha em Fome 5 causa torpor sem ultrapassar o teto',async()=>{
   const char=await independent(5)
   await executeCharacterAwake('player-awake',char.id,{action:'DECLARE_EXTERNAL',expectedRevision:0,idempotencyKey:randomUUID()})
   const night=await executeCharacterAwake('player-awake',char.id,{action:'START_NIGHT',expectedRevision:1,idempotencyKey:randomUUID()})
   assert(night.night && typeof night.night === 'object' && 'id' in night.night && typeof night.night.id === 'string')
   const result=await executeCharacterAwake('player-awake',char.id,{action:'AWAKE',nightId:night.night.id,expectedRevision:2,idempotencyKey:randomUUID()},{rollD10:()=>[1]})
   expect(result).toMatchObject({outcome:'TORPOR',after:{hunger:5,condition:'TORPOR',torpor:{cause:'HUNGER'}}})
 })
 it('separa modo jogador de modo forçado e congela execução na noite',async()=>{
   const camp=await createTestCampaign('master-awake','Mesa V5')
   const char=await createTestCharacter('player-awake',camp.id,'Vampira de mesa',{fome:1,humanidade:7,vigor:2,determinacao:2,compostura:2})
   await db.execute(sql`UPDATE characters SET status='APPROVED',character_type='PLAYER_VAMPIRE',game_state='{"hunger":1,"humanity":7,"condition":"ACTIVE"}'::jsonb WHERE id=${char.id}::uuid`)
   await saveCampaignAwakeSettings('master-awake',camp.id,'PLAYER_ROLLS')
   await expect(startChronicleNight('master-awake',camp.id,{inGameDate:'2001-06-01',characterIds:[char.id],idempotencyKey:randomUUID(),confirmed:true})).rejects.toMatchObject({status:409})
   const night=await preparePlayerAwakeNight('master-awake',camp.id,'2001-06-01',randomUUID())
   const session=await startGameSession('master-awake',camp.id,{idempotencyKey:randomUUID(),chronicleNightIds:[night.id]})
   await saveCampaignAwakeSettings('master-awake',camp.id,'NARRATOR_FORCES')
   const result=await executeCharacterAwake('player-awake',char.id,{action:'AWAKE',nightId:night.id,sessionId:session.id,expectedRevision:0,idempotencyKey:randomUUID()},{rollD10:()=>[6]})
   expect(result).toMatchObject({outcome:'AWAKENED',after:{hunger:1}})
   await expect(executeCharacterAwake('player-awake',char.id,{action:'AWAKE',nightId:night.id,sessionId:session.id,expectedRevision:1,idempotencyKey:randomUUID()},{rollD10:()=>[5]})).rejects.toMatchObject({status:409})
   await expect(executeCharacterAwake('master-awake',char.id,{action:'AWAKE',nightId:night.id,sessionId:session.id,expectedRevision:1,idempotencyKey:randomUUID()})).rejects.toMatchObject({status:403})
 })
})
