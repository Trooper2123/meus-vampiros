# SPEC-SESSION-011 — Implementação na feature branch

**Branch:** `feat/session-011-projects-coterie` (criada diretamente de `develop`)  
**Data de início:** 2026-11-03  
**Status:** `in_progress` / interface de Projetos e Coterie incorporada como abas do hub; validação atual pendente

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

## Revisão funcional — páginas separadas e acesso a Projects (2026-11-03)

**Requisitos confirmados pelo usuário:** Projetos e Coterie são páginas distintas; Projects pertencem a um personagem jogável ou à Coterie, mas admitem parceiros jogadores e NPCs; o Narrador consulta todos os Projects e pode criá-los; jogadores só veem os Projects do seu personagem, dos quais seu personagem participa ou da Coterie da qual são membros.

- [x] Backend: projetos do Narrador podem indicar personagem de outro jogador ou Coterie como proprietário.
- [x] Backend: `project_participants` vincula jogadores por personagens e `project_npc_participants` registra NPCs existentes na mesma mesa.
- [x] Backend: a listagem e operações consultam autorização individual por recurso, não apenas filtros da UI.
- [x] Backend: parceiro tem acesso à consulta, mas não recebe automaticamente permissão de editar o projeto.
- [ ] Interface: substituir placeholders por **duas rotas diferentes**, `/campaigns/[id]/projects` e `/campaigns/[id]/coterie`, na navegação do Narrador e do jogador. A divisão atual por views/tabs é provisória, não a entrega de páginas separadas.
- [ ] Criar **dois mockups** coerentes com a identidade gótica real (preto/vermelho profundo/molduras douradas) antes de implementar layouts; a composição anterior lado a lado não atende aos requisitos.
- [ ] Reexecutar CI depois das alterações de autorização e de relacionamento de NPCs, incluindo testes de colaboração e isolamento entre campanhas.
- [ ] Garantir que as políticas de visibilidade do catálogo NPC sejam refletidas na apresentação dos parceiros, sem expor anotações privadas do Narrador.

**Dependência técnica:** a integração opcional de NPCs exige `campaign_npcs`/`npc_definitions` da migração `20261023_npcs_sheet_narrative.sql`. A nova tabela armazena UUID do vínculo e nome de apresentação; não impõe FK direta sobre a migração opcional no bootstrap. O comando valida a existência do NPC vinculado à mesa antes de persistir sua participação.

## Entrega incremental — Página Projetos da Mesa e Stake do jogador (2026-11-03)

**Autorização de UI confirmada:** referência visual enviada pelo usuário para a **página Projetos**, distinta da página Coterie. O layout foi implementado em `/campaigns/[id]/projects`; o módulo de Coterie continua independente e pendente de aprovação visual específica.

- [x] Página dedicada com a estrutura de navegação da aplicação, tabela com Projeto, Proprietário, Tipo, Progresso, Project Die, Increment, Status e Ações.
- [x] Filtros por projetos pessoais, da Coterie, com NPCs, status e busca textual.
- [x] Acesso do Narrador a todos os Projects da mesa; acesso do jogador somente aos seus, aos que envolvem seu personagem e aos de sua Coterie.
- [x] Criação de projetos pessoais ou da Coterie, envio para aprovação, aprovação mecânica, Launch Roll, Increment e solicitação/execução de Goal Roll.
- [x] Edição de participantes jogadores no rascunho; seleção de NPCs vinculados à campanha no painel do Narrador.
- [x] Exibição do Stake reservado; API `/api/campaigns/[id]/projects/stakes?projectId=` lista dots existentes, reservados e disponíveis para cada jogador/Coterie participante.
- [x] Confirmação do Stake com bloqueio transacional de dupla reserva entre Projects, persistência em `project_stakes` e eventos no ledger da ficha (reserva, perda e liberação).
- [x] Verificação de que Stake utiliza apenas Backgrounds elegíveis (incluindo nomes ingleses e traduções PT-BR reconhecidas) e não qualquer vantagem da ficha.
- [ ] Homologar a implementação visual com testes de navegador e revisar acessibilidade, responsividade e integração da seleção de NPCs.
- [ ] Integrar as reservas de Background às **outras mecânicas fora do módulo Projects** que possam consumir esses mesmos dots. Hoje o bloqueio cobre Projects concorrentes, não toda a aplicação.
- [ ] Validar a versão atual na CI. A última CI verde anterior não inclui todos os commits desta entrega.

**Arquivos principais:** `components/projects/campaign-projects-panel.tsx`, `app/campaigns/[id]/projects/page.tsx`, `lib/project-stake-options.ts`, `lib/projects-service.ts`, `app/api/campaigns/[id]/projects/stakes/route.ts`, `tests/session11-projects-coterie.test.ts`.

## Entrega incremental — visão do jogador (2026-11-03)

- [x] Criada `components/projects/player-projects-panel.tsx`, renderizada somente para jogador na rota `/campaigns/[id]/projects`; Narrador mantém sua tabela própria.
- [x] Layout conforme referência enviada: cards compactos, barras de progresso, Project Die, status, menus de detalhes e destaque vermelho escuro.
- [x] Filtros **Todos**, **Meus**, **Em parceria** e **Da Coterie** com contadores calculados apenas sobre projetos autorizados pela API. Filtro adicional por status.
- [x] Relação do jogador (`playerRelation`) classificada pelo servidor mediante propriedade real do personagem, participação explícita e vínculo ativo à Coterie. Filtros visuais não substituem autorização SQL.
- [x] Criação de rascunhos próprios ou da Coterie, edição e envio para aprovação exclusivamente pelo responsável, acompanhamento de participantes e NPCs, Stake reservado, histórico e solicitação de Goal Roll.
- [x] Nenhuma ação de aprovação, Launch, Increment, COMMIT_STAKE ou resolução do Goal Roll é exposta ao jogador; backend continua validando todas as ações.
- [x] Teste de integração adicionado para classificação MINE/PARTNER/COTERIE, visibilidade do Narrador e proibição de operações mecânicas exclusivas.
- [ ] Validar commits atuais em CI e realizar QA com duas contas (Narrador e jogador) e telas estreitas.
- [ ] Opcional futuro: o jogador solicitar participação em projetos alheios sem conseguir editar o projeto, sujeito à aprovação do proprietário/Narrador.

## Entrega incremental — página Coterie (2026-11-03)

- [x] Criada rota independente `/campaigns/[id]/coterie`, com sidebar e identidade visual da campanha. Narrador e jogadores acessam a mesma página com operações adequadas aos seus papéis.
- [x] Criado `CampaignCoteriePanel`: seleção de Coterie, resumo, membros, Domain (Chasse/Lien/Portillon), Backgrounds, vantagens/defeitos, Havens e seus méritos/defeitos, favores/dívidas e objetivos.
- [x] Narrador pode criar Coterie, editar Domain, gerir participantes, cadastrar Backgrounds, vantagens/defeitos, Haven, méritos/defeitos do Haven e favores.
- [x] Jogadores integrantes podem consultar a própria Coterie, propor objetivos e criar projetos coletivos a partir de objetivos abertos. Apenas o Narrador pode alterar recursos coletivos.
- [x] API aplica visibilidade por Coterie: integrantes ativos veem apenas aquelas das quais participam; Narrador vê todas da mesa.
- [x] API inclui detalhes de Haven traits, contadores de Projects relacionados e opções de personagens (apenas Narrador).
- [x] Links e redirecionamentos da visão da mesa e do portal do jogador apontam para a rota independente; Projects continua em outra página.
- [x] Testes de integração escritos para autorização, Domain, recursos coletivos, Haven traits e conversão de objetivo em Project.
- [ ] Executar CI da versão atual (Next typegen, tsc, lint, Vitest PostgreSQL e build) e corrigir eventuais falhas.
- [ ] QA manual responsivo, acessibilidade e navegação em duas contas.
- [ ] Melhorias posteriores: edição/baixa de favores e dívidas, exclusão de registros com histórico, seleção catalogada amigável de vantagens e gestão de recursos considerando reservas de Stake em toda a aplicação.

**Arquivos:** `app/campaigns/[id]/coterie/page.tsx`, `components/coterie/campaign-coterie-panel.tsx`, `lib/coterie-service.ts`, `tests/session11-projects-coterie.test.ts`.

## Revisão de navegação — Coterie e Projetos como abas do hub (2026-11-03)

A orientação mais recente do usuário substitui o requisito anterior de páginas independentes: **Projetos e Coterie são abas distintas do hub da mesa**. A divisão entre módulos permanece funcional, mas não exige saída do portal.

- [x] Narrador: `/campaigns/[id]?view=projects` monta `CampaignProjectsPanel`; `?view=coterie` monta `CampaignCoteriePanel`. Links da sidebar usam `viewHref` e permanecem no mesmo hub.
- [x] Jogador: as tabs de `PlayerCampaignPortal` passam a renderizar `PlayerProjectsPanel` e `CampaignCoteriePanel` diretamente, preservando o banner, tabs e contexto de mesa.
- [x] Deep links do jogador `/campaigns/player/[id]?tab=projects|coterie` abrem a tab correta após validação do parâmetro.
- [x] Links internos da Coterie abrem o painel de Projetos como aba, com troca de estado no portal do jogador ou navegação por query no hub do Narrador.
- [x] URLs legadas `/campaigns/[id]/projects` e `/campaigns/[id]/coterie` redirecionam para o hub do perfil apropriado após autenticação e verificação de acesso.
- [x] Nenhuma alteração na API, mecânica de Stake, catálogo, identidade visual ou permissões; a refatoração é de composição/navegação.
- [ ] Validar compilação, lint, testes de integração e build por CI nesta revisão.
- [ ] Verificar em navegador a alternância de abas nas visões Narrador e Jogador, inclusive campanha arquivada, tela estreita e links legados.

**Nota de histórico:** os parágrafos anteriores que solicitam páginas independentes refletem versões superadas da SPEC. A decisão deste registro é a vigente.
