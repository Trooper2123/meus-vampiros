# Tasks: Regras de criação de fichas VtM V5

## Status

- `[ ]` `pending`; `[~]` `in_progress`; `[!]` `blocked`; `[x]` `completed`.

## Phase 1: Fundação

- [x] **task-001**: Criar domínio e contratos V5
  - **Description**: Criar tipos, enums, presets, normalização, valores derivados e relatório estruturado.
  - **Acceptance Criteria**: Motor independente de UI/banco e compatível com JSON legado.
  - **Validation**: Testes unitários do domínio.
  - **Dependencies**: none
  - **Status**: completed

- [x] **task-002**: Implementar validações de vampiro jogável
  - **Description**: Validar atributos, habilidades, convicções/touchstones, clã, geração/BP, humanidade, disciplinas, predador, vantagens/falhas e idade.
  - **Acceptance Criteria**: Casos mínimos da spec retornam códigos estáveis.
  - **Validation**: `tests/vtm-v5-validation.test.ts`.
  - **Dependencies**: task-001
  - **Status**: completed

- [~] **task-003**: Migrar metadados comuns da ficha
  - **Description**: Adicionar tipo, criador, visibilidade e último relatório à tabela existente com defaults retrocompatíveis.
  - **Acceptance Criteria**: Migração idempotente e fichas existentes legíveis.
  - **Validation**: TypeScript e build.
  - **Dependencies**: task-001
  - **Status**: in_progress

## Phase 2: APIs e workflow

- [ ] **task-004**: Criar API de validação
  - **Description**: Validar ficha persistida com autenticação e autorização.
  - **Acceptance Criteria**: Relatório contém erros, avisos e derivados.
  - **Validation**: Testes de rota e build.
  - **Dependencies**: task-002, task-003
  - **Status**: pending

- [ ] **task-005**: Criar workflow de status
  - **Description**: Implementar submissão, aprovação, devolução, arquivamento e desativação.
  - **Acceptance Criteria**: Transições e permissões respeitam requisitos.
  - **Validation**: Testes de transição e autorização.
  - **Dependencies**: task-004
  - **Status**: pending

## Phase 3: Interface do vampiro jogável

- [ ] **task-006**: Integrar tipo, perfil e validação ao formulário
  - **Description**: Adicionar campos de criação, derivados, painel de relatório e submissão para revisão.
  - **Acceptance Criteria**: Erros bloqueiam submissão sem impedir salvar rascunho.
  - **Validation**: Teste manual, lint e build.
  - **Dependencies**: task-004, task-005
  - **Status**: pending

## Phase 4: PNCs e lacaios

- [x] **task-007**: Implementar presets e validação de PNCs
  - **Description**: Suportar PNC humano simples/templates e PNC vampiro simplificado/arquétipos.
  - **Acceptance Criteria**: Presets geram pools e campos mínimos válidos.
  - **Validation**: Testes unitários.
  - **Dependencies**: task-001
  - **Status**: completed

- [x] **task-008**: Implementar domínio de retentor, ghoul e Blood Bond
  - **Description**: Validar controle, domitor, disciplina nível 1, regente único e força 1-6.
  - **Acceptance Criteria**: Casos mínimos da spec possuem códigos estáveis.
  - **Validation**: Testes unitários.
  - **Dependencies**: task-001
  - **Status**: completed

- [ ] **task-009**: Criar interfaces especializadas de PNCs e lacaios
  - **Description**: Formulários rápidos para Mestre usando presets do domínio.
  - **Acceptance Criteria**: PNC humano por template pode ser criado em menos de um minuto.
  - **Validation**: Teste manual, acessibilidade e build.
  - **Dependencies**: task-007, task-008
  - **Status**: pending

## Phase 5: Auditoria e entrega

- [ ] **task-010**: Adicionar ledger e eventos de validação
  - **Description**: Registrar ajustes iniciais, XP e mudanças de status de forma auditável.
  - **Acceptance Criteria**: Cada ajuste automático possui origem e timestamp.
  - **Validation**: Testes de persistência.
  - **Dependencies**: task-005
  - **Status**: pending

- [ ] **task-011**: Validar e documentar a entrega
  - **Description**: Executar suíte, TypeScript, lint e build; atualizar changelog e resumo.
  - **Acceptance Criteria**: Sem erros relacionados e documentação sincronizada.
  - **Validation**: `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`.
  - **Dependencies**: task-006, task-007, task-008, task-010
  - **Status**: pending

## Summary

| Phase | Tasks | Total | Completed |
|---|---|---:|---:|
| Fundação | 001-003 | 3 | 2 |
| APIs e workflow | 004-005 | 2 | 0 |
| Interface | 006 | 1 | 0 |
| PNCs e lacaios | 007-009 | 3 | 2 |
| Auditoria e entrega | 010-011 | 2 | 0 |
| **Total** | **001-011** | **11** | **4** |
