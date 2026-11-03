import { randomUUID } from 'node:crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { sql } from 'drizzle-orm'
import { db, ensureAllTables } from '@/lib/db'
import { createTestCharacter, preparePostgresTest } from './postgres-test-helpers'
import { getCharacterDisciplineRolls, rollCharacterDiscipline } from '@/lib/character-discipline-rolls'

describe('SG-010: poderes adquiridos e cálculo autoritativo',()=>{
 beforeEach(async()=>{preparePostgresTest();await ensureAllTables()})
 it('permite poder catalogado adquirido e preserva dados/Fome/idempotência',async()=>{
   const data={fome:2,humanidade:7,vigor:2,determinacao:3,compostura:2,geracao:13,'potencia-de-sangue':1,disciplinas:[{id:'discipline:ANIMALISM',disciplineId:'ANIMALISM',name:'Animalism',level:1,powers:[{name:'Sense the Beast'}]}]}
   const char=await createTestCharacter('disc-player',null,'Usuária de Animalism',data)
   await db.execute(sql`UPDATE characters SET status='APPROVED',character_type='PLAYER_VAMPIRE',game_state='{"hunger":2,"humanity":7,"condition":"ACTIVE"}'::jsonb WHERE id=${char.id}::uuid`)
   const listed=await getCharacterDisciplineRolls('disc-player',char.id)
   const power=listed.powers.find(p=>p.name==='Sense the Beast')
   expect(power).toMatchObject({disciplineId:'ANIMALISM',executable:true,dicePool:'Resolve + Animalism'})
   const provider={rollD10:vi.fn(()=>[6,6,6,6])}
   const input={powerId:power!.id,difficulty:2,expectedRevision:0,idempotencyKey:randomUUID()}
   const first=await rollCharacterDiscipline('disc-player',char.id,input,provider)
   expect(first).toMatchObject({ok:true,pool:4,hungerAfter:2,result:{successes:4}})
   expect(await rollCharacterDiscipline('disc-player',char.id,input,provider)).toEqual(first)
   expect(provider.rollD10).toHaveBeenCalledTimes(1)
   await expect(rollCharacterDiscipline('other',char.id,{...input,idempotencyKey:randomUUID(),expectedRevision:1},provider)).rejects.toMatchObject({status:403})
   await expect(rollCharacterDiscipline('disc-player',char.id,{...input,powerId:'FAKE',idempotencyKey:randomUUID(),expectedRevision:1},provider)).rejects.toMatchObject({status:422})
 })
})
