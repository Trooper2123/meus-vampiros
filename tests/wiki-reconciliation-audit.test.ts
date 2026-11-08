import { describe, expect, it } from 'vitest'
import audit from '@/lib/vtm-v5/wiki-reconciliation-audit.json'
import fieldAudit from '@/lib/vtm-v5/wiki-field-quality-audit.json'
import { DISCIPLINE_RESEARCH, DISCIPLINE_WIKI_REFERENCES } from '@/lib/vtm-v5/research-catalog'
import { DISCIPLINES } from '@/lib/vtm-v5/disciplines'

const canonical = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\u2018\u2019]/g, "'").replace(/[^a-zA-Z0-9]/g, '').toLowerCase()

describe('reconciliação das referências VTM Wiki', () => {
  it('mantém o catálogo publicado separado dos candidatos não validados', () => {
    expect(DISCIPLINE_RESEARCH).toHaveLength(audit.baselineCount)
    expect(audit.missingCount).toBe(audit.missing.length)
    const existing = new Set(DISCIPLINE_RESEARCH.map(item => `${item.disciplineId}:${canonical(item.name)}`))
    expect(audit.missing.every(item => !existing.has(`${item.disciplineId}:${canonical(item.name)}`))).toBe(true)
    expect(audit.missing.every(item => item.status === 'MISSING_PENDING_MECHANICAL_REVIEW')).toBe(true)
  })

  it('referencia as 12 disciplinas e não cria níveis inválidos', () => {
    expect(Object.keys(DISCIPLINE_WIKI_REFERENCES)).toHaveLength(DISCIPLINES.length)
    expect(audit.missing.every(item => DISCIPLINES.some(d => d.id === item.disciplineId) && item.level >= 1 && item.level <= 5)).toBe(true)
    expect(DISCIPLINE_RESEARCH.every(item => item.wikiReferenceUrl?.startsWith('https://vtm.paradoxwikis.com/'))).toBe(true)
  })

  it('preserva registros com o mesmo nome mas livros diferentes para avaliação editorial', () => {
    expect(audit.duplicateNameLevel.some(item => item.key.includes('lesangdelamour'))).toBe(true)
  })
  it('documenta lacunas de preenchimento em todos os 376 registros sem confundi-las com validação mecânica', () => {
    expect(fieldAudit.records).toBe(DISCIPLINE_RESEARCH.length)
    expect(fieldAudit.recordsAudit).toHaveLength(DISCIPLINE_RESEARCH.length)
    expect(fieldAudit.rowsWithAnyGeneric + fieldAudit.rowsWithoutGeneric).toBe(fieldAudit.records)
    expect(fieldAudit.rowsWithAnyGeneric).toBeGreaterThan(0)
    expect(fieldAudit.recordsAudit.every(item => DISCIPLINE_RESEARCH.some(row => row.id === item.id))).toBe(true)
  })

  it('mantém valores N/A quando a tabela da Wiki indica ausência de teste, sem inventar dados', () => {
    const awe = DISCIPLINE_RESEARCH.find(item => item.name === 'Awe' && item.disciplineId === 'PRESENCE')
    expect(awe?.pool).toBe('N/A')
    expect(awe?.opposing_pool).toBe('N/A')
    const bond = DISCIPLINE_RESEARCH.find(item => item.name === 'Bond Famulus')
    expect(bond?.prerequisite).toBe('None')
    expect(bond?.amalgam).toBe('No')
  })

})
