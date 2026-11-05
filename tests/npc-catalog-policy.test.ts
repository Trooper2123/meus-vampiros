import { describe, expect, it } from 'vitest'
import { canCloneGlobalNpcTemplate, visibleNpcTemplates } from '../lib/npc-catalog-policy'

describe('catalogo global de NPCs por campanha', () => {
  const global = [{id:'global-1',name:'Modelo global'}]
  const personal = [{id:'personal-1',name:'Modelo pessoal'}]

  it('oculta apenas os modelos globais quando a mesa desabilita o catalogo', () => {
    expect(visibleNpcTemplates(global,personal,false)).toEqual(personal)
  })
  it('exibe globais e pessoais quando a mesa habilita o catalogo', () => {
    expect(visibleNpcTemplates(global,personal,true)).toEqual([...global,...personal])
  })
  it('nao altera os templates originais durante a listagem', () => {
    const original=JSON.stringify(global)
    visibleNpcTemplates(global,personal,false)
    visibleNpcTemplates(global,personal,true)
    expect(JSON.stringify(global)).toBe(original)
  })
  it('bloqueia clonagem de template global em mesa desabilitada', () => {
    expect(canCloneGlobalNpcTemplate(true,'campaign-id',false)).toBe(false)
    expect(canCloneGlobalNpcTemplate(true,'campaign-id',true)).toBe(true)
  })
  it('permite templates pessoais e catalogo sem mesa', () => {
    expect(canCloneGlobalNpcTemplate(false,'campaign-id',false)).toBe(true)
    expect(canCloneGlobalNpcTemplate(true,null,false)).toBe(true)
  })
})
