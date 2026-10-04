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
