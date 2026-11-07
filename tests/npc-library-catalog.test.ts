import { describe,expect,it } from 'vitest'
import { BOOK_NPC_TEMPLATES,NPC_TEMPLATES,validateNpc } from '@/lib/npc-domain'
import { visibleNpcTemplates } from '@/lib/npc-catalog-policy'

describe('catálogo de NPCs e antagonistas extraído da biblioteca V5',()=>{
  it('mantém 12 modelos com referências verificáveis e IDs únicos',()=>{
    expect(BOOK_NPC_TEMPLATES).toHaveLength(12)
    expect(new Set(NPC_TEMPLATES.map(item=>item.id)).size).toBe(NPC_TEMPLATES.length)
    expect(BOOK_NPC_TEMPLATES.every(item=>item.id.startsWith('book-'))).toBe(true)
    for(const entry of BOOK_NPC_TEMPLATES){
      expect(entry.official).toBe(true)
      expect(entry.sourceBook).toMatch(/^Vampire: The Masquerade V5/)
      expect(entry.sourcePage).toBeGreaterThan(0)
      expect(entry.source).toContain('adaptação narrativa simplificada')
      expect(validateNpc(entry.data)).toEqual(entry.data)
    }
  })

  it('preserva páginas e nomes conferidos nos PDF de origem',()=>{
    const pages = Object.fromEntries(BOOK_NPC_TEMPLATES.map(item=>[item.originalName,[item.sourceBook,item.sourcePage]]))
    expect(pages['Gangster']).toEqual(['Vampire: The Masquerade V5 — Corebook',371])
    expect(pages['Inquisitor Delta']).toEqual(['Vampire: The Masquerade V5 — Corebook',372])
    expect(pages['Elysium Harpy']).toEqual(['Vampire: The Masquerade V5 — Corebook',374])
    expect(pages['Hiromitsu Asano']).toEqual(['Vampire: The Masquerade V5 — Cults of the Blood Gods',254])
    expect(pages['Anna Fleischer']).toEqual(['Vampire: The Masquerade V5 — Cults of the Blood Gods',256])
  })

  it('não torna modelos globais visíveis sem a opção ativada pela mesa',()=>{
    expect(visibleNpcTemplates(BOOK_NPC_TEMPLATES,[],false)).toEqual([])
    expect(visibleNpcTemplates(BOOK_NPC_TEMPLATES,[],true)).toHaveLength(12)
  })
})
