import { expect,it } from 'vitest'
import { validateNpc,threatReference,npcPool,npcWarnings,NPC_TEMPLATES } from '@/lib/npc-domain'
const simple={name:'Oposição',sheetType:'SIMPLE',creatureType:'MORTAL',role:'RIVAL',threatLevel:4}
it('calibra ameaça como regra personalizada e não como dificuldade universal',()=>{
  const npc=validateNpc(simple)
  expect(threatReference(4)).toMatchObject({referencePool:8,averageSuccesses:4,customRule:true})
  expect(npcPool(npc,'social').pool).toBe(8)
  expect(npc.generalDifficulty).toBeNull()
})
it('Police Detective substitui Mental 4 por Investigation 6, sem somar os pools',()=>{
  const data=NPC_TEMPLATES[0].data
  expect(npcPool(data,'mental','investigacao')).toEqual({pool:6,origin:'Investigação'})
  expect(npcPool(data,'mental').pool).toBe(4)
  expect(NPC_TEMPLATES.filter(t=>t.official)).toHaveLength(1)
})
it.each([0,8,2.5,null])('rejeita ameaça inválida %s',threatLevel=>expect(()=>validateNpc({...simple,threatLevel})).toThrow())
it('rejeita intermediária sem pools/recursos, pools negativos e duplicados',()=>{
  expect(()=>validateNpc({...simple,sheetType:'INTERMEDIATE'})).toThrow()
  expect(()=>validateNpc({...simple,customPool:-1})).toThrow()
  expect(()=>validateNpc({...simple,exceptionalPools:[{id:'1',customName:'Rede',dicePool:4},{id:'2',customName:'réde',dicePool:5}]})).toThrow()
})
it('aceita pool personalizado acima da referência com alerta não bloqueante',()=>{
  const data=validateNpc({...simple,threatLevel:3,exceptionalPools:[{id:'1',skillCode:'armas-de-fogo',dicePool:9}]})
  expect(npcWarnings(data)).toHaveLength(1)
  expect(npcPool(data,'physical','1').pool).toBe(9)
})
it('não substitui atributos reais de ficha completa pela ameaça',()=>expect(()=>npcPool(validateNpc({...simple,sheetType:'FULL'}),'physical')).toThrow('atributo'))
