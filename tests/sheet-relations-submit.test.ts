import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { expect, it } from 'vitest'

// Regression guard: both relations forms use onSubmit; action buttons must submit.
const source = readFileSync(fileURLToPath(new URL('../components/sheet-narrative-tabs.tsx', import.meta.url)), 'utf8')

it('submits the create/edit relationship form from its primary action button', () => {
  expect(source).toContain("action:relation.id?'EDIT_RELATION':'CREATE_RELATION'")
  expect(source).toContain('if(target)await linkCatalogNpc(target)')
  expect(source).toMatch(/<button type="submit" className="button-primary self-start" disabled=\{busy\}>\{busy \? "Salvando…" : "Salvar relacionamento"\}<\/button>/)
})

it('submits the organization/place form from its primary action button', () => {
  expect(source).toMatch(/onSubmit=\{e=>\{e\.preventDefault\(\);void act\(async\(\)=>\{await command\(\{action:'CREATE_ENTITY'/)
  expect(source).toMatch(/<button type="submit" className="button-ghost self-start" disabled=\{busy\}>\{busy \? "Salvando…" : "Criar entidade"\}<\/button>/)
})
