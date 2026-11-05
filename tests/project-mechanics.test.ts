import {describe,it,expect} from 'vitest'
import {advanceProjectDie,launchDifficulty,projectScope,resolveProjectGoal,resolveProjectLaunch} from '@/lib/vtm-v5/projects'

describe('SPEC-SESSION-011: mecânicas de Project',()=>{
 it('Scope e Launch Difficulty seguem o Appendix II',()=>{
  expect(projectScope(1,3)).toBe(2)
  expect(launchDifficulty(2)).toBe(4)
  expect(launchDifficulty(2,1)).toBe(5)
  expect(()=>projectScope(3,3)).toThrow()
 })
 it('vitória comum compromete Scope + 1 - margem, mínimo de um dot',()=>{
  const result=resolveProjectLaunch({rollD10:()=>[6,6,6,6,6,6]},6,0,2)
  expect(result).toMatchObject({outcome:'WIN',stakeRequired:1,margin:2})
 })
 it('crítico no lançamento não exige stake',()=>{
  const result=resolveProjectLaunch({rollD10:()=>[10,10,6,6,6,6]},6,0,2)
  expect(result).toMatchObject({outcome:'CRITICAL',stakeRequired:0})
 })
 it('Launch Roll falho aumenta dificuldade na tentativa posterior',()=>{
  const first=resolveProjectLaunch({rollD10:()=>[1,1,1,1]},4,0,2)
  const second=resolveProjectLaunch({rollD10:()=>[6,6,6,6]},4,0,2,1)
  expect(first.outcome).toBe('TOTAL_FAILURE')
  expect(second.launchDifficulty).toBe(5)
 })
 it('Goal Roll: jogador não soma críticos nos 10; oposição soma',()=>{
  const results=[[10,10,6,6],[10,10,6,6,1]]
  const r=resolveProjectGoal({rollD10:(count)=>{const values=results.shift()!;expect(values).toHaveLength(count);return values}},4,5)
  expect(r.playerSuccesses).toBe(4)
  expect(r.oppositionSuccesses).toBe(6)
  expect(r.opponentCriticalPairs).toBe(1)
  expect(r.stakeDamage).toBe(2)
  expect(r.won).toBe(false)
 })
 it('Goal Roll vencedor reduz Project Die pelo excesso de sucessos',()=>{
  const rolls=[[6,6,6,6],[1,1,1]]
  const r=resolveProjectGoal({rollD10:()=>rolls.shift()!},4,3)
  expect(r.won).toBe(true)
  expect(r.projectDieDamage).toBe(4)
 })
 it('Project Die persiste 10→9→...→1 e termina na décima redução',()=>{
  let value:number|null=10
  for(let i=0;i<9;i++){const step=advanceProjectDie(value!);expect(step.completed).toBe(false);value=step.next}
  expect(value).toBe(1)
  expect(advanceProjectDie(1)).toEqual({previous:1,next:null,completed:true})
 })
})
