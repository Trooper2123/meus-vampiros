# SPEC-RPG-023 — Tarefas

**Status da SPEC:** proposed
**Status da implementação:** not_started
**Branch:** develop
**Escopo do commit:** documentos apenas. Não foram executados migrations, alterações de código, testes nem importação de catálogo.

## Inventário e análise

- [ ] **T01 [P0]** Mapear os atuais `merits-flaws-catalog.json`, `trait-options`, `traits-editor`, componentes de ficha, XP e schema efetivo de vantagens/antecedentes.
- [ ] **T02 [P0]** Inspecionar regras de Loresheets e vantagens restritas nos livros, catalogando *título inglês, PT-BR, página impressa/PDF, clã/linhagem, elegibilidade, nível, efeito/custo, status de revisão*; não copiar texto protegido sem autorização.
- [ ] **T03 [P0]** Confirmar regras de quantidade máxima de Loresheets, compatibilidade entre níveis e compra posterior por fonte; marcar lacunas para aprovação do Narrador.
- [ ] **T04 [P0]** Ler `UI-GUIDE.md`/`design-system.md` e componentes de seleção **Adicionar habilidade**, preservando padrão existente.
- [ ] **T05 [P0]** Definir destino de testes antes de mexer no banco: `DATABASE_URL` de PostgreSQL isolado de desenvolvimento validado, sem gravar segredo; migrations reproduzíveis e rollback em migration específica, nunca limpeza automática.

## Dados e serviços

- [ ] **T06 [P0]** Estender catálogo existente (ou JSON tipado) com classificação, Loresheet e perks por nível independentes, requisitos e referências exatas.
- [ ] **T07 [P0]** Produzir primeiro seed revisado de Loresheets e vantagens/clãs provenientes de livros autorizados; registrar cobertura por obra e eventuais lacunas.
- [ ] **T08 [P0]** Implementar configuração de campanha para livros/itens liberados e adjudicação de exceções por Narrador.
- [ ] **T09 [P0]** Implementar aquisição individual com elegibilidade e orçamento de pontos de criação; apenas valores respaldados na fonte.
- [ ] **T10 [P0]** Integrar aquisição por XP ao serviço de evolução existente, com idempotência, auditoria e transação, sem segundo saldo de XP.
- [ ] **T11 [P0]** Persistir escolhas individuais por perk, origem, nível, custo, versão, status e aprovação; não marcar níveis inferiores como obtidos automaticamente.
- [ ] **T12 [P1]** Implementar benefícios tipados e ledger rastreável das concessões derivadas (sem pontos duplicados).
- [ ] **T13 [P1]** Implementar Loresheets coletivas quando a fonte permitir, consentimento e aplicação na Coterie.
- [ ] **T14 [P1]** Implementar itens `CUSTOM` criados e aprovados pelo Narrador, sem editar registro oficial.
- [ ] **T15 [P1]** Revisar comportamento em alterações de clã/facção e bloqueio temporário conforme SPEC-RPG-021.

## UX e API

- [ ] **T16 [P1]** Aba **Específicos de Clã / Loresheets** e busca por nome inglês/PT, clã, linhagem, livro, pontos e elegibilidade.
- [ ] **T17 [P1]** Cards com nível individual, fonte, requisito, custo, status, botão **Adicionar à ficha** e confirmação.
- [ ] **T18 [P1]** Controles do Narrador para fontes habilitadas, exceções, aprovações e personalização.
- [ ] **T19 [P1]** Resumo e edição da ficha exibem escolhas, fontes e efeitos, sem alterar poderes de Disciplina.
- [ ] **T20 [P1]** Integrar atualizações da mesa para aquisições/autorizações/revogações respeitando privacidade.

## Testes, segurança, release

- [ ] **T21 [P0]** Testar níveis independentes, elegibilidade por clã, limite por campanha, fonte desabilitada, custo de criação/XP e efeitos não duplicados.
- [ ] **T22 [P0]** Testar transações, requisições concorrentes, permissão do Narrador, 401/403, IDOR/BOLA, isolamento entre mesas, parâmetros inválidos e vazamento de segredos.
- [ ] **T23 [P1]** Testar tradução, referências de página, busca, acessibilidade, navegação por teclado e responsividade.
- [ ] **T24 [P0]** Executar análise de segurança OWASP, testes, TypeScript, lint, auditoria de dependências, busca de segredos e skill `pre-commit-review`; tarefas não podem passar para `completed` com verificações impeditivas pendentes.
- [ ] **T25 [P0]** Atualizar CHANGELOG conforme alterações efetivamente implementadas, com data/hora BRT, tipo e arquivos.

## Definition of Done

Jogador/Narrador pesquisa Loresheets e opções específicas de clã, escolhe benefícios independentes, recebe avaliação de elegibilidade e custo, adiciona à ficha dentro das regras da campanha e consulta a origem bibliográfica. XP e pontos de criação são consumidos uma única vez; referências e exceções são auditáveis; conteúdo secreto não é exposto; testes de autorização/consistência aprovados.

**Limitações:** esta SPEC não entrega seeds completas, não valida individualmente todas as obras e não implementa UI ou banco.

## Progresso de seeds — 2026-11-02

- [x] Gerar índice inicial de **78 referências de Loresheets** em `seeds/reference/loresheets-v5.json`, com 11 livros e páginas ordinais de PDF.
- [x] Adicionar validação de integridade e políticas que impedem tratar entradas não revisadas como benefícios selecionáveis.
- [ ] Completar inventário das publicações, revisar páginas impressas, extrair nomes/requisitos/efeitos/custos de cada nível independente e validar licença antes de criar seeds mecânicos utilizáveis.

**Nota:** T02/T07 seguem em progresso, não concluídos. Nenhuma Loresheet foi ativada automaticamente no aplicativo.
