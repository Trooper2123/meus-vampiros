# SPEC-SESSION-011 — Implementação na feature branch

**Branch:** `feat/session-011-projects-coterie` (criada diretamente de `develop`)  
**Data de início:** 2026-11-03  
**Status:** `in_progress` / backend validado por CI focada, UI ainda não aprovada

## Estratégia de persistência e validação

- Schema aditivo PostgreSQL em `lib/projects-coterie-schema.ts`, inicializado por `ensureAllTables`; não executado em banco real nesta sessão.
- Destino permitido para testes: banco PostgreSQL **local**, schema `meus_vampiros_test`, explicitamente isolado por `preparePostgresTest()`. Nunca executar limpeza ou migração de produção/homologação automaticamente.
- Rollback antes de qualquer uso real: reverter a branch e, **somente em schema de teste comprovadamente isolado**, limpar as tabelas desta feature em ordem de dependências. Em banco compartilhado, usar migração aditiva/reversão aprovada e backup.
- IDs de campanha/personagem/Coterie/Project conferidos pelo servidor; chave idempotente UUID por comando e revisão otimista de objetos editáveis.
- Informação privada do Narrador fica fora das projeções de listagem para jogadores.

## Tarefas e evidências de código

| Requisito | Estado | Evidências |
|---|---|---|
| Banco 1 Campanha → N Coteries; relacionamentos | Implementação inicial | `lib/projects-coterie-schema.ts` |
| Catálogo de tipos aberto, Corebook + suplementos | Parcial | 15 tipos iniciais Corebook; sem tipos adicionais de suplementos homologados |
| Dados de Domain, Chasse, Lien, Portillon | Backend implementado | `lib/coterie-service.ts` |
| Coterie Members, backgrounds, advantages/flaws, havens, favors/debts, goals | Backend implementado parcialmente | `lib/coterie-service.ts` |
| Goal → Project coletivo por ação explícita | Backend implementado | `GOAL_TO_PROJECT`; `origin_goal_id` exclusivo |
| Personal / Coterie Project; rascunho, envio, aprovação | Backend implementado | `lib/projects-service.ts` |
| Scope e Difficulty; Launch Roll com RNG no servidor | Backend implementado | `lib/vtm-v5/projects.ts` |
| Stake depois do Launch Roll, reserva e proteção contra double booking entre Projects | Parcial | `COMMIT_STAKE`, `project_stakes` |
| Project Die 10→1→conclusão; Increment manual | Backend implementado | `advanceProjectDie`, `INCREMENT` |
| Goal Roll versus pool de oposição Project Die, crítico só na oposição | Backend implementado | `resolveProjectGoal`, `RESOLVE_GOAL` |
| Registro de perdas em Stake e devolução dos recursos ao encerrar | Parcial | `applyStakeLoss`, `finalize`; valores extraordinários exigem Narrador |
| Projetos adversários NPC/FACTION | Pendente / arquitetura futura | Primeira entrega somente PLAYER/COTERIE |
| Projeções de segurança, API e histórico | Implementação inicial | `/api/campaigns/[id]/projects`, `/coteries` |
| Testes unitários e PostgreSQL isolado | **12 testes aprovados** na CI | `tests/project-mechanics.test.ts`, `tests/session11-projects-coterie.test.ts` |
| UI de Projetos e Coterie na Gestão da Mesa e Portal do Jogador | **Bloqueada por aprovação visual** | SPEC §25 exige apresentar mockup previamente |
| TypeScript, lint, build, auditoria npm e QA navegador | **TS, lint, build e audit produção aprovados na CI**; QA navegador pendente | Ambiente atual permite edição do GitHub, mas não execução do repositório/DB |

## Limites conhecidos — não marcar como completed

1. Pontos comprometidos em Stake são reservados entre os **Projects** desta funcionalidade. Os demais módulos que consomem Backgrounds ainda precisam passar a consultar a reserva, para impedir seu uso em rolagens/efeitos externos ao módulo.
2. Goal Roll adverso com prejuízo que excede os dots do Stake registra o excedente como **pendência de decisão do Narrador**; não há débito automático arbitrário de outras vantagens.
3. A vantagem obtida por Project bem-sucedido pode exigir XP e validação narrativa. Não conceder automaticamente dots/XP à ficha sem a política de aquisição aprovada.
4. A cooperação possui participantes explicitamente registrados, Stake dividido e rolagem principal conduzida pelo Narrador. Bônus específicos de Teamwork/Coterie Background são registrados na definição do pool de Launch pelo Narrador e precisam de normalização adicional.
5. Seleção personalizada de vantagens/defeitos e tipos adicionais de suplemento requer integração com os catálogos reais, não somente strings declaradas pelo cliente.
6. Increment depende de ação explícita do Narrador; automação pelo calendário da crônica permanece futura.
7. Os 12 testes focados foram executados e aprovados no runner GitHub Actions com PostgreSQL isolado; **não** substituem QA visual, homologação de todas as regras nem revisão manual de segurança.
8. Mockup tem dados fictícios para demonstrar layout, **não substitui aprovação visual do usuário**.

## Checklist de homologação

- [ ] Confirmar schema de teste isolado e executar bootstrap/seed sem tocar bancos compartilhados.
- [x] `npx next typegen`, `npx tsc --noEmit`, lint focado e build de produção sem falhas na CI.
- [x] Suíte focada: 12 testes em 2 arquivos aprovados, incluindo PostgreSQL isolado. **Suíte global** ainda não executada.
- [ ] Cobertura total de autorização (401, 403, IDOR), idempotência, concorrência e segredos do Narrador; há testes focados de isolamento de mesa e ex-integrante, mas não homologação completa.
- [ ] Rever mecânica de stake e consequências com o Appendix II, pp. 417–419.
- [ ] Aprovação visual dos mockups antes de alterar layouts de Coterie/Projects.
- [ ] Integrar reservas em recursos gerais, QA responsivo/acessibilidade e auditoria das dependências.
- [ ] Atualizar CHANGELOG, PR e critérios de aceite comprovados.

## Registro de validação automatizada (2026-11-03)

- Workflow `SPEC-SESSION-011 validation`, run `41670212248` — **sucesso** na branch de funcionalidade: Next typegen, TypeScript, ESLint focado, testes de regra e integração em PostgreSQL isolado, build de produção e `npm audit --omit=dev --audit-level=high`.
- **12 testes aprovados (2 arquivos)**. Auditoria de dependências de produção: **0 vulnerabilidades** relatadas. Dependências de desenvolvimento podem ter avisos moderados independentes desta feature.
- Nenhum banco de produção, staging compartilhado ou ambiente não identificado foi migrado, alterado ou limpo nesta sessão.
- Persistem as limitações mecânicas e o gate de aprovação visual acima; merge em `develop` continua bloqueado até revisão humana.
