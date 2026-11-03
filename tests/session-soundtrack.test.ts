import { randomUUID } from 'node:crypto'
import { beforeEach, describe, expect, it } from 'vitest'
import { sql } from 'drizzle-orm'
import { db, ensureAllTables } from '@/lib/db'
import { createTestCampaign, createTestCharacter, preparePostgresTest } from './postgres-test-helpers'
import { startGameSession } from '@/lib/game-sessions'
import { getSessionSoundtrack, updateSessionSoundtrack } from '@/lib/session-soundtrack'

describe('trilha sonora de sessão, autorização e idempotência',()=>{
 beforeEach(async()=>{preparePostgresTest();await ensureAllTables()})
 it('somente o Narrador controla; jogador acompanha sem poder escrever',async()=>{
   const camp=await createTestCampaign('master-audio')
   const char=await createTestCharacter('player-audio',camp.id,'Jogador')
   await db.execute(sql`UPDATE characters SET status='APPROVED',character_type='PLAYER_VAMPIRE' WHERE id=${char.id}::uuid`)
   const session=await startGameSession('master-audio',camp.id,{idempotencyKey:randomUUID()})
   expect((await getSessionSoundtrack('player-audio',session.id)).playing).toBe(false)
   const cmd={mood:'NOIR' as const,playing:true,expectedRevision:0,idempotencyKey:randomUUID()}
   await expect(updateSessionSoundtrack('player-audio',session.id,cmd)).rejects.toMatchObject({status:403})
   const first=await updateSessionSoundtrack('master-audio',session.id,cmd)
   const replay=await updateSessionSoundtrack('master-audio',session.id,cmd)
   expect(first).toEqual(replay)
   expect(first).toMatchObject({mood:'NOIR',playing:true,revision:1})
   expect((await getSessionSoundtrack('player-audio',session.id))).toMatchObject({mood:'NOIR',playing:true,canManage:false})
   await expect(updateSessionSoundtrack('master-audio',session.id,{...cmd,idempotencyKey:randomUUID()})).rejects.toMatchObject({status:409})
   await expect(getSessionSoundtrack('intruder',session.id)).rejects.toMatchObject({status:403})
 })
})
