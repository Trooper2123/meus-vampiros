# SPEC-SESSION-011 — Implementação na feature branch

**Branch:** `feat/session-011-projects-coterie` (criada diretamente de `develop`)  
**Data de início:** 2026-11-03  
**Status:** `in_progress` / **não homologada**

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
| Testes unitários e PostgreSQL isolado | Escritos, **não executados** | `tests/project-mechanics.test.ts`, `tests/session11-projects-coterie.test.ts` |
| UI de Projetos e Coterie na Gestão da Mesa e Portal do Jogador | **Bloqueada por aprovação visual** | SPEC §25 exige apresentar mockup previamente |
| TypeScript, lint, build, auditoria npm e QA navegador | **Não executados** | Ambiente atual permite edição do GitHub, mas não execução do repositório/DB |

## Limites conhecidos — não marcar como completed

1. Pontos comprometidos em Stake são reservados entre os **Projects** desta funcionalidade. Os demais módulos que consomem Backgrounds ainda precisam passar a consultar a reserva, para impedir seu uso em rolagens/efeitos externos ao módulo.
2. Goal Roll adverso com prejuízo que excede os dots do Stake registra o excedente como **pendência de decisão do Narrador**; não há débito automático arbitrário de outras vantagens.
3. A vantagem obtida por Project bem-sucedido pode exigir XP e validação narrativa. Não conceder automaticamente dots/XP à ficha sem a política de aquisição aprovada.
4. A cooperação possui participantes explicitamente registrados, Stake dividido e rolagem principal conduzida pelo Narrador. Bônus específicos de Teamwork/Coterie Background são registrados na definição do pool de Launch pelo Narrador e precisam de normalização adicional.
5. Seleção personalizada de vantagens/defeitos e tipos adicionais de suplemento requer integração com os catálogos reais, não somente strings declaradas pelo cliente.
6. Increment depende de ação explícita do Narrador; automação pelo calendário da crônica permanece futura.
7. Testes foram redigidos, mas não executados. Revisar diferenças de retorno SQL, esquema e autorização em PostgreSQL antes de permitir merge.
8. Mockup tem dados fictícios para demonstrar layout, **não substitui aprovação visual do usuário**.

## Checklist de homologação

- [ ] Confirmar schema de teste isolado e executar bootstrap/seed sem tocar bancos compartilhados.
- [ ] `npx tsc --noEmit`, lint e build sem falhas.
- [ ] `npm test` e testes com banco isolado executados; corrigir fixtures e divergências.
- [ ] Cobertura de autorização (401, 403, IDOR), idempotência, concorrência e segredos do Narrador.
- [ ] Rever mecânica de stake e consequências com o Appendix II, pp. 417–419.
- [ ] Aprovação visual dos mockups antes de alterar layouts de Coterie/Projects.
- [ ] Integrar reservas em recursos gerais, QA responsivo/acessibilidade e auditoria das dependências.
- [ ] Atualizar CHANGELOG, PR e critérios de aceite comprovados.
