import type { ReactElement, ReactNode } from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
const harness=vi.hoisted(()=>({ narrator:true, characters:[] as unknown[], mutate:vi.fn() }))
vi.mock('react',async original=>({
  ...await original<typeof import('react')>(),
  useState:(initial:unknown)=>[initial,vi.fn()],useEffect:vi.fn(),useCallback:(fn:unknown)=>fn,useMemo:(fn:()=>unknown)=>fn(),
}))
vi.mock('swr',()=>({default:(url:string)=>({mutate:harness.mutate,data:!url?undefined:url.includes('/contacts')?{
  isNarrator:harness.narrator,characters:harness.characters,coteries:[],npcContacts:[{id:'npc-one',name:'Informante',canMessage:true},{id:'npc-two',name:'Xerife',canMessage:true}],
}:{isNarrator:harness.narrator,enabled:true,threads:[]}})}))
import { CharacterSms } from '@/components/character-sms/character-sms'
type Element=ReactElement<Record<string,unknown>>
function elements(node:ReactNode):Element[]{
  if(Array.isArray(node))return node.flatMap(elements)
  if(!node||typeof node!=='object'||!('props' in node))return []
  const e=node as Element
  return [e,...elements(e.props.children as ReactNode)]
}
beforeEach(()=>{
  harness.narrator=true;harness.characters=[];harness.mutate.mockResolvedValue(undefined)
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json({id:'thread'})))
})
afterEach(()=>vi.unstubAllGlobals())
it('Narrador abre conversa entre NPCs com identidades tipadas, sem enviar NPC como Character',async()=>{
  const tree=elements(CharacterSms({campaignId:'campaign',mode:'narrator'}))
  const open=tree.find(e=>e.type==='button'&&e.props.children==='Abrir conversa')!
  expect(open.props.disabled).toBe(false)
  await (open.props.onClick as ()=>void)()
  await vi.waitFor(()=>expect(fetch).toHaveBeenCalled())
  const body=JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string)
  expect(body).toEqual({kind:'DIRECT',senderNpcId:'npc-one',recipientNpcId:'npc-two'})
})
it('jogador fala apenas como sua ficha e seleciona NPC revelado como destinatário',async()=>{
  harness.narrator=false
  harness.characters=[{id:'character',name:'Jogador',characterType:'PLAYER_VAMPIRE',owned:true}]
  const tree=elements(CharacterSms({campaignId:'campaign',mode:'player'}))
  const selects=tree.filter(e=>e.type==='select')
  expect(elements(selects[0]).filter(e=>e.type==='option').map(e=>e.props.value)).toEqual(['character'])
  const open=tree.find(e=>e.type==='button'&&e.props.children==='Abrir conversa')!
  ;(open.props.onClick as ()=>void)()
  await vi.waitFor(()=>expect(fetch).toHaveBeenCalled())
  expect(JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string)).toEqual({kind:'DIRECT',senderCharacterId:'character',recipientNpcId:'npc-one'})
})
