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

## [2026-10-13] — Simplificação da projeção de duplicação

**Horário:** 02:12 BRT
**Tipo:** refactor
**Arquivos principais:** `lib/character-duplicate.ts`, `tests/character-duplicate-projection.test.ts`, `CHANGELOG.md`.

- Separadas projeções de traços, disciplinas, poderes, danos e seleção de predador em funções pequenas; reduzidos callbacks aninhados e centralizada allowlist de poderes/defaults. Mantidos campos permitidos, versão aplicada, remoção de dados privados e isolamento por clone; grupo regex sem captura desnecessária.
- Validação direcionada: 3 arquivos/24 testes aprovados, TypeScript e lint dos arquivos tocados sem erros. Incluídos casos de conteúdo privado, tipos inválidos, defaults, campos dinâmicos e ausência de referências compartilhadas. Relatório/IDs SonarQube não disponíveis localmente, solicitados ao usuário; não alegada análise Sonar ou resolução de todos os seus achados.

## [2026-10-13] — Correção das cadeias vulneráveis da CLI Vercel

**Horário:** 02:07 BRT
**Tipo:** fix | chore | docs
**Arquivos principais:** `package.json`, `pnpm-lock.yaml`, `package-lock.json`, `README.md`, `CHANGELOG.md`; evidências locais em .codex, fora do commit.

- Auditoria identificou as cadeias vulneráveis na CLI vercel, não referenciada por scripts/imports do projeto. Removida essa dependência desnecessária e sincronizadas as árvores/lockfiles pnpm e npm sem overrides forçados nem alteração das outras dependências diretas nesta rodada. @vercel/analytics preservado; documentação explica que eventual CLI de deploy local deve ser configurada separadamente e auditada.
- pnpm audit e npm audit atuais sem vulnerabilidades em qualquer severidade. Gate alto/crítico da auditoria resolvido; não é garantia absoluta de segurança nem conclusão das funcionalidades pendentes.
- Reinstalação pnpm com scripts desabilitados; após bloqueio de acesso a node_modules, repetida com permissão ampliada. Validação: 27 arquivos/344 testes aprovados, TypeScript/build aprovados, lint zero erros/seis avisos, diff-check e scan de segredos direcionados sem achados. Nenhum reset, banco externo ou commit executado; .codex segue ignorada.

## [2026-10-13] — Revalidação do candidato a commit

**Horário:** 02:01 BRT
**Tipo:** docs
**Arquivos principais:** `CHANGELOG.md`; review/tasks/metadados locais da SPEC, fora do commit conforme regra .codex.

- Reaplicada revisão pré-commit ao workspace: 27 arquivos/344 testes aprovados, TypeScript/lint/build aprovados (6 avisos). Auditoria pnpm atual: 43 achados (1 crítico, 20 altos, 17 moderados, 5 baixos); crítico tar ainda bloqueia junto aos altos.
- Role mestre resolvido; SQL futuro e QA desejável não bloqueiam escopo dev. .codex ignorada e fora do staging; staging vazio. Seleção final deve evitar deleções .kiro e artefatos; whitespace residual em pages/api/auth/me.ts registrado. Sem alterações de aplicação/dependências, reset ou commit nesta rodada.

## [2026-10-13] — Contexto das alterações de dependências

**Horário:** 01:58 BRT
**Tipo:** docs
**Arquivos principais:** `CHANGELOG.md`; contexto de alterações existentes em `package.json` e lockfiles.

- Motivo confirmado pelo usuário para alterações de shadcn/Vercel: erros de build motivaram a mudança de versões. Não realizadas novas alterações de dependências nesta confirmação; build já aprovado após remoção do import CSS incompatível.
- AWS SDK foi adicionado para uma tentativa de integração de banco posteriormente não continuada. Dependências S3 presentes não representam integração PostgreSQL entregue; planejamento de persistência externa permanece no backlog. Não alegada implementação operacional nem removidos pacotes nesta rodada.
- .codex é ignorada apenas no versionamento Git; arquivos continuam disponíveis localmente para leitura, planejamento e revisão. A regra não exclui a pasta do trabalho do agente nem apaga seu conteúdo.

## [2026-10-13] — Exclusão da pasta local .codex do commit

**Horário:** 01:52 BRT
**Tipo:** chore | docs
**Arquivos principais:** `.gitignore`, `AGENTS.md`, `CHANGELOG.md`.

- Pasta .codex ignorada e retirada do staging, por decisão do usuário. Renomes associados a .kiro também retirados do staging para não incluir exclusões acidentais. Arquivos locais preservados; nenhuma alteração de histórico ou commit executada.
- Regra registrada no AGENTS para futuras seleções de arquivos; documentação local da revisão não será adicionada ao commit.

## [2026-10-13] — QA visual definido como desejável

**Horário:** 01:51 BRT
**Tipo:** docs
**Arquivos principais:** `AGENTS.md`, `.codex/backlog/qa-visual-responsividade.md`, `.codex/backlog/backlog-mestre.md`, requirements/design/tasks/metadados/review da SPEC de fichas V5, `.codex/specs/character/tasks.md`, `CHANGELOG.md`.

- Registrada decisão do usuário: QA manual visual/acessibilidade/responsividade posterior e desejável, sem obrigatoriedade para commit atual. Planejamento transferido ao backlog e gate documental atualizado, sem alegar QA executado.
- Segurança/autorização, validações automatizadas e correção de vulnerabilidades críticas/altas continuam obrigatórias. Mudança exclusivamente documental; nenhum teste visual ou alteração de aplicação realizada.

## [2026-10-13] — Integração PostgreSQL adiada para backlog

**Horário:** 01:45 BRT
**Tipo:** docs
**Arquivos principais:** `AGENTS.md`, `.codex/backlog/integracao-postgresql.md`, `.codex/backlog/backlog-mestre.md`, requirements/design/tasks/metadados/review da SPEC de fichas V5, `.codex/specs/character/tasks.md`, `CHANGELOG.md`.

- Registrada decisão do usuário: dev somente em memória; conexão/integração operacional PostgreSQL e testes reais passam ao backlog, fora do gate dev atual. Schema/caminhos SQL existentes não são declarados prontos para produção; SQL não foi testado nesta rodada.
- Reclassificado achado alto de indisponibilidade SQL como escopo futuro, sem dispensar vulnerabilidades de dependências, QA ou demais critérios atuais. Nenhum reset, conexão externa ou alteração de aplicação realizada.

## [2026-10-13] — Restauração do papel de Narrador

**Horário:** 01:43 BRT
**Tipo:** fix | docs
**Arquivos principais:** `lib/campaigns.ts`, `tests/campaign-master-role.test.ts`, review/tasks/metadados da SPEC de fichas V5, `CHANGELOG.md`.

- Revertida troca indevida de mestre por modelo.md no claim Auth0 de isMaster; preservadas permissões por campanha e identificadores. Nenhuma substituição global de mensagens ou labels realizada.
- Sete testes específicos de claims aprovados; TypeScript e lint direcionado sem erros. Achado alto do role marcado resolvido na revisão; demais bloqueios de auditoria/SQL/QA permanecem.

## [2026-10-13] — Nova revisão pré-commit

**Horário:** 01:35 BRT
**Tipo:** docs
**Arquivos principais:** review/tasks/metadados da SPEC de fichas V5, `.codex/specs/character/tasks.md`, `CHANGELOG.md`.

- Reaplicada skill pre-commit-review com diff staged/unstaged, histórico e arquivos novos. 26 arquivos/337 testes aprovados, TypeScript e build aprovados, lint zero erros/seis avisos. Auditoria pnpm: 61 achados (1 crítico, 25 altos, 27 moderados, 8 baixos), distinta da auditoria npm histórica.
- Detectada troca indevida de role mestre por modelo.md em lib/campaigns.ts, além de mensagens/UI afetadas; registrada correção necessária, sem alterar aplicação nesta revisão. Mantidos bloqueios SQL/QA/itens e apontada cobertura incompleta no changelog de configurações/dependências preexistentes. Index/conjunto final ainda precisa seleção/revisão.
- Scan direcionado de segredos sem achados; somente env de exemplo rastreado. Diff-check geral identifica whitespace anterior; nenhum reset, banco externo ou commit executado. Veredito: não aprovar commit.

## [2026-10-13] — Reset obrigatório restrito ao provider em memória

**Horário:** 01:30 BRT
**Tipo:** docs
**Arquivos principais:** `AGENTS.md`, `.codex/specs/README.md`, `.codex/specs/_template/tasks.md`, requirements/design/tasks/review de fichas V5, `.codex/specs/character/design.md`, `CHANGELOG.md`.

- Esclarecida decisão do usuário: reset único ao iniciar implementação de SPEC aplica-se somente à memória, não a PostgreSQL persistente. Modelo/seeds/integridade documentados nesse escopo; nenhuma limpeza nesta atualização.
- Schema SQL é referência de paridade. Alterações externas exigem tarefa/autorização específica e proteção de dados; vedação de backfill para memória não dispensa preservação de dados persistentes. Integração SQL permanece separada e pendente, sem autorizar reset automático. Documentação sincronizada e diff-check direcionado validado; sem mudanças de aplicação.

## [2026-10-13] — Remoção do import CSS incompatível

**Horário:** 01:28 BRT
**Tipo:** fix | docs
**Arquivos principais:** `app/globals.css`, tasks/metadados/review da SPEC de fichas V5, `CHANGELOG.md`.

- Removido import inexistente shadcn/tailwind.css; mantidos Tailwind, tw-animate-css e tokens/tema/variante dark locais sem reinstalar dependências. Nenhuma alteração no provider de banco.
- Build e TypeScript aprovados, lint zero erros/seis avisos, diff-check aprovado. QA visual não executado; auditoria/SQL/QA continuam bloqueando commit. Falha anterior de build resolvida nesta rodada.

## [2026-10-13] — Atualização do provider de personagens em memória

**Horário:** 01:23 BRT
**Tipo:** fix | docs
**Arquivos principais:** `lib/dev-db.ts`, `tests/dev-db-schema.test.ts`, `tests/awake-route.test.ts`, `tests/chronicle-nights.test.ts`, design/tasks/metadados/review da SPEC de fichas V5, `CHANGELOG.md`.

- Alinhados defaults de revisão/estado/XP ao schema SQL; seeds passam a conter estado de sessão canônico. Leitura projeta danos e recursos/XP persistidos sem expor referências JSON mutáveis; entrada também clonada. Removido helper obsoleto de atualização escalar sem callers.
- Verificadas referências de campanha/ficha na criação de personagens, itens e ledger. Exclusão respeita proprietário, cascade de itens/ledger/comandos e bloqueio por histórico Awake. Providers globais separados permanecem; não alegada equivalência completa de todos os módulos ou integração PostgreSQL.
- Validação: 26 arquivos/337 testes aprovados; TypeScript e lint sem erros (6 avisos); diff-check/scan direcionado sem achados. Build bloqueado por import shadcn/tailwind.css; audit npm 40 achados (1 crítico/36 altos). DATABASE_URL ausente; nenhum novo reset, DDL ou alteração em produção. Revisão mantém commit bloqueado.

## [2026-10-13] — Verificação dos erros registrados no backlog

**Horário:** 01:14 BRT
**Tipo:** docs
**Arquivos principais:** `.codex/backlog/erros-a-validar`, `CHANGELOG.md`.

- Classificados erro PostgreSQL 42P18 histórico e seis avisos ESLint; blocos duplicados não contados como achados distintos. Consulta antiga de recursos não existe no código atual; endpoint legado bloqueado e novo fluxo utiliza casts JSON explícitos. Validação PostgreSQL ainda pendente, sem alegar correção reproduzida nesse provider.
- Reexecutado lint direcionado: zero erros/seis avisos. Testes direcionados de recursos: 2 arquivos/35 casos aprovados, com aviso de encerramento Vite. Registradas recomendações de fallback estável para useMemo e separação de exports de desenvolvimento, sem alteração de aplicação nesta rodada.

## [2026-10-13] — Revalidação das pendências de fichas V5

**Horário:** 00:56 BRT
**Tipo:** docs
**Arquivos principais:** `.codex/specs/vtm-v5-fichas-e-inicio-de-noite/review.md`, `tasks.md`, `tasks.meta.json`, `CHANGELOG.md`.

- Reexecutados tipos, lint e testes: TypeScript aprovado, zero erros/seis avisos de lint, 25 arquivos/332 testes aprovados. Auditoria na árvore modificada do workspace: 40 achados (1 baixo, 2 moderados, 36 altos, 1 crítico em tar). Não alteradas dependências nesta revalidação.
- Build reexecutado e reprovado: import `shadcn/tailwind.css` não existe na versão instalada no workspace; regressão registrada como bloqueio, sem alteração automática de estilos/dependências.
- Verificada configuração efetiva sem revelar valores: DATABASE_URL ainda ausente nos arquivos Next carregáveis/processo; solicitada localização e confirmação de banco exclusivo dev/test. Nenhum banco externo acessado, resetado ou alterado. Integração PostgreSQL permanece bloqueada.
- Referência de clãs agora disponível em `.codex/specs/vtm-v5-cla/`; corrigidos bloqueios documentais de arquivo ausente sem afirmar catálogo implementado/conferido. Pendências de ingresso/idempotência de itens e QA mantidas. Revisão não aprova commit.

## [2026-10-12] — Implementação parcial de fichas V5 e início de noite

**Horário:** 23:42 BRT
**Tipo:** feat | fix | chore | docs
**Arquivos principais:** `lib/character-commands.ts`, `lib/character-xp.ts`, `lib/character-specialties.ts`, `lib/character-resources.ts`, `lib/character-rolls.ts`, `lib/chronicle-nights.ts`, `lib/vtm-v5/session-state.ts`, `lib/vtm-v5/specialties.ts`, `lib/vtm-v5/dice-provider.ts`, `lib/vtm-v5/dice-evaluator.ts`, `lib/db.ts`, `lib/dev-db.ts`, `lib/characters.ts`, `lib/auth/authorization.ts`, rotas de personagens/campanhas/posses, formulário/resumo de personagens, `components/master-panel.tsx`, componentes de especialidades/recursos/rolagens/Awake, `package.json`, `package-lock.json`, testes e specs de fichas/predação.

- Implementados concessões e compra de especialidades por 3 XP com aprovação, XP incremental por Narrador (individual/lote), recursos canônicos com danos separados e comandos auditáveis com revisão, idempotência e transação. Novas interfaces integradas à ficha e campanha; revalidação SWR após salvar/criar/enviar evita revisão obsoleta.
- Implementados pools e resultados de dados exclusivamente no servidor, especialidade única, dados de Fome e privacidade de rolagens. Awake valida o lote antes de sortear, aplica Rouse/Fome/torpor atomicamente e reutiliza operações confirmadas; rollback não conserva amostras não confirmadas.
- Corrigidos autorização/origem de itens, revogação do acesso de Narrador após desvínculo, XP forjado no formulário, escrita genérica de predador/override, vazamento de pendências narrativas, edição de ficha aprovada sem revisão e corrida na aprovação. Preservados danos em alterações de máximos; endpoint legado de recursos não permite bypass.
- Integrada biblioteca MIT `@dice-roller/rpg-dice-roller` 5.5.0 com gerador criptográfico no servidor, evitando vulnerabilidade alta da 5.5.1. Atualizado Next para 16.3.8 e consultada documentação instalada. Auditoria atual: 42 achados (7 moderados, 33 altos, 2 críticos), sem entrada vulnerável de Next ou biblioteca de dados; gate permanece bloqueado por dependências transitivas existentes.
- Validação: 25 arquivos/332 testes aprovados, TypeScript sem erros, lint sem erros (6 avisos), build aprovado. Scan direcionado de padrões de segredos sem achados; não equivale a garantia absoluta. Integração PostgreSQL descartável e QA visual/acessibilidade não executadas. Referência de clãs, efeitos completos de predadores, encaminhamento de itens no ingresso e deduplicação de criação de itens permanecem pendentes. SPEC não concluída e nenhum commit recomendado.

## [2026-10-12] — Preparação para execução de fichas V5/início de noite

**Horário:** 22:01 BRT
**Tipo:** chore
**Arquivos principais:** `scripts/prepare-v5-development.mjs`, `.codex/specs/vtm-v5-fichas-e-inicio-de-noite/tasks.md`, `.codex/specs/vtm-v5-fichas-e-inicio-de-noite/design.md`, `CHANGELOG.md`.

- Confirmada configuração efetiva sem conexão externa/produção. Reset único em processo descartável do provider de memória; schema atual carregado, seeds ampliados para 8 fichas/3 campanhas, dois perfis de Narrador/jogador e casos de independência/Fome máxima/estaca/torpor. Integridade validada.
- Nenhum banco externo, autenticação externa ou memória de servidor aberto apagado. Novos schemas serão aplicados por módulo sem repetir limpeza. Task-004 iniciada após o registro da preparação.

## [2026-10-12] — Regra de itens antes do vínculo com mesa

**Horário:** 21:52 BRT
**Tipo:** docs
**Arquivos principais:** `.codex/specs/vtm-v5-fichas-e-inicio-de-noite/verification-items-xp.md`, `requirements.md`, `design.md` e `tasks.md` nessa pasta; `CHANGELOG.md`.

- Registrada decisão do usuário: itens de ficha sem mesa podem permanecer em memória e ser encaminhados à aprovação do Narrador quando a ficha ingressar efetivamente em uma mesa.
- Reclassificados os achados ITEM-005/006: campanha nula e rascunho em memória são permitidos; as lacunas são encaminhamento posterior ausente e descarte prematuro de rascunhos. Mantidas validações de autoria/vínculo, origem jogador, estado pendente, idempotência e feedback de envio.
- Atualização exclusivamente documental; nenhum fluxo de aplicação, banco ou política de XP alterado.

## [2026-10-12] — Planejamento de fichas V5 e verificação de itens/XP

**Horário:** 19:24 BRT
**Tipo:** docs
**Arquivos principais:** `.codex/specs/vtm-v5-fichas-e-inicio-de-noite/spec.md`, `requirements.md`, `design.md`, `tasks.md`, `tasks.meta.json` e `verification-items-xp.md` nessa pasta; `CHANGELOG.md`.

- Criada spec baseada em `.codex/backlog/12102026`, com os cinco P0: especialidades, clãs completos, aplicação de predadores, recursos de sessão e Awake. Inclui contratos propostos, efeitos por origem, revisão concorrente, autorização, idempotência e testes.
- Planejadas 20 tarefas com dependências; referência de clãs não localizada e gate de segurança explicitamente bloqueados. Nenhuma implementação nova, reset, schema ou seed de banco externo executados para a autoria documental; preparação única obrigatória permanece como tarefa futura.
- Verificados em paralelo criação/concessão/aprovação de itens e concessão de XP. Registradas falhas de autorização, origem de itens forjável, aprovação/schema/provider divergentes, XP editável pelo proprietário, fontes econômicas inconsistentes, risco de perda de concessões concorrentes e falhas de feedback.
- Reproduções locais em memória/handler com doubles e testes adjacentes executados: itens 21 testes, XP 16 testes, com sobreposição. Esses testes não cobrem integralmente os fluxos e não constituem aprovação. Não realizadas correções de código, chamadas a banco externo ou validação visual/Auth0 real.

## [2026-10-12] — Continuação de personagens independentes e atributos secundários

**Horário:** 18:54 BRT
**Tipo:** feat
**Arquivos principais:** `lib/characters.ts`, `lib/character-duplicate.ts`, `lib/dev-db.ts`, `lib/vtm-v5/secondary-attributes.ts`, `lib/vtm-v5/predator-types/apply.ts`, `lib/predator-types.ts`, `app/api/characters/`, `app/characters/`, `components/duplicate-character-button.tsx`, `components/character-summary/`, `components/predator-types/player-predator-selector.tsx`, `tests/character-independent*.test.ts`, `tests/character-predator-removal.test.ts`, `tests/character-resource-limits.test.ts`, `tests/vtm-v5-status-route.test.ts`, `tests/vtm-v5-validation-route.test.ts`, `.codex/specs/character/`, `.codex/specs/vtm-v5-character-rules/`.

- Duplicação de vampiros jogáveis próprios como rascunhos independentes: novo UUID, proprietário autenticado, recursos e escolhas mecânicas preservados; sem dados privados, permissões, sessões ou históricos. Lista agrupada por vínculo/arquivamento.
- Vitalidade máxima, Vontade máxima e Humanidade inicial calculadas e persistidas no backend, com fórmulas/modificadores; prévia no formulário e máximos nas trilhas do resumo. Edição não recupera recursos nem apaga danos.
- Troca/remoção de predador desfaz o modificador anterior sem acumular efeitos nem restaurar perdas posteriores de Humanidade. Remoção exige propriedade e rascunho.
- Correções de segurança: validação de entradas/UUID, propriedade na edição, proteção de overrides do narrador, resposta ao jogador sem campos privados e limites inteiros de recursos calculados no servidor. Fichas independentes válidas podem ser concluídas pelo proprietário.
- Vínculo/desvínculo direto e exclusão física pela API bloqueados com 409 enquanto faltam políticas de retenção/aprovação e estado autoritativo de sessão ativa. Criar ficha já vinculada exige participação prévia na campanha.
- Preparação única em processo isolado do banco descartável em memória, sem `DATABASE_URL`: reset, schema em memória existente, seeds de 2 fichas/1 campanha e integridade validados. Nenhum banco externo ou memória de servidor aberto foi apagado; nenhum schema PostgreSQL externo foi aplicado.
- Testes funcionais/de segurança, TypeScript, lint e build executados. Auditoria encontrou 73 achados preexistentes nas dependências (6 críticos, 50 altos, 17 moderados), incluindo Next.js; conclusão das tarefas bloqueada, sem recomendar commit. Revisão e limitações em `.codex/specs/character/review.md`.

## [2026-10-12] — Assistência na distribuição da ficha

**Horário:** 14:04 BRT
**Tipo:** feat, fix
**Arquivos principais:** `app/characters/character-form-client.tsx`, `lib/vtm-v5/creation-guidance.ts`, `lib/vtm-v5/normalize.ts`, `lib/vtm-v5/validation.ts`, `tests/vtm-v5-creation-guidance.test.ts`

- Incluídas instruções contextuais e contadores de pontos em atributos, habilidades, disciplinas, recursos, convicções, vantagens e defeitos.
- Adicionados perfis rápidos de habilidades com bloqueio de níveis incompatíveis e proteção contra excesso em atributos e disciplinas.
- Corrigida a validação para contabilizar os níveis reais de vantagens e defeitos, em vez da quantidade de registros.

---

## [2026-10-12] — Tipos de ficha por perfil

**Horário:** 13:52 BRT
**Tipo:** fix
**Arquivos principais:** `app/create-characters/page.tsx`, `app/characters/character-form-client.tsx`, `app/api/characters/route.ts`, `lib/vtm-v5/types.ts`, `tests/character-type-access-route.test.ts`

- Limitada a criação do jogador aos tipos Vampiro e Retentor ou carniçal.
- Mantidos NPC humano e NPC vampiro somente para Mestres, com proteção adicional na API contra requisições manipuladas.
- Adicionados seis cenários automatizados para validar as permissões de criação por perfil.

---

## [2026-10-12] — Hidratação do estado de autenticação

**Horário:** 13:45 BRT
**Tipo:** fix
**Arquivos principais:** `components/ui/useAppUser.tsx`

- Mantido o mesmo estado inicial de carregamento no servidor e na primeira renderização do navegador durante o bypass de autenticação local.
- Tornada incondicional a chamada ao hook do Auth0, eliminando a violação das regras de hooks.

---

## [2026-10-12] — Spec de tipos de predação V5

**Horário:** 13:35 BRT
**Tipo:** docs
**Arquivos principais:** `.kiro/specs/vtm-v5-predator-type/`

- Definidos requisitos, arquitetura, persistência, APIs, segurança e testes para os 28 tipos de predação referenciados.
- Separada a entrega entre pacote de visão do jogador e pacote de visão do Mestre sobre um núcleo compartilhado.
- Planejada a implementação em 16 tarefas com dependências, critérios de aceitação e validações próprias.

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
