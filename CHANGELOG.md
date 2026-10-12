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

## [2026-10-12] — Formulários V5, NPCs e ledger auditável

**Horário:** 13:25 BRT
**Tipo:** feat, fix, docs
**Arquivos principais:** `app/characters/character-form-client.tsx`, `app/api/characters/`, `lib/characters.ts`, `lib/db.ts`, `lib/dev-db.ts`, `lib/vtm-v5/`, `tests/`, `.kiro/specs/vtm-v5-character-rules/tasks.md`

- Integrados tipo de ficha, perfil de criação, valores derivados, relatório mecânico e envio para revisão ao formulário.
- Adicionados fluxos rápidos para NPC humano, NPC vampiro, retentor e carniçal usando presets do domínio.
- Criado ledger persistente de ajustes iniciais, validações e mudanças de status com origem, autor e timestamp.
- Finalizadas as onze tarefas da spec; 20 testes, TypeScript e build aprovados, com lint sem erros.

---

## [2026-10-12] — Persistência, validação e workflow de fichas V5

**Horário:** 13:14 BRT
**Tipo:** feat, fix, chore, docs
**Arquivos principais:** `lib/db.ts`, `lib/dev-db.ts`, `lib/characters.ts`, `lib/vtm-v5/validation.ts`, `app/api/characters/[id]/validate/route.ts`, `app/api/characters/[id]/status/route.ts`, `tests/`, `vitest.config.ts`, `.kiro/specs/vtm-v5-character-rules/tasks.md`

- Concluída a migração retrocompatível dos metadados comuns de fichas no PostgreSQL e no banco em memória.
- Cobertas autenticação, autorização e persistência do relatório na API de validação de fichas.
- Validado o workflow de submissão, aprovação, devolução, arquivamento e desativação, impedindo aprovação de fichas inválidas.
- Configurado o alias `@/` no Vitest para permitir testes diretos dos Route Handlers do Next.js.
- Consolidado no plano o status individual das onze tarefas da entrega.

---

## [2026-10-12] — Modelo de planejamento para novas tarefas

**Horário:** 01:55 BRT
**Tipo:** docs, chore
**Arquivos principais:** `AGENTS.md`, `.kiro/specs/README.md`, `.kiro/specs/_template/`

- Formalizado o roteiro do agente desde descoberta e requisitos até validação, revisão e entrega.
- Criados modelos reutilizáveis para requisitos, design técnico, tarefas rastreáveis e metadados.
- Vinculado o processo às regras do repositório para orientar futuras funcionalidades.

---

## [2026-10-12] — Calendários narrativos

**Horário:** 00:49 BRT
**Tipo:** feat
**Arquivos principais:** `app/api/campaign-event-calendar/status/route.ts`, `app/api/campaign-events/route.ts`, `components/campaign-calendar/`, `lib/db.ts`, `lib/types/campaign-event.ts`

- Adicionada escolha entre calendário real, data fictícia livre e calendário personalizado por mesa.
- A data fictícia livre usa dias da semana e meses reais, permitindo combinações narrativas e qualquer ano.
- O mestre pode definir nomes e ordem dos dias da semana e meses do cenário.
- Eventos fictícios usam ano narrativo, aparecem formatados sem vínculo com datas reais e mantêm ordenação própria.
- Preservada compatibilidade com eventos existentes no calendário real e adicionada migração automática das tabelas.
- Filtros de ano e mês são exibidos apenas quando a mesa possui mais de 20 eventos cadastrados.

---

## [2026-10-12] — Ordenação cronológica dos eventos

**Horário:** 00:39 BRT
**Tipo:** fix
**Arquivos principais:** `components/campaign-calendar/campaign-event-calendar.tsx`, `lib/db.ts`, `lib/types/campaign-event.ts`, `tests/campaign-calendar.integration.test.ts`

- Eventos do calendário agora são exibidos em ordem crescente de data e horário.
- Eventos sem horário aparecem após os eventos com horário no mesmo dia.
- Adicionado teste de integração para garantir a ordem cronológica.

---

## [2026-10-12] — Calendários de campanha e mesa virtual

**Horário:** 00:30 BRT
**Tipo:** feat, fix, docs
**Arquivos principais:** `app/api/campaign-events/route.ts`, `app/api/livekit/room/route.ts`, `app/campaigns/new/page.tsx`, `app/campaigns/[id]/page.tsx`, `components/campaign-calendar/`, `components/livekit/`, `lib/db.ts`, `lib/livekit.ts`

- Implementados calendário anual de eventos, CRUD, visibilidade por participante e toggles persistentes dos calendários.
- Adicionados checkbox e instruções do calendário de marcação na criação de mesas.
- Integrada sala virtual LiveKit com token gerado no servidor e permissão de host para o mestre.
- Adicionados testes de integração para toggles, CRUD de eventos e persistência da sala virtual.
- Build, TypeScript e lint validados; criado índice de banco para consultas de eventos por mesa e data.
- Documentadas as variáveis de ambiente e atualizados os status do plano de implementação.

---

## [2026-10-11] — Correção da edição de personagens

**Horário:** 23:39 BRT
**Tipo:** fix
**Arquivos principais:** `app/characters/page.tsx`, `app/characters/[id]/page.tsx`, `app/characters/[id]/summary/page.tsx`, `app/characters/[id]/edit/page.tsx`, `app/characters/character-form-client.tsx`

- Corrigida a leitura assíncrona do parâmetro `id` na rota dinâmica de edição para recuperar os dados da ficha.
- Corrigidos os links da listagem, da ficha e do resumo para usarem o `id` já resolvido e abrirem a rota específica de edição.
- Corrigida a recuperação do nome no resumo e o salvamento automático para não substituir o nome ao trocar de aba.
- O resumo da ficha agora lista todos os poderes escolhidos em cada disciplina e seus detalhes preenchidos.
- Impedido que o modo de edição crie outro personagem ou salve campos vazios antes do carregamento da ficha.

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
