# SPEC-RPG-021 — Plano de implementação

**Status da SPEC:** proposed
**Status da implementação:** not_started
**Branch:** develop
**Escopo deste commit:** documentação apenas; nenhum código, schema ou teste executado.

## Preparação e compatibilidade

- [ ] **T01 [P0]** Inspecionar schema real de Antecedentes, `characters`, campanhas, Coteries, projetos e serviços de rolagem; localizar todos os leitores de Backgrounds.
- [ ] **T02 [P0]** Verificar a implementação real de `project_stakes` e reutilizar seu compromisso como bloqueio; evitar desconto duplicado.
- [ ] **T03 [P0]** Localizar fluxo de início/fim da noite, sessões, Atualizações da Mesa e eventos em tempo real; integrar, não recriar.
- [ ] **T04 [P0]** Registrar destino de testes antes da alteração do banco: `DATABASE_URL` apontando somente para PostgreSQL de desenvolvimento isolado; nunca usar produção/homologação compartilhada. Estratégia: migrations reproduzíveis e seeds em banco de teste descartável, sem limpeza automática. Rollback por migration de reversão específica, após verificar dados.

## Domínio e persistência

- [ ] **T05 [P0]** Modelar `ResourceLock`, estados, duração em noites/sessões, políticas de liberação, visibilidade e vínculo com Project Stake.
- [ ] **T06 [P0]** Implementar migrations/Drizzle em esquema compatível com a estrutura real e índices de bloqueios ativos/eventos únicos.
- [ ] **T07 [P0]** Implementar transações e concorrência por recurso para impedir bloqueio acima do saldo.
- [ ] **T08 [P0]** Implementar API/serviço de disponibilidade derivada; adaptar consumidores de Backgrounds, incluindo rolagens e alocação em projetos.
- [ ] **T09 [P0]** Implementar criação/edição/prorrogação/liberação autorizadas, idempotência e histórico persistente.

## Tempo de crônica e notificações

- [ ] **T10 [P1]** Integrar avanço explícito de noite e conclusão de sessão à contagem, com deduplicação e configuração de contar unidade atual.
- [ ] **T11 [P1]** Executar expiração por liberação automática ou confirmação; manter `AWAITING_RELEASE` indisponível.
- [ ] **T12 [P1]** Criar ou reutilizar feed `Atualizações da Mesa`, leituras e avisos de 1 unidade restante, prazo atingido, prorrogação e liberação.
- [ ] **T13 [P1]** Implementar filtro de visibilidade pública/parcial/oculta no backend e DTOs, inclusive nos eventos de tempo real.

## Interfaces

- [ ] **T14 [P1]** Formulário exclusivo do Narrador para Background, pontos, origem, descrição pública/privada, duração, política e visibilidade.
- [ ] **T15 [P1]** Ficha: pontos totais/bloqueados/disponíveis e progresso temporal; respeitar informações secretas.
- [ ] **T16 [P1]** Painel do Narrador com bloqueios ativos, pendências de liberação e histórico.
- [ ] **T17 [P1]** Integrar bloqueios de Coterie ao mesmo cálculo de disponibilidade sem duplicar consumo.

## Testes e aceite

- [ ] **T18 [P0]** Testes unitários de saldo, travas simultâneas, estados, durações e alterações de prazo.
- [ ] **T19 [P0]** Testes de integração de concurrency, sessão duplicada/reaberta, noite avançada, término automático e confirmação manual.
- [ ] **T20 [P0]** Testes de autorização: 401, 403, IDOR/BOLA, acesso entre campanhas, escalada jogador→Narrador, payload malicioso e vazamento de segredo.
- [ ] **T21 [P1]** Testes de contrato de notificações, filtros de privacidade, avisos não duplicados e isolamento de Coterie.
- [ ] **T22 [P0]** Executar revisão de segurança, testes, TypeScript, lint, auditoria de dependências, detecção de segredos e skill `pre-commit-review`; registrar resultados. Não marcar `completed` se bloqueadores críticos/altos ou validações obrigatórias não realizadas.
- [ ] **T23 [P0]** Atualizar `CHANGELOG.md` com data/hora BRT, tipo `feat/docs`, arquivos e escopo real implementado antes de commitar alterações de código; não confundir SPEC documental com feature entregue.

## Definition of Done

Mecânica implementada quando o Narrador consegue criar e encerrar restrições, disponibilidade calculada é respeitada nas fichas/rolagens/projetos, duração avança exclusivamente por eventos válidos da crônica/sessões, atualizações chegam aos destinatários autorizados sem repetição, e testes funcionais e de segurança são aprovados.

**Atenção:** os campos, endpoints e tabelas em `design.md` são propostas sujeitas à conferência do repositório, não evidência de implementação existente.
