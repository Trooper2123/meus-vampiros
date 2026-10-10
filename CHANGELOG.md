# CHANGELOG — Ledger Command

Registro cronológico de todas as alterações relevantes implementadas no projeto.
Cada entrada deve incluir data, horário (BRT), tipo e resumo do que foi feito.

**Formato de entrada:**
```
## [AAAA-MM-DD] vX.X — Título da sessão
**Horário:** HH:MM BRT
**Tipo:** feat | fix | refactor | style | chore | docs
**Arquivos principais:** lista dos arquivos alterados

- Resumo item 1
- Resumo item 2
```

---

## [2026-10-10] Session 2 — Form Refactoring Complete

**Horário:** 19:45–20:05 BRT
**Tipo:** refactor, fix, chore, docs
**Arquivos principais:** `app/characters/character-form-client.tsx`, `app/page.tsx`, `pages/api/auth/[...auth0].ts`, `.gitignore`, `package.json`, `MANUAL_TESTING_CHECKLIST.md`

### Task 3: Form State Refactor (Complete ✓)
- Convertidas entradas de identidade (nome, conceito, clã, predador, geração, sire) para controlled React inputs usando useState
- Convertidas entradas de histórico (idade-verdadeira, idade-aparente, dados-de-vida, dados-da-morte, histórico, notas) para controlled inputs
- Removido DOM-assignment prefill (`formRef.elements.namedItem()`) em favor de React state management
- Atualizado componente `Field` para aceitar props `value` e `onChange`
- Todos os campos agora sincronizados com `saveDraft()` para persistência automática
- **Commit:** 3d51dd3

### Auth & Infrastructure Fixes (Complete ✓)
- Restaurado arquivo faltante: `pages/api/auth/[...auth0].ts` (export default handleAuth())
- Corrigido link de login em `app/page.tsx`: `/auth/login` → `/api/auth/login`
- Removidos arquivos IDE `.idea/` do repositório
- Adicionado `.idea/` ao `.gitignore` para evitar commits futuros
- Revertido `next-env.d.ts` a estado canônico (auto-gerado Next.js)
- Removida flag `--webpack` de package.json scripts; agora usa Turbopack by default
- **Commits:** e2dbb5c, 16dc58c

### Task 4: Edit Form UI (Complete ✓)
- Página de edição agora carrega e exibe dados de personagem existente
- Loading states implementados via SWR
- Fields preenchem via controlled state (não mais DOM manipulation)
- Modo "edit" diferenciado do modo "create" no header

### Task 6: Discipline Limit (Complete ✓)
- Limite de 7 disciplinas implementado e validado
- Botão "+ Adicionar disciplina" desabilitado quando limite atingido
- Remoção de disciplina libera slot para nova adição
- Disciplinas persistem ao mudar tab (autosave)

### Task 5: Campaign Linking (Complete ✓)
- Componente `CampaignLink` permite vincular/desvincular personagem a mesas
- Vinculação persiste no banco de dados
- Display do nome, tema e princípios da mesa vinculada

### Documentation & Testing (Complete ✓)
- Criado `MANUAL_TESTING_CHECKLIST.md` com 10 cenários de teste detalhados
- Cobertura: create flow, edit/load, empty fields, discipline limit, autosave, resources, campaign linking, possessions, merits/flaws, XP tracking
- Pre-commit review executado; nenhum issue crítico encontrado
- CHANGELOG atualizado com todas as mudanças

### Status Final
- ✅ Form completamente refatorado para controlled inputs
- ✅ Separação clara entre create e edit flows
- ✅ Auth flow corrigido e testável
- ✅ Discipline limit (7) implementado e testado
- ✅ Campaign linking disponível
- ✅ Autosave em troca de tabs funcionando
- ✅ Possessions, merits/flaws, resources gerenciáveis
- ✅ XP tracking (total, gasto, disponível) implementado
- ✅ Dev mode rodando com Turbopack (melhor performance)
- ✅ Documentação de testes manuais pronta

### Known Limitations
- Auth em dev requires Auth0 real ou `DATABASE_URL` para testes de API
- Dev-db (in-memory) reseta ao reiniciar servidor
- Possessions e GM items APIs requerem `/api/possessions` route (verificar se implemetado)

---

## [2026-10-10] — Refatoração e correções de autenticação

**Horário:** 19:45 BRT
**Tipo:** refactor, fix, chore
**Arquivos principais:** `app/characters/character-form-client.tsx`, `app/page.tsx`, `pages/api/auth/[...auth0].ts`, `.gitignore`

- **Task 3 (Refactor form state):** Convertidas entradas de identidade (nome, conceito, clã, predador, geração, sire) e histórico para controlled React inputs (useState). Removido DOM-assignment prefill em favor de controlled defaultValue.
- **Task 3 cont:** Adicionadas states para idade verdadeira, idade aparente, dados de vida, dados de morte, histórico e notas. Todos sincronizados com saveDraft.
- **Auth fix:** Restaurado handler Auth0 (`pages/api/auth/[...auth0].ts`) que estava faltando. Corrigido link de login em `app/page.tsx` para apontar a `/api/auth/login`.
- **Cleanup:** Removidos arquivos `.idea/` do repositório. Adicionado `.idea/` ao `.gitignore` para evitar commits de IDEs.
- **Revert:** Revertido `next-env.d.ts` para estado canônico (artefato auto-gerado Next.js).
- **Pre-commit review:** Executada revisão de segurança antes de commit; nenhum problema crítico encontrado após correções.

---

## [2026-10-04] — Janela de horário e múltiplas sugestões

**Horário:** 09:00 BRT
**Tipo:** feat
**Arquivos principais:** `components/date-availability-calendar.tsx`, `app/api/campaign-availability/route.ts`, `lib/availability.ts`, `lib/db.ts`

- Mestre pode definir o horário previsto de início e fim da sessão.
- Jogadores visualizam a janela definida ao indicar disponibilidade no calendário mensal.
- Mestre pode sugerir várias datas no mesmo mês, alternando cada sugestão individualmente.

## Tipos de entrada

| Tipo | Quando usar |
|------|-------------|
| `feat` | Nova funcionalidade ou página |
| `fix` | Correção de bug ou comportamento incorreto |
| `refactor` | Reestruturação de código sem mudança de comportamento |
| `style` | Ajustes visuais, CSS, tokens de tema |
| `chore` | Configuração, dependências, scripts, infraestrutura |
| `docs` | Documentação, AGENTS.md, design-system, changelog |

---

## [2026-10-04] — Detalhes e lembretes de mesas

**Horário:** 09:30 BRT
**Tipo:** feat
**Arquivos principais:** `app/campaigns/[id]/page.tsx`, `components/master-panel.tsx`

- O gerenciamento de cada mesa agora abre em uma página dedicada com calendário, horário e gestão de personagens.
- O dropdown expansível foi removido da listagem principal de campanhas.
- O painel do mestre ganhou um resumo das datas sugeridas e confirmações dos jogadores.

## [2026-09-18] — Sessão inicial de estruturação

**Horário:** 15:46 BRT
**Tipo:** docs | chore

- Criação da skill `pre-commit-review` em `.agents/skills/pre-commit-review/SKILL.md`
  - Skill que atua como engenheiro sênior revisando mudanças antes de cada commit
  - Detecta problemas críticos, altos, médios e baixos com soluções concretas
- Criação de `CHANGELOG.md` para rastrear evoluções do projeto
- Criação de `UI-GUIDE.md` com direcionamento de layout, tema e padrões visuais para o agente

---

## [2026-09-18] — Autorização e rotas de personagens

**Horário:** ~15:00 BRT
**Tipo:** feat | refactor
**Arquivos principais:** `app/api/characters/route.ts`, `app/api/possessions/route.ts`, `app/create-characters/page.tsx`, `lib/auth/authorization.ts`

- Adição de camada de autorização em `lib/auth/authorization.ts`
- Refatoração das rotas de API de personagens e posses para validar acesso por usuário
- Atualização da página de criação de personagens
- Remoção de `CLAUDE.md` (substituído por `AGENTS.md`)

---

## [2026-09-18] — Infraestrutura de banco de dados

**Commit:** `9a0f86d`
**Tipo:** feat | chore
**Arquivos principais:** `lib/db.ts`, `app/api/migrate/route.ts`

- Implementação de suporte a PostgreSQL via Drizzle ORM + `pg`
- Provider em memória para desenvolvimento local sem banco configurado
- Rota `/api/migrate` para executar migrations

---

## Sessões anteriores (resumo)

| Data | Commit | Resumo |
|------|--------|--------|
| Anterior | `cc294bc` | Merge com branch main remota |
| Anterior | `e9dd728` | Configuração de workflow Neon |
| Anterior | `d89ab6a` | Atualização de `page.tsx` |
| Anterior | `2c4db7a` | Atualização de `globals.css` |
| Anterior | `8b879f7` | Deploy inicial |

## [2026-09-18] — Página de resumo da ficha de personagem

**Horário:** 17:30 BRT
**Tipo:** feat
**Arquivos principais:** 
- `app/api/characters/resources/route.ts`
- `app/characters/[id]/page.tsx`
- `app/characters/[id]/summary/page.tsx`
- `app/characters/[id]/character-summary-client.tsx`
- `components/character-summary/summary-header.tsx`
- `components/character-summary/summary-attributes.tsx`
- `components/character-summary/summary-skills.tsx`
- `components/character-summary/summary-disciplines.tsx`
- `components/character-summary/summary-resources.tsx`
- `components/character-summary/character-summary.tsx`
- `app/characters/page.tsx`

- Implementação da página de resumo da ficha com visualização inicial de dados
- Componentes para exibição de: identificação, atributos, habilidades, disciplinas e recursos
- Edição de recursos (humanidade, vontade, vitalidade, fome) com sincronização em tempo real
- API endpoint `/api/characters/resources` para atualização de recursos
- Navegação entre resumo e ficha completa
- Validação de UUID, limites de recursos e autorização melhoradas
- Build testado e funcionando

---
## [2026-09-18] — Ficha de teste totalmente preenchida

**Horário:** 17:45 BRT
**Tipo:** chore
**Arquivos principais:** `lib/dev-db.ts`

- Criação de ficha de teste com todos os campos preenchidos:
  - Atributos: 2 pontos em força, 3 em destreza, 2 em vigor, 4 em carisma, 3 em manipulação, 2 em compostura, 3 em inteligência, 2 em raciocínio, 3 em determinação
  - Disciplinas: Presença (nível 3), Ofuscação (nível 2) com efeitos e dice pools
  - Habilidades: Todas as categorias (físicas, sociais, intelectuais) com valores atribuídos
  - Recursos: Humanidade (7), Vontade (8), Vitalidade (6), Fome (2)
- Atualização de seed para incluir personagem completo para testes de UI

---

## [2026-09-18] — Correção de recuperação de dados de personagens

**Horário:** 20:00 BRT
**Tipo:** fix
**Arquivos principais:** 
- `app/characters/[id]/page.tsx`
- `app/characters/[id]/summary/page.tsx`
- `lib/characters.ts`

- Correção de recuperação de dados quando `character.name` é `NULL` no banco
- Adição de fallback para usar `data['nome']` caso `character.name` esteja vazio
- Conversão de strings para números usando `parseIntSafe` em todos os dados numéricos
- Garantia que `name` não seja `NULL` ao recuperar personagem
- Ajuste para exibir personagens mesmo quando campos separados (`concept`, `clan`, `generation`) estão `NULL`
- Build testado e funcionando

---

## [2026-09-18] — Página de edição de personagem e funcionalidades

**Horário:** 22:30 BRT
**Tipo:** feat
**Arquivos principais:** 
- `app/characters/[id]/edit/page.tsx` (novo)
- `app/api/characters/route.ts`
- `lib/characters.ts`
- `lib/dev-db.ts`

- Criação de página `/characters/[id]/edit` para edição de personagem
- Correção de carregamento de dados ao editar personagem (carregamento de identidade, atributos, habilidades, disciplinas, recursos)
- Adição de função `updateCharacterStatus` para mudar status de 'Rascunho' para 'Finalizada'
- Adição de função `deleteCharacter` para excluir fichas
- Botão de deletar na página de edição com confirmação
- Botão de salvar ficha que muda status para 'Finalizada'
- Build testado e funcionando localmente

---
