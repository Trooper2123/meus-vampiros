# SPEC-RPG-022 — Backlog de implementação

**Status:** proposed · **Implementação:** not_started · **Branch:** develop

## Preparação

- [ ] **T01 [P0]** Validar `npc_definitions`, `campaign_npcs`, `NPC_TEMPLATES`, `lib/npc-store.ts`, `NpcData` e a estrutura real de NPCs no banco; identificar componentes existentes a reutilizar.
- [ ] **T02 [P0]** Ler `UI-GUIDE.md`, `design-system.md` e padrão do botão **Adicionar habilidade**, sem introduzir design paralelo.
- [ ] **T03 [P0]** Definir política de licenciamento e publicação: conteúdo bibliográfico, perfis originais, estatísticas e imagens; não publicar cópias integrais não autorizadas.
- [ ] **T04 [P0]** Definir inventário de livros, referências/páginas, integridade dos dados e processo de revisão humana; estabelecer amostra inicial de personagens com fonte exata.
- [ ] **T05 [P0]** Documentar destino de testes: PostgreSQL de desenvolvimento isolado confirmado (não registrar valor de `DATABASE_URL`); migration/seed reproduzíveis e rollback específico. Não limpar dados automaticamente.

## Catálogo e domínio

- [ ] **T06 [P0]** Estender catálogo de templates atual ou criar estrutura mínima adicional para fontes, status editorial, direitos de uso, completude e classificação.
- [ ] **T07 [P0]** Adicionar tipagem/validação dos itens; não inferir valores mecânicos ausentes.
- [ ] **T08 [P0]** Criar seed inicial revisado de fontes autorizadas, com inventário de cobertura e indicação de lacunas.
- [ ] **T09 [P0]** Implementar busca paginada e filtros combinados, com limites e consultas seguras.
- [ ] **T10 [P0]** Implementar clonagem de template aprovado para NPC da campanha, reutilizando o fluxo existente e garantindo isolamento por instância.
- [ ] **T11 [P0]** Preservar proveniência, revisão do catálogo e marcação de adaptação sem expor conteúdo não licenciado.
- [ ] **T12 [P1]** Integrar personagem adicionado ao ciclo de vida existente (edição, arquivamento, mesa e sessão).

## Interface

- [ ] **T13 [P1]** Adicionar aba/rota **Biblioteca dos Livros** no catálogo de NPCs, com busca e filtros.
- [ ] **T14 [P1]** Implementar card, prévia de dados e fonte bibliográfica com fallback textual para PDF inacessível.
- [ ] **T15 [P1]** Implementar botão **Adicionar à mesa** e modal de escolha da mesa/visibilidade, inspirado em **Adicionar habilidade**.
- [ ] **T16 [P1]** Sinalizar ficha completa/parcial/narrativa e necessidade de revisão manual sem gerar estatísticas arbitrárias.

## Qualidade e segurança

- [ ] **T17 [P0]** Testar 401/403, IDOR/BOLA, payload forjado, campanha alheia, segredo de antagonista, conteúdo não autorizado e publicação acidental de PDFs.
- [ ] **T18 [P0]** Testar busca, paginação, clonagem, cópias isoladas, idempotência e fidelidade de proveniência.
- [ ] **T19 [P1]** Testar acessibilidade, responsividade e UX de estados vazios/carregamento; registrar pendências.
- [ ] **T20 [P0]** Executar testes relevantes, tipos, lint, auditoria de dependências, análise de segurança e skill `pre-commit-review`; manter status blocked se houver falhas impeditivas.
- [ ] **T21 [P0]** Atualizar CHANGELOG com data/hora BRT, tipo, escopo efetivo e arquivos alterados na implementação.

## Definition of Done

Um Narrador autorizado consegue pesquisar NPCs/antagonistas com origem clara, visualizar somente informações e mecânicas verificadas, selecionar **Adicionar à mesa** e receber instância isolada e editável na campanha, sem alterar o template e sem expor informações privadas ou conteúdo não licenciado.

**Escopo desta entrega documental:** apenas SPEC. Nenhuma migração, seed ou alteração de aplicação executada.
