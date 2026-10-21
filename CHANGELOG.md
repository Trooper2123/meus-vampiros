# CHANGELOG — Ledger Command

Registro cronológico de todas as alterações relevantes implementadas no projeto.

## 2026-10-20 22:45 BRT - chore - Biblioteca de PDFs versionada via Git LFS
- Arquivos principais: `.gitattributes`, `docs/books/*.pdf`, `docs/books/README.md`.
- Livros previamente staged passam a usar Git LFS, incluindo dois PDFs maiores que 100 MB, para permitir envio ao GitHub e manter os caminhos usados pelas fontes autenticadas. Checkout e deploy precisam baixar os objetos LFS; nenhum PDF foi alterado ou removido do diretório local.
- Commit/push solicitados pelo usuário após o aviso dos bloqueios globais. Mantidos os resultados anteriores: testes do recorte/lint/audit aprovados; tipos/build e testes legados pendentes. Nenhum banco, schema, seed, arquivo de ambiente ou planejamento local será publicado neste commit. Arquivos de código da persistência PostgreSQL já descritos nas entradas anteriores estão incluídos.

## 2026-10-20 22:14 BRT - feat - Revisão dos sete clãs V5 e condições de rolagem
- Arquivos principais: `lib/vtm-v5/clans.ts`, `clan-rules.ts`, `clan-mechanics.ts`, `rule-profile.ts`, `lib/character-clans.ts`, `lib/character-rolls.ts`, `lib/character-roll-history.ts`, rotas de clã/rolagens/campanha, componentes de clã/condições/rolagens/histórico e `UI-GUIDE.md`.
- Substituídos os placeholders de Banu Haqim, Hecata, Lasombra, Ministério, Ravnos, Salubri e Tzimisce por nomes originais/traduções, descrições, mecânicas e referências separadas. Conferidos PDFs locais de Camarilla, Cults of the Blood Gods, Chicago by Night, Anarch e Companion; páginas impressas/PDF e seções ficam visíveis com links autenticados pela whitelist existente. Strings bane/compulsion preservam compatibilidade; criação, ficha e campanha compartilham a mesma base, com fallback de identificação para fichas legadas.
- Narrador da própria mesa ativa/remove condições em comando com revisão, idempotência e ledger existentes. Penalidades de compulsão, luz intensa e detecção eletrônica são calculadas no servidor antes da distribuição de Fome; comunicação Lasombra exige contexto do Narrador e teste de Tecnologia com dificuldade 2 + severidade do perfil de sangue da campanha. Exceções aplicáveis à compulsão exigem Narrador e não dispensam Banu Haqim/Lasombra por mera tentativa. Histórico registra penalidades/fontes sem revelar dificuldade reservada nem alterar dados originais. Troca de clã limpa condições antigas; condições de outra mesa/clã são ignoradas.
- Regras de alimentação, terceiro olho, sol e repouso estão completas para consulta, incluindo exceção Banu Haqim ao beber Salubri, dados de severidade/10s do Ravnos e dano agravado à Vontade Tzimisce. Esses eventos não existem como fatos verificáveis no motor atual: consequências permanecem conduzidas pelo Narrador nos recursos da ficha. Nenhuma ativação automática por falha bestial, dano automático por leitura, DDL, seed, migração ou escrita de teste no PostgreSQL. Novos metadados opcionais usam game_state/rolls já existentes, compatíveis com dados anteriores.
- Segurança: condição restrita ao Narrador vinculado, validação de flags/contexto, cache privado e projeção sem orientações internas; POST de rolagem reutiliza validação de origem/JSON com limite de corpo. Testes cobrem 401/403, IDOR, parâmetros forjados, sigilo, perfil CORE/Companion, condições, exceções, histórico e reenvio seguro da UI.
- Validação conjunta desta entrega e do ajuste dev abaixo: 15 arquivos aprovados com 260 testes. Verificação ampliada de 16 arquivos terminou com 272 testes aprovados e 11 falhas antigas em `blood-potency.test.ts` (expectativas de tabela anterior e integração que ainda espera provider em memória); módulo de cálculo de Potência não foi alterado. Lint global com exclusão de artefatos/planejamento local aprovado com três warnings preexistentes; lint focado incluindo testes aprovado; audit com zero vulnerabilidades e busca de segredos sem achados no recorte. Tipos/build globais seguem bloqueados por testes legados; compilação do build aprovada. QA manual visual e integração de escrita PostgreSQL não executados; SPEC local permanece blocked.

## 2026-10-20 22:14 BRT - fix - Perfil mestre em dev e restauração dos seletores
- Arquivos principais: `lib/auth0.ts`, `components/character-summary/character-clan.tsx`, `components/predator-types/player-predator-selector.tsx`, `app/api/predator-types/route.ts`, `tests/dev-master-profile.test.ts`, `tests/selectors-saved-state.test.ts` e teste da rota de predação.
- Sessão sintética `dev|local` agora inclui a claim mestre reconhecida pela aplicação, mesmo sem possuir mesas. Produção continua usando exclusivamente a sessão Auth0 real, sem identidade/claim injetada. O papel global não substitui autorização sobre uma mesa ou ficha.
- Corrigida inicialização anterior à resposta assíncrona: clã, disciplinas 2+1, preferência/categoria/Caitiff e predação, especialidade, disciplina e escolhas adicionais passam a restaurar o estado salvo. Revalidação não sobrescreve edição local nem ressuscita predação explicitamente removida. API retorna somente campos públicos da seleção salva com cache privado/no-store.
- Verificação local sem mutações: consulta PostgreSQL em transação somente leitura confirmou zero mesas e três fichas dev; nas três fichas, APIs responderam 200 com 16 clãs/41 predações. `/campaigns/new` e `/master/vantagens-defeitos` responderam 200 sem redirecionamento após a correção. Autorização de produção, role ausente e sessão ausente cobertas por testes; nenhuma mesa/seed/ownership criado ou alterado. Resultados e bloqueios globais registrados na entrada acima.

## 2026-10-20 19:57 BRT - feat - Seleção de vantagens e defeitos na ficha
- Arquivos principais: `components/character-form/trait-selector-row.tsx`, `traits-editor.tsx`, `app/characters/character-form-client.tsx`, `app/api/merits-flaws/route.ts`, `lib/vtm-v5/trait-options.ts`, `tests/trait-selector-row.test.ts` e `tests/trait-options-route.test.ts`.
- Nome e descrição abrem modal no padrão dos poderes de Disciplinas, com todas as opções do tipo e pesquisa PT/EN sem distinção de acentos por nome, efeito, requisitos e fonte. Seleção preenche nome, pontos e descrição. Adicionar vantagem/defeito cria linha e abre diretamente a modal; registros personalizados são permitidos na ficha, inclusive com catálogo indisponível, sem publicação global.
- Concessões preservam IDs, nome e pontos mínimos; itens somente para referência não são selecionáveis. Cancelar preserva valores confirmados e descarta pontuação inválida do rascunho para não bloquear o formulário da ficha. API exige sessão, valida os filtros e projeta somente dados públicos do catálogo com cache privado/no-store; texto escapado pelo React, sem novos privilégios, schema, seed ou escrita direta no PostgreSQL.
- Validação: 37 testes aprovados em cinco arquivos; lint focado de produção/testes e auditoria de dependências aprovados, zero vulnerabilidades. Build compilou, mas build/TypeScript global falharam em testes legados da migração PostgreSQL; nenhuma falha reportada nos arquivos deste recorte. Lint global interrompido após execução prolongada incluindo backups de build não ignorados pela configuração. Revisão local de segurança e busca de segredos sem achados no recorte; `git diff --check` aprovado. Vitest encerrou com código 0 e aviso de servidores Vite demorando a fechar. QA manual e integração de salvamento no PostgreSQL não executados; SPEC local bloqueada pelos gates globais.

## 2026-10-19 22:30 BRT - feat - Pontuação de predação definida pelo jogador
- Arquivos principais: `lib/vtm-v5/predator-types/mechanics.ts`, `supplements.ts`, `components/predator-types/player-predator-selector.tsx`, `tests/predator-defined-rating.test.ts` e testes existentes de suplementos/rotas.
- Exclusão de Presa: moradores locais de Assassino de Estrada deixa de bloquear a escolha por ausência de pontuação na fonte. O jogador define de 1 a 5 pontos, dentro do limite atual dos traços da ficha; valor registrado em optionCodes e aplicado pelo fluxo existente de efeitos com origem. Nenhum custo foi atribuído automaticamente ao livro.
- Validação no servidor exige escolha única, inteira e dentro dos limites, recusando opção desconhecida, duplicada ou ausente. Habilitação da fonte pelo Narrador e demais bloqueios de regras incompletas preservados; sem novo campo de API, schema, seed ou acesso de escrita ao banco.
- Validação: 136 testes aprovados em cinco arquivos, cobrindo rota, UI, limites/parâmetros forjados, alteração/reaplicação sem duplicação e remoção que preserva defeitos pessoais. ESLint focado e `git diff --check` aprovados. Integração PostgreSQL e QA manual no navegador não executados; gates globais da migração permanecem pendentes.

## 2026-10-19 22:20 BRT - feat - Pesquisa de vantagens e defeitos
- Arquivos principais: `app/master/vantagens-defeitos/page.tsx`, `components/merits-flaws-research.tsx`, `lib/vtm-v5/merits-flaws-catalog.json`, `app/campaigns/page.tsx`, `UI-GUIDE.md` e dois arquivos de testes `merits-flaws-research*`.
- Importados integralmente os 209 registros do HTML fornecido: qualidades, defeitos, antecedentes e traços de domínio. Pesquisa PT/EN sem distinção de acentos, filtros por tipo/categoria/pontos/elegibilidade/livro, paginação de 30 registros, limpeza de filtros, regras gerais, XP a partir de zero e fontes visíveis. Registros não selecionáveis e escolhas sem pontos permanecem identificados; não há compra ou aplicação automática de bônus.
- Página protegida por sessão e autorização de Narrador no servidor; atalho em nova guia na listagem de mesas. Conteúdo exibido como texto escapado, sem executar scripts do HTML. Nenhuma alteração de schema, seed ou escrita no PostgreSQL.
- Validação: 11 testes aprovados, incluindo acesso não autenticado/sem papel, filtros combinados, paginação, escolhas especiais e texto malicioso escapado; paridade integral com o HTML confirmada. ESLint focado e auditoria completa de dependências aprovados (zero vulnerabilidades). Checagem global TypeScript segue bloqueada por testes legados da migração PostgreSQL, sem erros nos arquivos desta entrega; lint global da revisão anterior percorreu backups `.next-backup-*` e falhou. Build e QA em navegador não executados; SPEC local permanece com validação global bloqueada.

## 2026-10-19 22:05 BRT - chore - Atualização do catálogo de disciplinas
- Arquivos principais: `lib/vtm-v5/research-catalog.json`, `tests/master-research-catalog.test.ts`, `tests/discipline-powers-route.test.ts`.
- Importadas 376 entradas do arquivo local `codex/catalogo-disciplinas-vtm-v5 (1).html`, com nomes e campos descritivos em inglês, categorias e status em português e referências de livro/página preservadas. Mantidos os 372 IDs anteriores; adicionadas as cerimônias Fortezza Sindonica, Knit the Veil e Death Rattle, além de Squirm como captura enviada, excluído da seleção de poderes publicados.
- Validação: 26 testes focados aprovados; paridade dos oito campos descritivos de todas as entradas com o HTML e preservação dos 372 IDs confirmadas; ESLint dos consumidores e `git diff --check` aprovados. O Vitest sinalizou atraso ao encerrar servidores Vite, mas terminou com código 0. Sem DDL, seed ou escrita direta no PostgreSQL; o catálogo usa a sincronização já existente na consulta do Narrador.

## 2026-10-19 00:51 BRT - fix - Remoção de variáveis não utilizadas
- Arquivos principais: `app/api/campaign-events/route.ts`, `lib/character-commands.ts`.
- Removidos campos não usados da desestruturação do PATCH e o import `randomUUID` sem referência. Nenhum comportamento de atualização foi alterado.
- Validação: ESLint nos dois arquivos aprovado; `git diff --check` aprovado. Warnings de Fast Refresh permanecem fora deste recorte.

## 2026-10-19 00:10 BRT - fix - Correções focadas dos achados do Sonar
- Arquivos principais: `app/globals.css`, `app/api/characters/[id]/campaign/route.ts`, `app/api/characters/[id]/disciplines/route.ts`, `components/campaign-calendar/blood-policy-settings.tsx`, componentes de resumo de personagem e calendário, `lib/blood-policy.ts` e `lib/vtm-v5/presets.ts`.
- Removidas declarações CSS duplicadas, corrigidos anúncios acessíveis de status, chave de lista e marcação de botão; removido `await` sem Promise e simplificadas validações/listas apontadas. Itens de segurança e regra de domínio foram preservados.
- O arquivo Sonar foi gerado em 18/10 e alguns locais já estavam corrigidos no código (rótulo do calendário, `output`, optional chaining e valores de PATCH usados); esses alertas foram classificados como desatualizados. Complexidade em funções extensas, IP permitido do ambiente de desenvolvimento e `!important` de movimento reduzido permanecem para revisão específica, sem refatoração de lógica normativa nesta passada.
- Validação: ESLint focado aprovado; 157 testes focados aprovados. Uma seleção mais ampla teve 59 falhas em suítes legadas que esperam o provider em memória e não configuram `DATABASE_URL`; não houve escrita no banco. `tsc` não apontou erros nos arquivos tocados, mas a checagem global terminou com erros preexistentes em outros arquivos.

## 2026-10-18 23:46 BRT - refactor - Validação central das rolagens V5
- Arquivos principais: `lib/vtm-v5/dice-roll-service.ts`, `lib/character-rolls.ts`, `lib/character-roll-history.ts`, `lib/chronicle-nights.ts`, `tests/dice-roll-service.test.ts` e planejamento local em `codex/specs/game-upgrade/`.
- Centralizada a geração de D10 e validação da quantidade, comprimento e faces do provider; pools de ficha continuam separando dados normais e Hunger Dice. Rerrolagem e Awake também usam o helper, mantendo a validação antes da persistência/cobrança.
- Validação: 8 testes novos aprovados; 23 testes puros do provider/avaliador e 12 casos normativos adicionais aprovados; ESLint nos arquivos alterados aprovado. A suíte completa de rolagem/API falha em 57 casos por fixtures antigas incompatíveis com a migração PostgreSQL; TypeScript continua com erros preexistentes nos testes legados. Nenhum reset, DDL, seed ou escrita no PostgreSQL.
- A SPEC segue parcial: reset perigoso bloqueado, integração PostgreSQL dos testes pendente, combate/dano/Blood Bond não implementados, e arquivo-base normativa referenciado ausente.

## 2026-10-18 23:15 BRT - docs - Validação de specs concluídas e início da spec de fontes
- Arquivos principais: `codex/specs/README.md`, `codex/specs/entregas-concluidas.md`, `codex/specs/fontes-clicaveis-nomenclatura-en/`; removida `codex/specs/refatoracao-formulario/` após validação.
- Revalidação focada da refatoração do formulário aprovada: 45 testes em três arquivos. Tentativa das suítes legadas de anotações, convites, convocação, criação de mesa e NPCs revelou falhas decorrentes da expectativa do provider em memória após a migração; essas specs foram preservadas e não consideradas validadas/concluídas.
- Iniciada spec de fontes clicáveis com inventário do catálogo estático, rota autenticada e referências no histórico; task-001 em andamento. Sem alterações no PostgreSQL. Revisão do armazenamento S3, autorização por papel, licenças e execução da rota de fontes permanecem pendentes.

## 2026-10-18 22:54 BRT - fix - Conexão PostgreSQL local
- Arquivos principais: `.env.local` (local, não versionado), `lib/db.ts`.
- Substituído o pool Neon via WebSocket pelo driver `pg` sobre TCP, compatível com PostgreSQL local. Configurada a URL fornecida em `.env.local` sem registrá-la no changelog.
- Validação: serviço PostgreSQL ativo, porta 5432 acessível e consulta somente leitura confirmou database `postgres`/role `postgres`; ESLint, TypeScript de `app`/`lib`/`components` e `git diff --check` aprovados. Nenhuma escrita/DDL/seed/limpeza no banco.

## 2026-10-18 22:37 BRT - docs - Execução da SPEC de dados, XP, NPCs e carniçais
- Arquivos principais: `codex/specs/vtm-v5-fichas-e-inicio-de-noite/requirements.md`, `tests/v5-spec-dice.test.ts`, `tests/npc-validation.test.ts`.
- Atualizada a exigência de persistência nos requisitos locais da frente. Validada a parte pura da SPEC: 12 casos normativos de dados e 3 casos de validação de NPC passaram. A SPEC não foi concluída.
- Bloqueio: `DATABASE_URL` existe em `.env.local`, mas conexão somente leitura falhou; testes completos de XP, NPCs e carniçais e validação SQL não foram executados. Nenhuma escrita, DDL, seed ou limpeza no banco.

## 2026-10-18 22:16 BRT - refactor - Migração de persistência para PostgreSQL
- Arquivos principais: `AGENTS.md`, `lib/db.ts`, `lib/characters.ts`, `lib/character-commands.ts`, `lib/campaigns.ts`, `lib/possessions.ts`, `lib/availability.ts`, `lib/blood-policy.ts`, `lib/notes.ts`, `lib/campaign-invitations.ts`, `lib/campaign-calls.ts`, `lib/chronicle-nights.ts` e rotas associadas; planejamento local em `codex/specs/persistencia-postgresql/`.
- Runtime sem fallback em memória: fichas, convites, clãs habilitados, chamadas, noites, calendários, NPCs e anotações usam PostgreSQL; sem `DATABASE_URL`, operações de banco falham explicitamente. Regras e roteiro de SPEC atualizados para não exigir reset local.
- Validação: `npx eslint` nos módulos/rotas alterados e `git diff --check` passaram; `npx tsc --noEmit` não reporta erros em app/lib/components, mas ainda falha por testes antigos que esperam APIs síncronas e o provider global. `DATABASE_URL` está configurada em `.env.local`, mas conexão somente leitura falhou no sandbox; schema, seed e limpeza não foram executados. SPEC segue em andamento até migrar os testes e validar PostgreSQL isolado.

## 2026-10-18 18:02 BRT - feat - Primeira fatia da SPEC de dados, XP, NPCs e carniçais
- SPEC de referência: `codex/spec-regras-dados-xp-npcs-carnicais-v5.md`. Implementação iniciada pela frente de dados, na ordem prevista; SPEC permanece parcial/blocked. Ledger/compras/projetos de XP, novos modelos/templates de NPCs, fluxos de carniçal, configuração ampliada do perfil e integração completa de disputas ainda não implementados.
- Arquivos principais: `lib/vtm-v5/dice-evaluator.ts`, `rule-profile.ts`, `lib/character-rolls.ts`, `character-roll-history.ts`, `call-roll-characters.ts`; API de rolagem existente e novas rotas de rerrolagem/adjudicações, fontes e fichas autorizadas da chamada; `components/character-summary/character-rolls.tsx`, `roll-history.tsx`, `components/livekit/call-rolls.tsx`, `livekit-room-link.tsx`; quatro arquivos de testes `v5-*` e `UI-GUIDE.md`.
- Separadas contagem e resolução com margem assinada, par crítico condicionado à vitória e flags independentes de falha total/bestial. Checks, Vontade e Humanidade não recebem Fome; Taking Half e vitória automática exigem Narrador e não sorteiam dados. Comparador puro de disputa básica trata empate a favor do ator, sem substituir o resolvedor de combate.
- Histórico por ficha guarda originais, revisões, IDs/tipos de dados, perfil inicial `v5_core_companion` v1 e referências. Rerrolagem substitui até três dados comuns distintos e marca 1 dano superficial de Vontade na mesma operação transacional, com revisão, lock, idempotência e uma ativação por teste. Complicações, resolução de crítico com Fome como falha narrativa e oferta/aceitação de vitória a custo são auditadas separadamente, sem alterar os dados ou aplicar Frenzy, Manchas ou perda de Humanidade automaticamente.
- Segurança: DTO oculta dificuldade/resolução reservadas e notas privadas, incluindo revisões; segredos de outra mesa permanecem ocultos. Retry revalida autorização e reprojeta a resposta pelo papel atual, sem retornar snapshots internos. IDs de dado não canônicos (como N:00), seleção de Fome, valores/IDs forjados e gastos sem capacidade são rejeitados. Novas mutações usam origem/JSON limitado pelos helpers existentes. Fontes usam whitelist autenticada e streaming privado de PDFs locais, sem caminhos no DTO. Chamadas reutilizam a UI de rolagem com seleção de fichas aprovada no servidor, sem novas permissões de LiveKit.
- Preparação única anterior ao código: script existente em processo isolado NODE_ENV=test, DATABASE_URL ausente e .env simulado; modelo em memória atual e seeds de 8 fichas/3 mesas inicializados, integridade aprovada 1/1. Sem alteração estrutural de schema, migração, PostgreSQL ou servidor ativo. Teste temporário removido após a preparação; gameState JSON existente foi reutilizado.
- Validação: 133/133 testes focados em 9 arquivos; regressão ampliada 973/973 em 80 arquivos antes das três últimas regressões adicionais (todas aprovadas no foco). Tipos, lint do recorte e build aprovados; npm audit sem vulnerabilidades; padrões de segredos e whitespace em 18 arquivos sem achados. Revisão pela skill local pre-commit-review, sem vulnerabilidades críticas/altas conhecidas no recorte.
- Bloqueios globais reconfirmados: `blood-potency.test.ts` tem 9 expectativas divergentes e `notes-preparation.test.ts` falha ao carregar DATABASE_URL do .env e aborta antes do reset (14/24 testes aprovados nesses dois arquivos); lint da aplicação tem 7 variáveis não usadas em `app/api/campaign-events/route.ts:168` e 3 avisos existentes. Arquivos fora do recorte preservados. SPEC permanece blocked conforme AGENTS.md, sem recomendar commit ou dispensar validações. QA visual/manual, serviço LiveKit real, SQL e escala do histórico não foram validados; backlog local atualizado. Sem staging, commit ou push; PDFs já staged e alterações anteriores preservados.

## 2026-10-18 17:28 BRT - fix - Humanidade, criação independente e Aparência Nosferatu
- Arquivos principais: `app/characters/character-form-client.tsx`, `app/campaigns/page.tsx`, APIs de status/validação de fichas, componentes de atributos/habilidades/clã/resumo/recursos, `lib/characters.ts`, `character-clans.ts`, `discipline-allocation.ts`, `predator-effects.ts`, regras V5 de clã/validação, testes correspondentes, snapshots e `UI-GUIDE.md`.
- Humanidade recebe botão redutor acessível com limite zero e os mesmos comandos autorizados, salvamento automático, revisão e idempotência. Sem mesa, distribuição de atributos/habilidades/Disciplinas é livre dentro dos limites, escolhas de clã não exigem pacote 2+1 nem apagam Disciplinas existentes e requisitos de criação viram avisos. Pontos iniciais de clã tornam-se manuais ao editar a ficha independente; concessões de predação, compras XP, recursos e permissões permanecem protegidos. O servidor deriva a dispensa do vínculo persistido; flags do cliente não dispensam regras em mesas. Vínculo posterior retorna a ficha para DRAFT e exige regras da mesa na próxima validação/conclusão.
- “Pesquisa de habilidades” substitui “Fonte de pesquisa” e abre nova guia com `noopener noreferrer`. Nosferatu não rejeita Siren/Aparência positiva: cadastro e origens são preservados, resumo indica Aparência −2 e identifica bônus positivos como ignorados. Rolagens genéricas existentes não possuem contexto de Aparência e não receberam modificador global.
- Preparação única antes da implementação: script existente em processo isolado NODE_ENV=test, DATABASE_URL ausente e carregamento de .env simulado. Modelo em memória atual inicializado; seeds de 8 fichas/3 mesas e integridade aprovados (1/1). Sem mudança estrutural de schema, PostgreSQL, migração ou alteração do servidor ativo. Teste temporário removido após a preparação.
- Validações: 191/191 testes focados em 14 arquivos; regressão ampliada 931/931 em 76 arquivos excluindo `blood-potency.test.ts` e `notes-preparation.test.ts`, que falharam na execução geral (9 expectativas de Potência do Sangue e 1 preparação antiga que carrega DATABASE_URL do .env e bloqueia antes do reset). Esses arquivos e implementação de Potência do Sangue não foram alterados. Snapshots de formulário atualizados para markup vigente; testes de orientação distinguem fichas livres e vinculadas. Tipos e build aprovados; npm audit com zero vulnerabilidades. Verificações incluem 401/403, isolamento/propriedade, limites, flags forjadas, integridade de concessões e manutenção das regras vinculadas.
- Validação geral blocked: lint da aplicação encontrou 7 variáveis não utilizadas em `app/api/campaign-events/route.ts:168` (arquivo não alterado), além de 3 avisos existentes. Revisão pela skill local pre-commit-review e varredura de padrões de segredos no recorte realizadas, sem vulnerabilidades críticas/altas conhecidas relacionadas à alteração. QA visual/manual, teclado real e responsividade pendentes no backlog local. Sem staging, commit ou push; alterações anteriores preservadas.
- Lint focado nos arquivos do recorte aprovado; varredura de padrões de segredos em 23 arquivos de código sem achados. `npm run lint` também percorreu backups gerados `.next-backup-*`, resultando em 195239 problemas globais; backups e configuração existentes não foram alterados. `git diff --check` aprovado no recorte (a linha em branco final de `.env.local.example` pertence à alteração anterior preservada).
- Verificação final adicional: 35/35 testes de clã/formulário, incluindo regressão que reduz pontos iniciais de clã na ficha independente e preserva Repulsivo 2. Arquivos gerados `next-env.d.ts` e `tsconfig.tsbuildinfo` restaurados após build/tipos.

## 2026-10-17 22:46 BRT - feat - Novos tipos de predação e fontes do catálogo
- Arquivos: lib/vtm-v5/predator-types/{catalog,supplements,types,mechanics,normalize,projections,validation}.ts; lib/predator-types.ts, character-clans.ts e vtm-v5/validation.ts; APIs predator-types e characters/[id]/{predator-type,campaign}; componentes predator-types, app/campaigns/new/page.tsx, UI-GUIDE.md e testes de predação/seletores.
- Documento docs/regras/novos-tipos-predacao-vtm-v5.md integrado ao catálogo compartilhado pelo provider de desenvolvimento e APIs: 40 tipos e uma variante de Bagger, sem duplicar os 18 comunitários existentes ou reimpressões de Roadside Killer. Nomes editoriais em português, aliases originais, referências/páginas e pacotes públicos preservados; fontes comunitárias identificadas como Bully (2021), distintas do livro oficial. Não foi criada tabela SQL redundante nem executada operação persistente.
- Cadastro de Roadside Killer, Tithe Collector, Extortionist, Graverobber, oito tipos Sabbat alternativos e variante Bagger com Oblívio. Escolhas de Extorsionista distribuem três pontos; Tributos exige Ancilla e três pontos exclusivos em Domínio ou Status. Variante herda custos/benefícios e restrição Ventrue, sem duplicação ao trocar/reaplicar/remover. Corrigidos Remorso/Habitante do Memoriam de Confidente e Subestimado de Lobo como benefícios. Preservados defeitos de um ponto de Street Feeder/Watcher, modos de Graverobber e parada atípica com Fortitude de Lobo; não foi criado motor de caça.
- Suplementos desativados por padrão, inclusive para ficha independente; consulta independente mostra todos os registros, motivos e fontes, enquanto mesas mostram os habilitados. Habilitação é escolha do Narrador nas regras existentes. Roadside permanece bloqueado pela pontuação ausente; Sabbat permanece consultável e bloqueado por depender do conjunto alternativo ainda sem suporte, incluindo dois pontos de Disciplina e alimentação/Trilhas. Pré-publicações são identificadas e não foram conferidas contra edições finais. Nenhum ponto foi inventado ou aplicado a cada caça.
- Preparação única anterior à implementação: script existente em processo isolado NODE_ENV=test, DATABASE_URL vazia e carregamento de .env simulado; modelo em memória atual inicializado, seeds de 8 fichas/3 mesas e integridade aprovados (1/1). Sem alteração estrutural de schema, reset de PostgreSQL ou mudança no servidor em execução. Teste temporário de preparação removido após execução; testes de regressão mantêm seus próprios fixtures isolados.
- Validações: 276/276 testes focados em 12 arquivos; tipos e build aprovados, lint sem erros/3 avisos existentes, npm audit sem vulnerabilidades e varredura local de padrões de segredos sem achados. Cobertura inclui 401/403, isolamento, escolhas/IDs inválidos, habilitação, perfil Ancilla vindo do servidor, bloqueios resistentes a override, DTO sem notas privadas e aplicação/reversão idempotente da variante. Revisão pela skill local pre-commit-review sem vulnerabilidades críticas/altas conhecidas no recorte.
- Validação geral bloqueada: suíte completa executada com 925/941 testes aprovados; 16 snapshots de HTML em tests/character-form-refactor.test.ts divergentes nas etapas atributos/habilidades/disciplinas/recursos, que têm outras alterações em andamento no workspace. Snapshots preservados; SPEC local permanece blocked na validação geral. Vitest focado encerrou com código 0 e aviso de fechamento de dois servidores Vite. QA visual/manual e responsividade não executados, registrados no backlog local. Sem staging, commit ou push.

## 2026-10-17 22:26 BRT - fix - Credenciais do Sonar export pelo .env
- Arquivos: sonar-export.ps1 e tests/sonar-export.test.ps1.
- Script lê o .env ao lado do próprio arquivo, usando dotenv já instalado para respeitar aspas, comentários e valores literais. SONAR_TOKEN e SONAR_PROJECT_KEY (ou o alias SONAR_PROJECTKEY existente no projeto) têm prioridade sobre o terminal; variáveis ausentes no arquivo mantêm a alternativa pelo ambiente. Valores vazios são rejeitados antes de chamar a rede. Credenciais ficam no escopo do script, sem alterar o ambiente do terminal ou imprimir segredos.
- Paginação e proteção contra página vazia preservadas. Self-check PowerShell com arquivo/rede/export simulados aprovado: prioridade do arquivo, dois nomes de projeto, valores com aspas/comentários, expressão tratada como texto, fallback, paginação e ausência de credenciais sem requisição. Sintaxe PowerShell e diff conferidos. Revisão de segurança focada no carregamento sem execução do .env e no transporte local via stdin/saída capturada, sem argumentos contendo segredos; nenhuma dependência nova.
- Nenhuma alteração no .env ou exportação real executada. Sem mudanças em aplicação/banco, nova SPEC ou reset; tipos/build/lint de aplicação não repetidos para este ajuste exclusivo PowerShell. Sem staging, commit ou push.

## 2026-10-17 22:21 BRT - feat - Seleção de poderes de Disciplina em modal
- Arquivos: components/character-form/discipline-power-row.tsx e disciplines-step.tsx; lib/vtm-v5/discipline-powers.ts; app/api/discipline-powers/route.ts; testes discipline-power-row/discipline-powers-route/character-form-steps, snapshots e UI-GUIDE.md.
- Clicar em qualquer um dos dez campos de uma linha de poder abre a mesma modal. Disciplina vem do contexto da ficha e nível é limitado ao menor entre a linha e o nível atual da Disciplina, permitindo filtrar opções inferiores. Selecionar preenche nome, efeito, custo, pré-requisito, amálgama, duração, paradas, notas e fonte da linha; cancelar/Escape mantém os valores. Campos preservam names no formulário e usam botões com nomes acessíveis, foco nativo do dialog e texto resumido na tabela.
- Catálogo carregado sob demanda por API autenticada, com validação de filtros/duplicados e cache privado no-store. Retorna somente poderes classificados como publicação no acervo local, excluindo rituais/cerimônias/fórmulas e registros comunitários/pré-publicação; fonte e requisitos visíveis. DTO não retorna caminhos/nomes de arquivo ou dados de usuários/mesas; observações retornadas são o texto de sistema do catálogo de regras. Não concede XP/níveis nem dispensa pré-requisitos ou autorização existentes. Sem nova dependência.
- Preparação única antes de implementar, pelo script existente em processo isolado NODE_ENV=test, DATABASE_URL vazia e sem carregar .env: modelo em memória atual inicializado, seeds de 8 fichas/3 mesas e integridade aprovada 1/1. Sem alteração estrutural de schema, migração, PostgreSQL ou servidor em execução.
- Validações: suíte 840/840 em 72 arquivos, preparação excluída da regressão para não repetir reset; 5/5 testes da modal após ajuste final de apresentação. Tipos/build aprovados, lint sem erros/3 avisos preexistentes, auditoria 0 vulnerabilidades e varredura local de padrões de segredos em 8 arquivos sem achados. Cobertura de 401, filtros inválidos/manipulados, DTO público, XSS como texto, dez campos, preenchimento, filtro e cancelamento; não há recurso de usuário nesta API de referência que exija teste de IDOR. Quatro snapshots atualizados pela orientação de uso da modal. Revisão pela skill local pre-commit-review, sem vulnerabilidade crítica/alta conhecida no recorte.
- QA visual/manual, teclado real e responsividade pendentes no backlog local; testes de markup/handlers não substituem QA no navegador. Vitest focado apresentou aviso de encerramento Vite com código final 0. Sem staging, commit ou push; alterações anteriores preservadas.

## 2026-10-17 22:05 BRT - fix - Criação, vínculo e revisão de fichas na mesa
- Arquivos principais: `app/create-characters/page.tsx`, `app/characters/character-form-client.tsx`, `app/campaigns/[id]/page.tsx`, APIs `characters` e `characters/[id]/campaign`, `components/campaign-creation-gate.tsx`, seletores/resumo, `lib/character-summary.ts`, `character-commands.ts`, `characters.ts`, catálogos/regras V5 e testes correspondentes; `UI-GUIDE.md` sincronizado.
- Criação geral oferece somente tipos jogáveis; NPC humano/vampiro usa exclusivamente a criação já existente na mesa. Bloqueada conversão de tipo por edição/API. Vínculo aparece no início apenas do editor independente de jogador, reutilizando convite aceito; servidor valida propriedade, regras de clã/predação, revisão, origem e idempotência. Token não entra no histórico; desvinculação/troca de mesa continuam bloqueadas pelo servidor.
- Anotações do Narrador abrem nova guia filtrada pela mesa. Resumo da gestão sem link de evolução, com pilares/convicções antes dos atributos, leitura canônica das habilidades com pontos e vantagens/defeitos preenchidos. Confirmar clã salva e atualiza a ficha, regras do clã e opções de predação, inclusive no primeiro rascunho.
- Nomenclatura de apresentação revisada para Proteanismo e sangue-ralo, inclusive no catálogo de pesquisa; IDs preservados e aliases antigos reconhecidos sem backfill. Disciplina validamente escolhida por predação usa XP de clã (novo nível ×5), preservando Caitiff ×6 e autorização de aprendizado. Exemplo fora do clã: nível 2 custa 10 XP.
- Validação de NPC cobre modo, dificuldade/paradas, atributos/habilidades da ficha completa, poderes por ponto e origem de vampiro, sem impor distribuição inicial de jogador. Testes de validação/autorização usam dados persistidos no provider descartável. Despertar verificado pelos testes de rota/domínio existentes, sem alterar sua lógica.
- Preparação única: script existente em processo isolado `NODE_ENV=test`, sem `DATABASE_URL` e sem carregar `.env`; memória reinicializada com modelo atual, seeds de 8 fichas/3 mesas e integridade aprovada. Nenhuma alteração estrutural de schema necessária; nenhum PostgreSQL ou servidor em execução modificado.
- Validações: suíte completa 819/819 testes em 70 arquivos; rodada final focada 20/20, incluindo dois testes adicionais de conversão indevida. Preparação validada separadamente 1/1 e excluída da regressão para não repetir reset. Tipos e build aprovados; lint 0 erros/3 avisos preexistentes; auditoria 0 vulnerabilidades. Três snapshots atualizados por nomenclatura; testes antigos de custo/navegação sincronizados. Varredura de padrões de segredos em 41 arquivos sem achados. Revisão pela skill local `pre-commit-review`, sem vulnerabilidades críticas/altas conhecidas no recorte. Vitest focado apresentou aviso ao encerrar servidores Vite, com código final 0.
- Pendências: QA manual visual, teclado e responsividade registrado localmente; PostgreSQL externo não validado, vínculo/convite/NPC novos continuam limitados ao provider de desenvolvimento. Sem staging, commit ou push; alterações locais anteriores preservadas.

## 2026-10-17 17:26 BRT - feat - Persistir catálogo de habilidades e Disciplinas no PostgreSQL
- Arquivos principais: `lib/db.ts`, `app/master/catalogo/page.tsx`, SPEC local `persistencia-postgresql`.
- Driver atualizado para `pg`/Drizzle Node PostgreSQL, necessário para conectar via TCP ao PostgreSQL local. Schema aditivo inclui `discipline_catalog`, `clan_disciplines`, `skill_catalog` e `discipline_research_catalog`, usando IDs estáveis.
- Página de pesquisa do Narrador carrega dados do PostgreSQL. Seed transacional e repetível gravou 12 Disciplinas, 43 relações, 27 habilidades e 372 conteúdos no banco local `localhost:5432/postgres`; destino inspecionado antes da gravação, com 14 tabelas e 0 linhas de aplicação. Nenhuma tabela ou dado foi apagado.
- Validação de integração com banco local: 1 teste aprovado; TypeScript aprovado. Remoção global do provider em memória permanece incompleta: notas, convocações, convites, clãs e outras rotas ainda dependem dele e estão registradas como trabalho pendente na SPEC. Não afirmar migração integral nem prontidão de produção.

## 2026-10-17 17:12 BRT - feat - Catálogo de pesquisa do Narrador
- Arquivos principais: `codex/catalogo-disciplinas-vtm-v5.html`, `lib/vtm-v5/research-catalog.json`, `lib/vtm-v5/research-catalog.ts`, `lib/dev-db.ts`, `app/master/catalogo/page.tsx`, `components/master-research-catalog.tsx`, `app/campaigns/page.tsx`, teste `master-research-catalog` e `UI-GUIDE.md`.
- Importados 372 registros do catálogo com IDs estáveis por Disciplina, tipo, nível, fonte, página e nome; os 27 registros de habilidades existentes também são semeados no provider em memória. As paradas de dados ligam os conteúdos às habilidades canônicas encontradas.
- Criada página pesquisável por nome, efeito, requisito e fonte, com filtros por Disciplina, tipo e situação, paginação e exibição de referências. Link disponível no painel de Narradores.
- A página exige sessão e autorização de Narrador no servidor. Sem migração, reset ou comandos contra PostgreSQL; uso do seed descartável em memória. Texto e situação de publicação mantêm as classificações do catálogo de origem e precisam ser confirmados pelo Narrador.
- Validação: 33 testes pertinentes aprovados; TypeScript/build aprovados; lint sem erros (3 avisos preexistentes); `npm audit --audit-level=high` encontrou 0 vulnerabilidades. Vitest relatou timeout ao encerrar 2 servidores Vite, mas retornou código 0 com os testes aprovados. QA visual manual pendente no backlog.

## 2026-10-17 17:00 BRT - style - Página dedicada de evolução do personagem
- Arquivos: `app/characters/[id]/evolution/page.tsx`, cliente de resumo, gestão da mesa, testes `character-evolution-page`/`character-summary-notes`, `UI-GUIDE.md` e guia de Disciplinas por origem.
- Disciplinas e especialidades movidas para página própria. Botão Evolução junto ao nome abre nova guia, como Anotações, com aviso acessível e noopener/noreferrer. Removidos painéis equivalentes do resumo; gestão da mesa usa acesso à mesma página. Editor de criação continua com seus controles de concessão.
- Página valida sessão, UUID, tipo jogável e propriedade/Narrador atual no servidor antes de renderizar; terceiros e identificadores inválidos não acessam o conteúdo. APIs, custos, autorização, idempotência e regras de aquisição reutilizados.
- Validação: rodada de 47 testes funcionais/segurança/interface e rodada de 34 testes de navegação/resumo (com sobreposição) aprovadas. TypeScript/build aprovados, lint sem erros/3 avisos anteriores, npm audit sem vulnerabilidades. Revisão focada pela skill pre-commit-review sem bloqueios conhecidos; diff/segredos conferidos.
- Retomada da SPEC existente, sem novo reset, schema ou seeds. QA manual visual/teclado/responsividade pendente no backlog; sem validação PostgreSQL. Sem staging, commit ou push.

## 2026-10-17 16:45 BRT - feat - Acesso a Disciplinas por origem
- Arquivos principais: catálogos `lib/vtm-v5/disciplines.ts`, `discipline-access.ts` e `discipline-contents.ts`; `lib/discipline-allocation.ts`, `character-disciplines.ts`, clãs/criação/predação/personagens/duplicação; API `characters/[id]/disciplines`, criação/edição/status/validação; editor, seletores, painel de evolução e gestão da mesa; `lib/dev-db.ts`, testes e `docs/regras/disciplinas-por-origem.md`/`UI-GUIDE.md`.
- Matriz integral: 12 Disciplinas e 43 relações, com IDs estáveis; inclusão dos clãs ausentes, seleção inicial 2+1 validada no servidor, políticas próprias Caitiff/sangue-fraco e Metamorfose como apresentação de PROTEAN. Escolhas de clã persistem IDs; nomes/aliases não duplicam uma mesma Disciplina.
- Origem por aquisição em `gameState`, níveis atuais em `data.disciplinas`, grants específicos por requisito/origem/nível/clã/mesa. Reaproveitado schema JSON existente; sem tabelas SQL redundantes ou migração/backfill de memória. Cópia conserva origens públicas sem transportar autorização privada da mesa.
- Evolução cobra próximo nível ×5/×7/×6 conforme catálogo local, exige aprovação específica de aprendizado pelo Narrador atual e grava nível, XP, origem e histórico no comando atômico/idempotente existente. Autorizar/revogar não cria pontos ou XP; revogar exceção inicial reabre revisão. Interface mostra custos/bloqueios e disponibiliza controles do Narrador na gestão.
- Editor filtra opções iniciais, explica origem da predação, permite corrigir escolhas manuais e bloqueia conclusão incompatível; poderes existentes preservados. Rituais/cerimônias cadastrados como metadados vinculados com requisitos próprios (catálogo inicial de dois conteúdos); compra/execução desses conteúdos e catálogo completo não implementados. Alquimia permanente continua bloqueada até definição de suas regras.
- Segurança: 401/403/IDOR, CSRF/JSON/corpo limitado, saldo/custo/permissões obtidos no servidor, resposta privada sem cache e justificativas privadas filtradas. Fechadas reutilização de ID de linha para duplicar origem e duplicação por aliases; grants de outra mesa/Narrador/revogados não autorizam compras.
- Preparação única: processo isolado NODE_ENV=test, DATABASE_URL removida e load de .env desabilitado; reset só da memória, modelo atual, seeds 8 fichas/3 mesas e integridade aprovados (1/1). Primeira tentativa abortou antes do reset ao detectar conexão configurada; PostgreSQL e servidor corrente intocados. Catálogo/seeds atualizados e integridade das 43 relações verificada nos testes.
- Validação final: 789/789 testes em 64 arquivos, TypeScript/build aprovados, lint 0 erros/3 avisos anteriores, npm audit 0 vulnerabilidades. Preparação P2 excluída da regressão para não repetir reset; preparação desta SPEC validada separadamente. Quatro snapshots de Disciplinas atualizados pela mudança intencional de controles/rótulos. Teste antigo de predação sincronizado com conversão de especialidade para habilidade já presente localmente.
- Revisão pela skill pre-commit-review concluída no recorte; nenhum bloqueio crítico/alto conhecido ou segredo novo detectado. QA manual visual/teclado/responsividade e SQL externo não executados, com backlog. Demais alterações locais preservadas; sem staging, commit ou push.

## 2026-10-17 15:53 BRT - style - Anotações da ficha em nova guia
- Arquivos: `app/characters/[id]/character-summary-client.tsx`, `app/characters/[id]/summary/page.tsx`, `tests/character-summary-notes.test.ts` e `UI-GUIDE.md`.
- Removido card Anotações relacionadas do resumo compartilhado. Botão Anotações junto ao nome abre /notes em nova guia, com filtro CHARACTER/NPC e identificador da ficha, rel noopener noreferrer e aviso acessível. Removido modal da página de resumo; destino e autorização existentes reutilizados.
- Validado o candidato em worktree isolado: 28/28 testes, tipos e build --webpack aprovados; lint 0 erros/3 avisos anteriores; audit 0 vulnerabilidades. Build com avisos de dependência Auth0 e configuração Auth0 ausente no worktree sem .env. Revisão pre-commit sem bloqueios no candidato; erro de tipos local de outra tarefa excluído deste commit. QA manual pendente; sem novo reset/banco.

## 2026-10-17 15:23 BRT - style - Simplificar o resumo da ficha
- Arquivos: página de resumo, character-summary-client, CharacterSummary, SummaryHeader, CharacterRolls, CampaignNotesDialog, UI-GUIDE e testes archive-visual/character-rolls-ui.
- Retirado campo de motivo da rolagem; comando registra automaticamente atributo e habilidade, preservando validação e cálculo no servidor. Clã após cabeçalho; botão compacto Anotações junto ao nome; removido título redundante Visão Geral.
- 147/147 testes pertinentes aprovados, tipos aprovados, lint sem erros/3 avisos anteriores, audit sem vulnerabilidades. Revisão pela skill pre-commit-review sem bloqueios no recorte. Build aprovado. QA manual e PostgreSQL pendentes; sem novo reset/schema/seeds.

## 2026-10-17 15:17 BRT — fix — Especialidades de Ofícios conforme o livro básico
- Arquivos: `lib/vtm-v5/specialties.ts`, testes de domínio/habilidades/seletor/comandos e `docs/regras/especialidades-v5.md`.
- Corrigida exceção explícita de Craft/Ofícios (Corebook p.159–160): permite mais especialidades que pontos, preservando habilidade positiva, duplicatas, concessões, custos de XP, autorização e limites internos explícitos. Critério compartilhado pelo seletor e validador.
- 85 testes pertinentes aprovados, incluindo cobertura das 27 habilidades, estado salvo/em edição e compra idempotente. Tipos e lint dos arquivos alterados aprovados; auditoria sem vulnerabilidades. Comparação de fontes distingue suplemento comunitário do Players Guide oficial. Sem migração/reset ou mudança em APIs.
- Pendências documentadas: conversão de predação para habilidade zerada e regras opcionais de vantagens comunitárias; não foram habilitadas implicitamente. QA manual visual não executado.


## 2026-10-17 15:17 BRT - fix - Permitir recursos narrativos ao proprietário
- Arquivos: `lib/character-resources.ts`, `app/api/characters/[id]/resources/route.ts`, `components/character-summary/session-resources.tsx`, testes de comandos/interface e `UI-GUIDE.md`.
- Proprietário e Narrador podem alterar Humanidade e Manchas; removidos avisos de exclusividade do Narrador. Humanidade conserva somente + na interface e Manchas conserva −/+. Autorização no servidor, limites, histórico, revisão/idempotência e sigilo da causa de torpor preservados.
- 56/56 testes pertinentes aprovados, TypeScript aprovado, lint sem erros (3 avisos anteriores), npm audit sem vulnerabilidades. Revisão focada pela skill local pre-commit-review sem bloqueios ou padrões de segredos no diff. Build aprovado; QA manual e PostgreSQL não executados. Retomada da SPEC sem repetir reset e sem alteração de schema/seeds. Alterações locais de outras tarefas preservadas.

## 2026-10-17 14:39 BRT - style - Centralizar marcadores de recursos
- Arquivos: `components/character-summary/session-resources.tsx`, `app/globals.css` e `UI-GUIDE.md`.
- Centralizados os nomes, valores e controles; Manchas integrado na mesma grade, com cinco colunas a partir de 1280px. Preservados limites, permissoes e salvamento automatico. Sem mudancas em APIs ou banco, sem novo reset.
- Testes pertinentes: 55/55 aprovados; tipos e build aprovados; lint sem erros (3 avisos anteriores); auditoria sem vulnerabilidades. QA visual em navegador pendente. Skill pre-commit-review nao localizada; revisao formal bloqueada, sem recomendacao de commit.

## 2026-10-16 01:34 BRT — chore — Revisão pré-commit da interface e recursos
- Candidato: 39 arquivos de interface, resumos/notas/gestão de mesas, recursos com autosave, testes e guias; inclui a página dedicada de criação de NPC e `campaignId` no resumo autorizado.
- Revisão pela skill pre-commit-review sem bloqueios críticos/altos conhecidos no candidato. Ajustada a posição do legend de vínculos para primeiro filho do fieldset; comentários da página de mesas corrigidos. Sem alteração de APIs, autenticação ou schema.
- Validação reexecutada: 716 testes/60 arquivos aprovados, TypeScript e build aprovados; lint sem erros/três avisos anteriores; npm audit sem vulnerabilidades. Alterações locais de ambiente, relatórios, gerados, codex/.codex, exclusões .kiro, script de preparação e rótulo avulso do calendário ficam fora do candidato.
- QA manual visual/acessibilidade/responsividade e integração PostgreSQL continuam pendentes; sem alegação de produção. Preparação em memória não repetida nesta revisão.


## 2026-10-16 01:24 BRT — feat — Contadores compactos com salvamento automático
- Arquivos: `components/character-summary/session-resources.tsx`, `app/globals.css`, `UI-GUIDE.md`, `tests/session-resources-ui.test.ts` e `tests/archive-visual.test.ts`.
- Botões visíveis somente − / + com rótulos acessíveis; Humanidade tem apenas +, exclusivo do Narrador. Vitalidade/Vontade mostram linhas separadas por dano superficial/agravado com contador e botões ao lado: − remove dano e + adiciona dano, respeitando o máximo compartilhado. Manchas mantêm controle exclusivo do Narrador.
- Cada clique válido salva automaticamente pelo comando existente com motivo contextual, revisão e idempotência; removida etapa manual de motivo/salvar e inputs numéricos de rascunho. Contadores/bolinhas mudam após resposta confirmada. Falhas preservam o último valor confirmado; envios em voo são bloqueados e retry reaproveita comando/chave.
- Fome 1→0 mantém confirmação de ação tabu com Cancelar como padrão; confirmar salva imediatamente com motivo específico no histórico, sem XP ou penalidades automáticas. Grade 1/2/4 colunas para acomodar os controles em celular/tablet/desktop.
- Retomada da SPEC existente: sem repetir preparação/reset e sem alteração de APIs, autorização ou banco. Regressão 716 testes/60 arquivos aprovada; tipos/build aprovados; lint sem erros/três avisos anteriores; audit sem vulnerabilidades. Revisão pela skill pre-commit-review e verificação de segredos/whitespace do recorte sem bloqueios.
- QA manual visual/teclado/leitor de tela e integração PostgreSQL não executados nesta rodada, com pendência no backlog local. Sem novas dependências, staging, commit ou push.


## 2026-10-16 01:11 BRT — feat — Controles dos recursos da sessão e confirmação de Fome zero
- Arquivos principais: `components/character-summary/session-resources.tsx`, `app/globals.css`, `UI-GUIDE.md`, `tests/session-resources-ui.test.ts`, `tests/character-resources-command.test.ts` e `tests/archive-visual.test.ts`.
- Botões − Reduzir / + Aumentar abaixo dos recursos; Humanidade/manchas continuam exclusivas do Narrador. Vitalidade/Vontade usam tipo de dano superficial/agravado explicitamente selecionado, mantendo campos independentes e máximos calculados no servidor.
- Fome em cinco bolinhas horizontais entre 0–5, sem XP. Reduzir 1→0 abre confirmação de ação tabu com Cancelar em foco inicial; cancelar mantém 1 e confirmar prepara 0. Motivo e salvamento explícitos registram a alteração pelo comando/histórico existente, sem penalidades automáticas.
- Resumo, campos e botões compartilham o rascunho e indicam alterações não salvas. Bloqueio síncrono contra duplo envio; retry conserva comando/chave; resposta inválida, falha ou conflito não exibem sucesso. Cache atualizado com estado/revisão retornados pelo servidor; ação de recarregar disponível em erros.
- Preparação única de início da SPEC em processo test-memory sem DATABASE_URL: reset descartável, modelo atual sem alteração de schema, seeds 8 fichas/3 mesas e integridade aprovados. PostgreSQL e servidor corrente intocados.
- Validação: preparação 1/1 separada; regressão 716 testes/60 arquivos aprovada, incluindo limites, permissões, danos distintos, confirmação/cancelamento, motivo, erros, conflitos e duplicidade. Testes reais do provider em memória e rotas cobrem 401/403/IDOR, escalada narrativa, entradas inválidas, histórico e omissão de dados privados. Tipos/build aprovados; lint sem erros/três avisos anteriores; npm audit sem vulnerabilidades.
- Revisão focada pela skill pre-commit-review: sem novos endpoints, mudanças na autorização ou segredos detectados no recorte; nenhuma vulnerabilidade crítica/alta conhecida relacionada. QA visual/teclado/leitor de tela em navegador permanece pendente no backlog local. Integração SQL externa não validada nesta entrega; sem nova dependência, staging, commit ou push.


## 2026-10-16 00:42 BRT — style — Anotações ao lado do nome no resumo
- Arquivos: página de resumo, cliente/resumo/cabeçalho da ficha e `components/notes/campaign-notes-dialog.tsx`. Botão compacto de anotações junto ao nome, com quebra de linha em telas estreitas.
- Condição de mesa vinculada/ficha de jogador e modal/permissões preservados; painel do Narrador mantém apresentação anterior.
- Validação: 40 testes pertinentes aprovados (notas, autorização, cabeçalho e resumo), TypeScript e lint dos arquivos alterados sem erros. Revisão focada sem alteração de APIs/autorização/segredos; QA visual em navegador e novo build não executados nesta alteração pontual.



## 2026-10-16 00:21 BRT — style — Páginas alinhadas às referências Arquivos da Noite
- Arquivos principais: `app/page.tsx`, `app/layout.tsx`, `app/globals.css`, páginas de personagens/criação/ficha, mesas/criação/gestão/NPC e anotações; `components/archive-header.tsx`, resumos/recursos, notas, criação de NPC, ferramentas da mesa e `components/master-panel.tsx`.
- PDF local com 16 páginas renderizado e inspecionado. Cabeçalho compartilhado com navegação mobile nativa, largura e hierarquia editorial, cards com conceito/status em português, ações separadas, formulários verticais e notas em duas colunas. Removido controle de autenticação duplicado no layout; Auth0 preservado. Recursos reais/autorizados no topo da ficha, com editor recolhido, motivo e revisão preservados.
- `UI-GUIDE.md` e `design-system.md` revisados: marca Arquivos da Noite, referência por tela, tokens complementares, classes reais, dimensões responsivas e limites do protótipo. Nenhuma mecânica de bônus ou informação demonstrativa foi adicionada ao domínio.
- Preparação inicial única por `tests/notes-preparation.test.ts`: processo test-memory sem DATABASE_URL; reset, modelo atual sem alteração de schema, seeds 8 fichas/3 mesas e relações íntegros. Nenhum PostgreSQL ou servidor corrente reinicializado.
- Validação: preparação aprovada separadamente; regressão de 693 testes/59 arquivos aprovada, incluindo três testes novos de navegação, recursos autorizados e ordem da ficha. Snapshots visuais do formulário atualizados intencionalmente; testes de seletores/convite alinhados aos cards e textos vigentes. TypeScript e build aprovados; lint sem erros/três avisos anteriores; npm audit sem vulnerabilidades.
- Revisão pela skill local pre-commit-review: autorização/isolamento, APIs, recursos e dados privados preservados, sem novo endpoint ou segredo no recorte. QA manual visual/acessibilidade/responsividade em navegador permanece pendente no backlog local; fontes usam fallbacks disponíveis e não há alegação de equivalência pixel a pixel. Alterações locais anteriores preservadas; sem staging, commit ou push.

## 2026-10-15 23:32 BRT — docs — Prévia navegável da criação de personagem
- Adicionado `docs/ui/criacao-personagem.html`: seis etapas visuais de atributos, habilidades/especialidades, disciplinas, recursos, vantagens/pertences e histórico, com navegação nativa e dados fictícios.
- Artefato independente, sem scripts, persistência, APIs ou mudança nas regras/autorização da aplicação. Ações de salvar/validar ficam desabilitadas; não representa validação funcional da ficha.
- Ajuste visual da prévia: contadores permanecem em uma única linha, sem comprimir as bolinhas; rolagem horizontal local quando necessário em telas estreitas.
- Revisão pré-commit: 691 testes aprovados, TypeScript sem erros, lint sem erros e três avisos preexistentes, auditoria sem vulnerabilidades conhecidas. Verificação estática da prévia e whitespace aprovadas; QA visual ainda pendente.

## 2026-10-15 00:33 BRT — chore — Validação pré-commit de NPCs e refatoração
- Candidato com 23 arquivos: NPCs da mesa, extração visual do formulário, testes/snapshot, README e CHANGELOG. Revisão pre-commit-review focada sem bloqueios críticos/altos conhecidos relacionados; documentação local, env, relatórios, gerados, exclusões .kiro e alterações alheias fora do staging.
- Reexecução aprovada: 691 testes/59 arquivos, TypeScript sem emissão, lint zero erros/três avisos anteriores, Next build com tipos e pnpm audit sem vulnerabilidades. Diff staged sem erros de whitespace e sem padrões de credenciais identificados.
- QA visual/integrações externas continuam não executados; documentação local mantém evidências e limites de cada recorte.

## 2026-10-15 00:33 BRT — chore — Validação pré-commit de NPCs e refatoração
- Candidato com 23 arquivos: NPCs da mesa, extração visual do formulário, testes/snapshot, README e CHANGELOG. Revisão pre-commit-review focada sem bloqueios críticos/altos conhecidos relacionados; documentação local, env, relatórios, gerados, exclusões .kiro e alterações alheias fora do staging.
- Reexecução aprovada: 691 testes/59 arquivos, TypeScript sem emissão, lint zero erros/três avisos anteriores, Next build com tipos e pnpm audit sem vulnerabilidades. Diff staged sem erros de whitespace e sem padrões de credenciais identificados.
- QA visual/integrações externas continuam não executados; documentação local mantém evidências e limites de cada recorte.

## 2026-10-15 00:19 BRT — docs — Organização de SPECs, concluídas, backlog e README
- Arquivos: `README.md`, `codex/README.md`, índices de specs/backlog/concluídas e tasks selecionadas de personagens, regras V5, clãs e Potência do Sangue.
- README da aplicação em português com execução/validação, ambiente em memória e limites; removida afirmação não verificada de deploy automático. Central local e visão das 15 frentes separam entregas, recortes parciais e propostas.
- Tarefas comprovadas reconciliadas: criação/edição/cópia independentes, atributos secundários, preparação PS-003 e configuração inicial de clãs/predação. Operações de vínculo posterior/desvínculo/exclusão e regras avançadas continuam pendentes; nenhum fechamento em lote de tarefas compostas.
- Relatórios antigos preservados com aviso histórico; SQL/QA fora do gate da memória, override individual substituído e backfill em memória descartado explicitados. Backlog mestre mantém prioridades P1–P4 e aponta execução nas SPECs, sem duplicar tarefas.
- Checagem de links Markdown relativos em README e codex: zero destinos locais inexistentes; diff sem erros de whitespace. Evidência anterior de 691 testes/59 arquivos mantida como histórica, sem reexecutar testes/tipos/lint/build/audit nesta alteração exclusivamente documental. Sem reset, mudança de código, staging, commit ou push nesta rodada.

## 2026-10-15 00:07 BRT — refactor — Primeira fatia visual do formulário de personagem
- Arquivos: `app/characters/character-form-client.tsx`, `components/character-form/`, `tests/character-form-refactor.test.ts`, `tests/character-form-steps.test.ts` e snapshot de caracterização.
- Atributos, habilidades, disciplinas, recursos/convicções e histórico extraídos como componentes controlados. Controles/opções/tipos atuais compartilhados; estado, cálculos, concessões, carregamento, salvamento, names, campos ocultos e contratos permanecem existentes.
- 20 fingerprints do HTML SSR completo capturados antes da extração e preservados sem atualizar a baseline; cinco testes adicionais de callbacks/campos/bloqueios/origens. Regressão: 691 testes/59 arquivos, tipos/build aprovados, lint sem erros/três avisos anteriores, audit sem vulnerabilidades.
- Revisão focada pre-commit-review/segurança: nenhum novo acesso a API/segredo/autorização ou persistência; diff e arquivos novos sem padrões de credenciais. Achados/estimativas, SPEC local e backlog QA atualizados. Sem commit/push.
- Limites: identidade, vantagens/pertences e estado/carregamento ainda não refatorados. QA visual/integrações externas não executados; estilos/textos legados preservados. Sem novas dependências, schema ou alegação de ganho de performance.

## 2026-10-14 23:59 BRT — chore — Preparação da refatoração incremental do formulário
- Achados/estimativas registrados no backlog local e SPEC da primeira fatia: separar cinco etapas visuais, preservando estado/regras/contratos e editor atual.
- Preparação única por `tests/notes-preparation.test.ts`, test-memory sem DATABASE_URL: modelo existente sem mudança de schema, seeds 8 fichas/3 mesas, relações íntegras. Nenhum servidor corrente ou banco externo reinicializado.

## 2026-10-14 23:25 BRT — feat — NPCs vinculados à mesa no gerenciamento
- Arquivos: `app/campaigns/[id]/page.tsx`, `components/campaign-npc-creator.tsx`, `app/api/campaigns/[id]/npcs/route.ts`, `lib/characters.ts`, `lib/dev-db.ts`, testes de NPC/interface/ordem da gestão.
- Narrador cria NPC humano/vampiro com nome e abre o editor existente. Rascunho sempre vinculado à mesa da rota; edição geral não permite desvínculo.
- Segurança: dono da mesa validado no servidor; origem/JSON/UUID/nome/tipo/campos estritos, sem aceitar campanha do payload ou papel global como permissão. ST_ONLY evita descoberta também nas anotações dos jogadores. Demais criações preservam visibilidade padrão anterior.
- Falhas de rede/HTTP/JSON preservam campos, liberam tentativa e exibem alerta; controles bloqueados durante criação. Novo fluxo retorna 503 em produção/provider externo; SQL apenas mantém referência parametrizada à coluna existente, sem validação externa ou alteração de schema.
- 666 testes/57 arquivos, tipos e build aprovados; lint sem erros/três avisos anteriores, audit sem vulnerabilidades. Revisão focada pre-commit-review/segurança, diff e segredos sem bloqueios relacionados; SPEC local e backlog QA atualizados.
- QA visual/responsivo e integrações reais não executados. Rascunho permanece salvo ao abandonar editor; sem novas dependências, commit ou push nesta entrega.

## 2026-10-14 23:18 BRT — chore — Preparação da SPEC NPCs da mesa
- SPEC local de NPCs planejada com vínculo obrigatório à mesa atual e autorização por dono; reutilização do editor e modelo existentes.
- Preparação única via teste isolado `tests/notes-preparation.test.ts`: test-memory sem DATABASE_URL, modelo atual sem alteração de schema, seeds 8 fichas/3 mesas e integridade aprovada. Sem reset de servidor corrente, autenticação ou banco externo.

## 2026-10-14 23:05 BRT — fix — Continuidade da auditoria da aplicação
- Arquivos: `lib/auth0.ts`, `lib/availability.ts`, `lib/dev-db.ts`, API/component de disponibilidade, `next.config.mjs`, `lib/character-summary.ts`, páginas de ficha/resumo e testes correspondentes.
- Produção ignora DEV_AUTH_BYPASS e exige sessão Auth0; testes com SDK simulado, sem alegação de login real.
- Horários persistidos por mesa em memória; destaque por identidade, rascunho único para exibir/enviar e edição preservada em falhas HTTP/rede/JSON com alerta e liberação dos controles. POST preserva sugestão e PATCH alterna/cria uma vez.
- Segurança: API valida origem, participação/dono por campanha, identificadores/datas/intervalos/JSON e não expõe detalhes internos; leitura privada/no-store.
- Build volta a verificar TypeScript; teste isolado do verificador Next rejeita erro proposital e aceita código válido. Projeção única preserva autorização e corrige habilidades zeradas no resumo por chaves incorretas.
- 647 testes/55 arquivos aprovados, TypeScript/build aprovados, lint sem erros/três avisos anteriores e audit sem vulnerabilidades. Revisão focada de segurança/pre-commit e segredos realizada; documentação local sincronizada.
- Sem dependências novas, reset externo, commit ou push. QA visual, Auth0/SQL/LiveKit reais e pipeline externa não verificados. Execuções focadas emitiram aviso de encerramento tardio do Vite; suíte completa encerrou com sucesso.

## 2026-10-14 21:50 BRT — feat — Convite e regras de criação da mesa
- Arquivos: APIs/formulários de campanhas e personagens, `lib/campaign-invitations.ts`, `lib/campaign-exception-options.ts`, `lib/dev-db.ts`, `components/campaign-creation-gate.tsx`, serviços/catálogos de clã/predação, validação/conclusão, disponibilidade e testes correspondentes.
- Narrador define exceções predefinidas opcionais somente na criação da mesa e recebe link reutilizável. Convite usa token aleatório/hash no servidor, fragmento no link e consulta POST autenticada/no-store com DTO mínimo.
- Nova ficha pergunta por mesa planejada: sem mesa segue independente; com convite mostra restrições/exceções e exige ciência. Aceite cria primeiro rascunho vinculado e concede acesso como jogador, sem aprovar ficha/pertences, elevar papel ou dispensar convocação da sessão.
- Restrições/exceções canônicas aplicadas nos catálogos, escolhas, edição e validação final. Painel individual removido, endpoint antigo retorna 410 sem mutação e política das novas mesas não é editável depois da criação. Cópia não transfere acesso/ciência.
- Segurança: identificação do dono em memória e permissão de sugestão específica da mesa corrigidas para que Narrador de outra campanha ingresse sem privilégios de planejamento. Token não é persistido em ficha/ledger; testes cobrem 401/403, origem, falsificação, ciência, privacidade, tipos, clãs, duplicação e isolamento.
- 628 testes/51 arquivos, TypeScript/build aprovados, lint sem erros/3 avisos anteriores e audit sem vulnerabilidades; revisão focada de segurança/pre-commit, diff e segredos aprovada. Documentação local sincronizada, sem commit/push solicitado.
- Proteção de origem/JSON e confirmação da identidade também na aceitação; tentativa cross-site recusada sem criar vínculo. Revalidação final em 21:56 BRT mantém 628 testes/51 arquivos e tipos/lint/build/audit aprovados.
- Limites: convites de novas mesas em memória, reutilizáveis, sem expiração/rotação, exibidos uma vez ao Narrador. Copiar antes de sair e distribuir somente aos convidados. SQL/produção indisponível; sem migração de mesas antigas, QA visual/Auth0 multiusuário e integrações externas não executados.

## 2026-10-14 21:27 BRT — chore — Preparação da SPEC regras da mesa
- Preparação isolada do provider em memória via teste/script existente: ambiente não produtivo sem DATABASE_URL, reset único no processo, modelo vigente e seeds de 8 fichas/3 campanhas com relações íntegras. Nenhum servidor corrente, autenticação ou banco externo alterado.
- SPEC atualizada: convite válido + ciência concede vínculo inicial como jogador; ID da campanha isolado não concede acesso. Exceções predefinidas somente na criação, sem override individual posterior.

## 2026-10-14 20:18 BRT — fix — Mesa virtual somente após convocação
- Arquivos: `components/livekit/livekit-room-link.tsx` e `tests/campaign-call-ui.test.ts`.
- Card completo oculto para jogador sem convocação ativa confirmada, inclusive carregamento/erro; consulta periódica permanece montada para exibir o card após convocação. Narrador mantém painel e diagnóstico, sem liberação da entrada em erro.
- 616 testes/49 arquivos aprovados, cobrindo ausência/ativação, erro com dados em cache e visão do Narrador. Revisão focada preserva hooks, autorização/token no servidor e isolamento; nenhuma nova dependência/credencial. Não implementa provider externo de convocação, que segue indisponível. QA visual/SQL/LiveKit reais posteriores.
- TypeScript/build aprovados; lint sem erros/3 avisos anteriores, audit sem vulnerabilidades e diff focado sem erros de whitespace. Nenhum commit solicitado nesta alteração.

## 2026-10-14 01:00 BRT — chore — Exportação Sonar e revisão pré-commit
- Arquivos: `package.json`, `sonar-export.ps1`, `tests/sonar-export.test.ps1`; candidato inclui correções das duas rodadas Sonar descritas abaixo.
- Comando `pnpm sonar:export` pagina issues abertas do SonarCloud usando token/projeto do ambiente, sem credenciais embutidas. Página vazia antes do total interrompe execução sem substituir export, evitando loop infinito.
- Self-check PowerShell valida paginação, token ausente e página vazia sem rede/escrita; package JSON validado. Correções de aplicação previamente validadas com 614 testes/49 arquivos, tsc/build aprovados, lint sem erros/3 avisos prévios e audit sem vulnerabilidades. Revisão conforme pre-commit-review preserva permissões, validação e ledger; nenhum segredo novo identificado.
- Fora do commit: env, specs/backlogs locais, export JSON, exclusões `.kiro`, arquivos gerados e alterações não relacionadas de label/seed. Não executado scan/export real ou QA manual; achados restantes continuam pendentes.

## 2026-10-14 00:48 BRT — refactor — Segunda rodada Sonar
- Arquivos: rota de override de predação, páginas de ficha/resumo, normalização de avisos de predação e calendário de disponibilidade; testes de rotas de Narrador e normalização textual.
- Separadas validação do pedido e criação/revogação de overrides para reduzir complexidade; mesma autorização, revisão, códigos de erro e registro em ledger. Cobertas entradas malformadas, regras não permitidas e revogação inexistente.
- Helper textual da rodada anterior reutilizado nos resumos e avisos de dados legados para impedir stringificação de objetos. Reducer do calendário com escopos claros e dependência estável no useMemo.
- 614 testes/49 arquivos aprovados. Export ainda contém 227 achados e trechos anteriores às correções; nenhum novo scan executado, sem alegação de relatório zerado. Revisão focada preserva autenticação/isolamento, regras e dados, sem novas dependências/segredos. Pendências na triagem local; QA manual/SQL/LiveKit posteriores.
- TypeScript/build aprovados, lint sem erros/3 avisos anteriores (aviso do calendário corrigido), audit sem vulnerabilidades; diff focado sem erros de whitespace. Nenhum commit nesta rodada.

## 2026-10-14 00:34 BRT — fix — Triagem dos achados Sonar
- Arquivos: `lib/vtm-v5/text.ts`, normalização de ficha, serviços/APIs de predação, `lib/characters.ts`, especialidades, estado de sessão, clãs e painéis de calendários/override; testes em `tests/sonar-input-normalization.test.ts`.
- Evitada conversão implícita de objetos em texto para nomes, convicções, clã, predação e listas; strings/números finitos preservados. Ordenação numérica explícita, escopos/indentação claros sem alterar condições, rejeições Promise com Error e type submit no botão de override.
- 227 achados avaliados por categoria; triagem e pendências registradas localmente em `codex/backlog/sonar-triagem.md`. Sem substituições indiscriminadas de roles acessíveis nem paralelização de transações; contrato assíncrono do token mantido. Complexidade, chaves e demais ajustes cosméticos permanecem em backlog, sem declarar resolução completa.
- 607 testes/49 arquivos aprovados, incluindo entradas malformadas e objetos com toString malicioso. Revisão de segurança focada preserva autenticação/autorização, transações e validações; sem novos segredos/dependências. Export original preservado; nenhum novo scan Sonar ou QA manual/SQL/LiveKit realizado.
- TypeScript/build aprovados, lint sem erros (4 avisos anteriores), audit sem vulnerabilidades; diff focado sem erros de whitespace. Nenhum commit solicitado nesta rodada.

## 2026-10-14 00:17 BRT — feat — Configuração inicial de clãs e predações
- Arquivos: API e formulário de criação de campanhas, `lib/campaigns.ts`, `lib/campaign-clans.ts`, `lib/character-clans.ts` e testes de criação.
- Narrador escolhe clãs/predações ao criar mesa em memória; servidor valida catálogo, duplicatas e autorização. Seleção de clã respeita configuração persistida, sem expor orientações privadas ao jogador. SQL externo retorna indisponibilidade para configuração não implementada.
- Revisão pré-commit inclui funcionalidades de ficha/convocação/layout registradas nas entradas anteriores. Mantidos fora `.env`, specs/backlogs, exclusões `.kiro`, arquivos gerados, label local de calendário e alteração textual de seed. Corrigido JSON inválido local do package.json restaurando formato anterior; sem alteração de dependências.
- Candidato validado com 598 testes/48 arquivos, TypeScript e build aprovados, lint sem erros (4 avisos anteriores) e auditoria sem vulnerabilidades. Staging conferido sem arquivos locais proibidos, padrões de credenciais ou erros de whitespace. Autorização, isolamento, concessões/XP e emissão de tokens revisados conforme pre-commit-review; funcionalidades externas não validadas permanecem indisponíveis, sem alegação de prontidão SQL/LiveKit. QA manual posterior.
- Candidato validado com 598 testes/48 arquivos, TypeScript e build aprovados, lint sem erros (4 avisos anteriores) e auditoria sem vulnerabilidades. Staging conferido sem arquivos locais proibidos, padrões de credenciais ou erros de whitespace. Autorização, isolamento, concessões/XP e emissão de tokens revisados conforme pre-commit-review; funcionalidades externas não validadas permanecem indisponíveis, sem alegação de prontidão SQL/LiveKit. QA manual posterior.

## 2026-10-13 23:54 BRT — style — Ordem da gestão da mesa
- Arquivos: `app/campaigns/[id]/page.tsx` e `tests/campaign-layout-order.test.ts`.
- Conteúdo após o título: anotações, calendários, acesso à sessão, início da noite, revisões/gestão e depois clãs e predações. Reutilizados componentes existentes, sem novas dependências, endpoints ou alterações de dados/permissões.
- Testes de ordem e presença única dos painéis adicionados; 593 testes/47 arquivos aprovados. Revisão focada preserva autorização no servidor e sequência DOM/teclado, sem novos segredos. QA visual/responsividade permanece posterior.
- TypeScript/build aprovados, lint sem erros (4 avisos anteriores), audit sem vulnerabilidades; diff focado sem problemas de whitespace.

## 2026-10-13 22:40 BRT — fix — Aprovação somente para fichas vinculadas
- Arquivos: `lib/character-specialties.ts`, `lib/predator-effects.ts`, `lib/characters.ts`, `lib/dev-db.ts`, `lib/possessions.ts`, `lib/character-rolls.ts`, API de rolagens, formulário, painéis de especialidades/rolagens e testes correspondentes.
- Pertences e especialidades gratuitas, de predação e compradas com XP recebem aprovação automática em fichas independentes. Cópias independentes recebem concessões próprias; compras continuam custando 3 XP, com retry idempotente.
- Interface permite cadastrar pertence em ficha salva sem mesa e explica a dispensa. Proprietário independente pode aplicar especialidade aprovada em rolagem pública; rolagens secretas e revisão em mesa continuam restritas ao Narrador.
- Segurança: vínculo derivado do servidor (inclusive no INSERT SQL), sem aceitar campanha/status enviados como autoridade; limites, habilidades, saldo e isolamento preservados. Testes reais cobrem dispensa, XP/retry, predação/cópia, autorização e rolagens; 591 testes/46 arquivos aprovados, auditoria sem vulnerabilidades. Revisão de segurança focada na alteração, sem aprovação do restante do WIP.
- Sem migração de registros anteriores em memória. QA visual e integração PostgreSQL não executados. Entrada futura em mesa deve reavaliar aprovações no fluxo de vínculo ainda pendente.
- TypeScript e build aprovados; lint sem erros (4 avisos anteriores), diff focado sem problemas de whitespace.

## [2026-10-13] Resumo somente com itens preenchidos
**Horário:** 22:01 BRT
**Tipo:** fix | style
**Arquivos principais:** components/character-summary/summary-merits.tsx, components/character-summary/summary-disciplines.tsx, components/character-summary/summary-header.tsx, lib/vtm-v5/summary.ts, tests/character-summary-filled.test.ts

- Resumo oculta nomes vazios/whitespace/placeholders Sem nome, vantagens/defeitos e disciplinas vazias, poderes sem nome e textos de ausência. Colunas/seções sem conteúdo não aparecem; itens nomeados/notas continuam visíveis sem nível zero presumido.
- Filtragem somente de apresentação: nenhum dado/ponto/poder é apagado, cálculos/recursos zero válidos e autorizações permanecem inalterados. Nome padrão do personagem passa a título neutro Resumo da ficha.
- 584 testes/46 arquivos, TypeScript/lint/build aprovados (4 avisos anteriores), auditoria sem vulnerabilidades. QA manual posterior.

## [2026-10-13] Chaves únicas no relatório de validação
**Horário:** 21:45 BRT
**Tipo:** fix
**Arquivos principais:** app/characters/character-form-client.tsx, tests/vtm-v5-creation-guidance.test.ts

- Confirmada colisão: múltiplas disciplinas sem poderes usam código/campo iguais em mensagens diferentes. Chaves dos erros/avisos passam a incluir a posição no snapshot, sem suprimir mensagens nem mudar contratos de validação.
- 24 testes específicos, assert JSX, TypeScript e lint aprovados. QA manual/build não repetidos nesta correção de chave.

## [2026-10-13] Poderes editáveis em disciplinas concedidas
**Horário:** 21:39 BRT
**Tipo:** fix
**Arquivos principais:** app/characters/character-form-client.tsx, lib/vtm-v5/discipline-editor.ts, tests/discipline-editor.test.ts

- Corrigida origem do bloqueio: concessões persistem nível com powers vazio; edição mapeava array vazio e descartava texto digitado. Carregamento inicializa uma entrada independente por ponto, sem escolher poderes automaticamente nem apagar existentes/notas adicionais.
- 569 testes/45 arquivos, TypeScript/lint/build aprovados (4 avisos anteriores), auditoria sem vulnerabilidades. QA manual de navegador posterior.

## [2026-10-13] Concessões contam no preenchimento de vantagens/defeitos
**Horário:** 21:35 BRT
**Tipo:** fix
**Arquivos principais:** lib/vtm-v5/normalize.ts, app/characters/character-form-client.tsx, tests/vtm-v5-creation-guidance.test.ts

- Conforme decisão do usuário, concessões de clã/predação entram no total de vantagens/defeitos exibido e validado. Removido desconto de creationAdvantageDots/creationFlawDots; origens e aplicação/reversão das concessões preservadas.
- Limites do perfil mantidos: concessões de defeitos ajudam a atingir o mínimo e concessões de vantagens também podem atingir/exceder o limite. Metadados não podem mais mascarar a contagem real.
- 563 testes/45 arquivos, TypeScript/lint/build aprovados (4 avisos anteriores), auditoria sem vulnerabilidades. QA manual posterior.

## [2026-10-13] Legenda e feedback de concessão gratuita
**Horário:** 21:29 BRT
**Tipo:** fix | style
**Arquivos principais:** app/characters/character-form-client.tsx, components/character-summary/character-specialties.tsx, tests/character-specialties-selector.test.ts

- Legenda de pontos manuais em vermelho, mantendo concessões automáticas em azul.
- Concessão gratuita mostra processamento, resultado junto ao botão (habilidade/nome, nenhum XP gasto e aprovação real) e destaca a especialidade adicionada. Não confundir concessão pendente com bônus ativo ou aumento de pontos da habilidade; regras/autorizações e retry idempotente preservados.
- Suíte 561 testes/45 arquivos, TypeScript/lint/build aprovados (4 avisos anteriores), auditoria sem vulnerabilidades. QA manual de navegador posterior.

## [2026-10-13] Aba Disciplinas contextual e mais limpa
**Horário:** 21:23 BRT
**Tipo:** fix | style
**Arquivos principais:** app/characters/character-form-client.tsx, lib/vtm-v5/discipline-editor.ts, tests/discipline-editor.test.ts, tests/character-form-identity.test.ts

- Ficha inicia com uma linha vazia; carregamento ordena concessões primeiro, disciplinas manuais depois e mantém um espaço vazio, respeitando limite vigente de sete. Botão existente permite adicionar outras; dados/poderes preenchidos não são descartados, mesmo com nome ainda vazio.
- Instruções por tipo/perfil usam regras existentes: 3 pontos 2+1 para vampiros jogadores, ponto adicional de predação sem duplicação, poderes por ponto; sangue-fraco sem pacote comum, NPCs com definição do Narrador e carniçal com template nível 1/revisão acima dele. XP do perfil separado da distribuição inicial.
- 19 testes específicos e suíte 559 testes/45 arquivos, tipos/lint/build aprovados (4 avisos anteriores). QA visual posterior; sem alterações de autorização ou regras mecânicas.
- Auditoria de dependências sem vulnerabilidades conhecidas.

## [2026-10-13] Concessões automáticas destacadas em azul
**Horário:** 21:17 BRT
**Tipo:** fix | style
**Arquivos principais:** lib/vtm-v5/creation-grants.ts, lib/characters.ts, app/api/characters/route.ts, app/characters/character-form-client.tsx, components/character-summary/, app/globals.css, UI-GUIDE.md, design-system.md

- Concessões existentes de clã/predação são projetadas por origem e ID, sem copiar estado privado ou confiar em metadata do cliente. Pontos de disciplinas/vantagens/defeitos ficam azuis na edição; resumo indica quantidade/origem em azul e especialidades de predação também são destacadas, mantendo status de aprovação.
- Atualização após confirmar usa o ID retornado pelo salvamento, inclusive primeira criação; concessões aparecem automaticamente sem recarregar manualmente. Não cria pontos adicionais, não escolhe poderes de Disciplina nem substitui pontos manuais.
- Token azul --grant-origin documentado no design system; rótulos/aria diferenciam clã/predação sem depender apenas da cor. Edição de disciplina não reduz abaixo dos pontos concedidos; validação do servidor continua autoritativa.
- Validação: 548 testes/44 arquivos, TypeScript/build/lint aprovados (4 avisos anteriores), auditoria sem vulnerabilidades. QA visual posterior; sem commit solicitado.

## [2026-10-13] Confirmação de predação sem salvamento manual prévio
**Horário:** 21:04 BRT
**Tipo:** fix
**Arquivos principais:** components/predator-types/player-predator-selector.tsx, tests/clan-predator-selectors.test.ts

- Removida mensagem de pré-requisito de rascunho; confirmação usa o salvamento automático existente e o ID retornado. Falha real informa os campos a corrigir, sem aplicar efeitos a ficha inexistente nem ignorar validações.
- 9 testes e lint aprovados; build/QA manual não repetidos para este ajuste de comunicação.

## [2026-10-13] Seleção recolhível de predação
**Horário:** 20:56 BRT
**Tipo:** fix | style
**Arquivos principais:** components/predator-types/player-predator-selector.tsx, tests/clan-predator-selectors.test.ts

- Catálogo recolhe ao selecionar e pode ser reaberto; revisão, especialidade, disciplina e alternativas ficam visíveis antes de Confirmar escolha. Selecionar não grava automaticamente.
- Confirmação salva o rascunho e usa o ID retornado, inclusive na primeira criação; remoção reabre o catálogo. Autorizações/regras do servidor preservadas.
- 14 testes específicos, TypeScript e lint aprovados. Foco direcionado à revisão e erros visíveis mesmo com catálogo recolhido; build/QA manual não repetidos.

## [2026-10-13] Nome e Sire no início da Identidade
**Horário:** 20:46 BRT
**Tipo:** style
**Arquivos principais:** app/characters/character-form-client.tsx, tests/character-form-identity.test.ts

- Nome do personagem e Sire movidos para o primeiro bloco da aba Identidade, antes da classificação/clã/predação, sem duplicar entradas ou alterar salvamento.
- 8 testes específicos e lint aprovados; build/QA visual não repetidos neste ajuste de ordem.

## [2026-10-13] Cálculos da Potência do Sangue CORE_V5
**Horário:** 20:43 BRT
**Tipo:** feat | fix
**Arquivos principais:** lib/vtm-v5/blood-potency.ts, lib/character-blood-potency.ts, lib/characters.ts, app/api/characters/[id]/blood-potency-effects/route.ts, components/character-summary/blood-potency-summary.tsx, app/characters/character-form-client.tsx, app/characters/[id]/character-summary-client.tsx, tests/blood-potency.test.ts

- Catálogo/cálculo único dos seis campos para níveis 0–5 conforme tabela fornecida no backlog, alimentação estruturada e exceções Caitiff/sangue-fraco. Fonte local identificada; não alegar conferência independente dos livros. Níveis 6–10 e outros perfis exibem erro, sem números presumidos.
- Criação/edição exibem prévia somente leitura e resumo consulta projeção autorizada; API calcula a partir da Potência real no servidor, não dos derivados do navegador. Campos legados não são migrados nem usados como autoridade; alterações forjadas recusadas na criação/edição geral.
- Cálculo não grava estado, rola dados, executa cura/alimentação ou altera Fome/danos; atualização de Potência mantém comandos/revisão/ledger existentes.
- Preparação PS em memória isolada concluída uma vez pelo script vigente, modelo/seeds e integridade OK (8 fichas/3 mesas), sem modificar banco externo/servidor corrente.
- 23 testes específicos e suíte 544 testes/43 arquivos aprovados; build aprovado. Modificadores por vantagens, Companion, perfis de campanha e execução das ações mecânicas permanecem pendentes; QA manual/SQL não executados.
- TypeScript e lint aprovados (0 erros/4 avisos anteriores), auditoria sem vulnerabilidades conhecidas; revisão de segurança/diff/scan sem achados críticos ou altos relacionados.
- TypeScript e lint aprovados (0 erros/4 avisos anteriores), auditoria sem vulnerabilidades conhecidas; revisão de segurança/diff/scan sem achados críticos ou altos relacionados.

## [2026-10-13] Planejamento de Potência do Sangue e convocação da mesa
**Horário:** 20:28 BRT
**Tipo:** feat | docs | fix
**Arquivos principais:** lib/campaign-calls.ts, app/api/campaigns/[id]/call/route.ts, app/api/livekit/room/route.ts, components/livekit/livekit-room-link.tsx, app/characters/page.tsx, tests/campaign-calls.test.ts, tests/campaign-call-ui.test.ts

- Workflow de autopreenchimento organizado em requirements/design/tasks/meta locais; fontes, preparação, cálculo, API/UI, ações mecânicas e validações dependentes. Nenhum valor de Potência calculado nesta entrega; fontes não conferidas não são inventadas.
- Preparação da convocação: reset único em memória isolada, modelo vigente/seeds, 8 fichas/3 mesas e integridade OK; nenhum PostgreSQL ou servidor em execução modificado.
- Narrador atual convoca/encerra; participantes recebem entrada em Suas criaturas, por mesa deduplicada/nomeada, atualizada por foco/polling de 5s. Entrada como host não convoca implicitamente; Narrador deve preparar a sala.
- API valida sessão/participação atual/CSRF/JSON/UUID; status sem token. Entrada do jogador exige convocação no servidor e revalida acesso após geração; host é o Narrador atual. Erros internos protegidos e respostas no-store.
- MVP somente em memória de dev, indisponível em SQL/produção; não representa GameSession P1. Encerrar bloqueia novas entradas, mas não revoga JWTs já emitidos ou desconecta usuários remotamente por SDK.
- Validação: 9 testes específicos e suíte 521 testes/42 arquivos aprovados; TypeScript/build aprovados, lint sem erros (4 avisos anteriores), audit sem vulnerabilidades e scan/diff-check sem achados. Conexão LiveKit real e QA manual posteriores; sem commit solicitado.

## [2026-10-13] Identidade e validação em todas as etapas
**Horário:** 20:07 BRT
**Tipo:** fix | style
**Arquivos principais:** app/characters/character-form-client.tsx, tests/character-form-identity.test.ts

- Removidas entradas redundantes de clã/predação para vampiro jogador, definidos pelos seletores; XP total/gasto/disponível apresentado como resumo, sem inputs.
- Geração, Sire, Potência de Sangue e detalhes de sangue permanecem manuais: não há cálculo automático desses detalhes no código atual. Campos de clã/predação para NPCs/retentores preservados.
- Validação disponível no rodapé de todas as abas; salva antes de validar e trata falha de conexão sem bloquear permanentemente o botão. Campos de sangue desmontados não são apagados ao salvar em outra aba.
- Validações: 8 testes específicos de renderização (7 etapas + identidade), suíte 512 testes/40 arquivos, TypeScript, lint dos arquivos e build aprovados; auditoria sem vulnerabilidades. Rotas/autorização e autoridade dos campos derivados mantidas; QA manual posterior.

## [2026-10-13] Preparação de commit — anotações e gestão contextual
**Horário:** 19:23 BRT
**Tipo:** feat | fix | style
**Arquivos principais:** app/api/campaigns/[id]/clans/route.ts, app/api/campaigns/[id]/predator-types/route.ts, components/character-summary/campaign-clans.tsx, components/predator-types/master-catalog.tsx, components/duplicate-character-button.tsx, app/characters/page.tsx

- Gestão exibe somente clãs/predações representados entre os participantes, deduplicando aliases e ignorando fichas de outra mesa. Rotas permanecem restritas ao Narrador atual; testes validam autenticação, ID, autorização e ausência de dados privados das fichas.
- Rótulos da listagem simplificados para Vinculados/Desvinculados e ação Duplicar, sem mudar a duplicação independente.
- Commit inclui P2 em memória e ajustes da mesa/ficha já documentados; specs/backlogs locais, exclusões .kiro, arquivos gerados, label local do calendário e configuração de clãs/predações na criação da campanha ficam fora.
- Pré-commit: 502 testes/39 arquivos aprovados e 13 testes específicos de rotas após ampliar cobertura; TypeScript e lint sem erros (4 avisos anteriores), diff e scan de segredos aprovados. Sem push solicitado.
- Build de produção aprovado e pnpm audit sem vulnerabilidades conhecidas na revisão pré-commit.
- Build de produção aprovado e pnpm audit sem vulnerabilidades conhecidas na revisão pré-commit.

## [2026-10-13] Ordem dos seletores de identidade
**Horário:** 19:18 BRT
**Tipo:** style
**Arquivos principais:** app/characters/character-form-client.tsx

- Seletor de clã exibido antes de predação, sem alterar regras, permissões ou salvamento.

## [2026-10-13] Gestão contextual da mesa e catálogo inicial de clãs
**Horário:** 19:07 BRT
**Tipo:** feat | fix
**Arquivos principais:** components/master-panel.tsx, components/notes/campaign-notes-dialog.tsx, components/notes/notes-panel.tsx, app/campaigns/[id]/page.tsx, components/character-summary/character-clan.tsx, app/characters/character-form-client.tsx

- Revisão de pertences aparece somente com pendências; revalidação após revisão, foco e a cada 15 segundos detecta novas solicitações. Concessão e XP permanecem disponíveis.
- Anotações destacadas no topo da gestão abrem dialog modal nativo sem sair da mesa; fechar mantém o rascunho montado. Novas anotações usam o contexto da mesa e continuam privadas por padrão.
- Participantes possuem link para ficha resumida, reutilizando autorização do proprietário/Narrador atual, com teste de revogação após troca e desvínculo.
- Catálogo público de clãs disponível antes do primeiro rascunho; confirmação salva a ficha e usa o ID/revisão retornados, mantendo validação da política no servidor.
- Preparação da SPEC em processo isolado de testes: reset único de memória, modelo atual e seeds (8 personagens/3 mesas), integridade aprovada; nenhum banco externo ou servidor em execução alterado.
- Testes específicos: 19 aprovados em 4 arquivos; build aprovado e auditoria sem vulnerabilidades conhecidas. QA manual posterior; notas permanecem exclusivamente em memória no desenvolvimento.
- Suíte completa: 502 testes/39 arquivos; TypeScript aprovado, lint sem erros (4 avisos preexistentes). Revisão de segurança desta SPEC sem achados críticos/altos; não constitui aprovação de alterações anteriores para commit.


## [2026-10-13] Predações de personagens sem mesa
**Horário:** 19:02 BRT
**Tipo:** fix
**Arquivos principais:** lib/predator-types.ts, tests/predator-types-security.test.ts

- Catálogo e validação de gravação liberam Livro básico e Livro do Jogador para personagens independentes, mantendo as restrições das campanhas.
- Regressão cobre catálogo, isolamento de referências, gravação sem mesa e rejeição após vínculo restrito. Suíte: 493 testes aprovados em 37 arquivos.
- TypeScript sem emissão e lint dos arquivos alterados aprovados. Sem alteração das autorizações ou dos dados existentes; build e QA visual não repetidos nesta correção.

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

## [2026-10-13] — P2 em memória, planejamento P1 e validação do backlog

**Horário:** 15:00 BRT
**Tipo:** feat | fix | docs
**Arquivos principais:** `lib/notes.ts`, `lib/notes-http.ts`, `lib/availability.ts`, `lib/dev-db.ts`, `app/api/notes/`, `app/notes/page.tsx`, `components/notes/notes-panel.tsx`, `app/characters/page.tsx`, `app/characters/[id]/character-summary-client.tsx`, `components/campaign-calendar/event-card.tsx`, `components/awake-panel.tsx`, `tests/notes*.test.ts`, `codex/specs/sistema-anotacoes/`, `codex/specs/modo-sessao/`, `codex/backlog/backlog-mestre.md`, `codex/backlog/validacao-implementacao.md`, `codex/specs/README.md`.

- P2: notas pessoais/exclusivas do Narrador atual, compartilhamento explícito somente leitura/revogação, CRUD revisado/idempotente e backlinks para fichas/NPCs/eventos/noites; projeções omitem alvos secretos e contagens ocultas. Armazenamento exclusivamente dev/test em memória, SQL/produção explicitamente indisponíveis.
- Corrigida participação de dev no helper compartilhado, sem acesso universal. APIs validam entrada/limites em streaming, CSRF/sessão, UUIDs/IDs Auth0, autoria/status e revisões; nenhuma publicação realtime ou log de texto privado.
- Editor/listagem paginada e opções autorizadas, confirmação de compartilhar/excluir, cache por perfil/perda de acesso e links contextuais. Cópia de ficha não copia notas; exclusão de entidade no provider remove relações sem apagar texto pessoal.
- P1 planejado em requirements/design/tasks/meta: sessão real distinta de noite/sala, LiveKit existente, comandos canônicos, SSE autorizado/reconexão e ferramentas contextuais. Oito tasks pending; nenhum código P1/reset dessa SPEC.
- Oito itens do backlog confrontados com código/testes; ambas as tabelas repetidas atualizadas sem limpar registros históricos. Itens, sessão central/realtime e exclusões seguem parciais/pendentes; duplicação e núcleo de rolagens já testados.
- Validações: 490 testes/37 arquivos, tipos aprovados com incremental desabilitado para evitar diagnóstico de cache antigo, build aprovado, lint zero erros/quatro avisos preexistentes e auditoria zerada; diff-check/scan sem achados. Review final registrado na SPEC; SQL/LiveKit reais e QA manual não executados. Nenhum commit/staging/push solicitado nesta rodada.

## [2026-10-13] — Preparação P2 de anotações

**Horário:** 14:39 BRT
**Tipo:** chore | docs
**Arquivos principais:** `tests/notes-preparation.test.ts`, `scripts/prepare-v5-development.mjs`, `codex/specs/sistema-anotacoes/tasks.md`, `CHANGELOG.md`.

- Confirmada configuração efetiva de desenvolvimento somente em memória, sem DATABASE_URL. Script existente usado no processo isolado de testes, sem alterar servidor em execução, conexão externa ou autenticação.
- Reset/inicialização descartável e seeds validados: duas mesas de testes, jogadores, personagem independente, NPC reservado, evento e noite registrada. Relações/integridade aprovadas; execuções de teste usam fixtures isoladas e não resetam banco persistente.
- Preparação registrada antes de desenvolver o módulo; SESSION referencia noite registrada, não sala LiveKit. Membership permissivo de dev será corrigido no helper compartilhado.

## [2026-10-13] — Preparação P2 de anotações

**Horário:** 14:39 BRT
**Tipo:** chore | docs
**Arquivos principais:** `tests/notes-preparation.test.ts`, `scripts/prepare-v5-development.mjs`, `codex/specs/sistema-anotacoes/tasks.md`, `CHANGELOG.md`.

- Confirmada configuração efetiva de desenvolvimento somente em memória, sem DATABASE_URL. Script existente usado no processo isolado de testes, sem alterar servidor em execução, conexão externa ou autenticação.
- Reset/inicialização descartável e seeds validados: duas mesas de testes, jogadores, personagem independente, NPC reservado, evento e noite registrada. Relações/integridade aprovadas; execuções de teste usam fixtures isoladas e não resetam banco persistente.
- Preparação registrada antes de desenvolver o módulo; SESSION referencia noite registrada, não sala LiveKit. Membership permissivo de dev será corrigido no helper compartilhado.

## [2026-10-13] — Preparação e revisão do commit

**Horário:** 14:29 BRT
**Tipo:** chore | docs
**Arquivos principais:** `CHANGELOG.md`, `codex/specs/vtm-v5-fichas-e-inicio-de-noite/review.md`, `codex/specs/vtm-v5-fichas-e-inicio-de-noite/tasks.md`.

- Revisão pré-commit do candidato de clãs, efeitos/segurança de predação, elegibilidade de especialidades, APIs/UI, testes e instruções. Removidas entradas duplicadas de clãs/especialidades deste changelog, sem remover registros únicos.
- Revalidação: 468 testes/34 arquivos aprovados, TypeScript/build aprovados, lint zero erros/4 avisos preexistentes, pnpm audit zero vulnerabilidades; diff-check e scan direcionado sem achados. Build pula tipos, portanto tsc foi executado separadamente.
- Specs/backlog locais (`codex/` e `.codex/`), exclusões da antiga `.kiro/`, artefatos gerados, script isolado de preparação não reexecutado e mudança avulsa de label do calendário ficam fora do candidato. Nenhum reset, acesso SQL externo ou commit executado. SQL/QA manual continuam posteriores.

## [2026-10-13] — Preparação e revisão do commit

**Horário:** 14:29 BRT
**Tipo:** chore | docs
**Arquivos principais:** `CHANGELOG.md`, `codex/specs/vtm-v5-fichas-e-inicio-de-noite/review.md`, `codex/specs/vtm-v5-fichas-e-inicio-de-noite/tasks.md`.

- Revisão pré-commit do candidato de clãs, efeitos/segurança de predação, elegibilidade de especialidades, APIs/UI, testes e instruções. Removidas entradas duplicadas de clãs/especialidades deste changelog, sem remover registros únicos.
- Revalidação: 468 testes/34 arquivos aprovados, TypeScript/build aprovados, lint zero erros/4 avisos preexistentes, pnpm audit zero vulnerabilidades; diff-check e scan direcionado sem achados. Build pula tipos, portanto tsc foi executado separadamente.
- Specs/backlog locais (`codex/` e `.codex/`), exclusões da antiga `.kiro/`, artefatos gerados, script isolado de preparação não reexecutado e mudança avulsa de label do calendário ficam fora do candidato. Nenhum reset, acesso SQL externo ou commit executado. SQL/QA manual continuam posteriores.

## [2026-10-13] — Planejamento do sistema de anotações P2

**Horário:** 14:14 BRT
**Tipo:** docs
**Arquivos principais:** `codex/specs/sistema-anotacoes/requirements.md`, `codex/specs/sistema-anotacoes/design.md`, `codex/specs/sistema-anotacoes/tasks.md`, `codex/specs/sistema-anotacoes/tasks.meta.json`, `codex/specs/README.md`, `codex/backlog/backlog-mestre.md`, `CHANGELOG.md`.

- Elaborada SPEC do P2 com notas privadas/exclusivas do Narrador, grants explícitos revogáveis e backlinks autorizados de fichas/NPCs/eventos/sessões.
- Dez tarefas dependentes, todas pending: preparação única de memória futura, domínio/APIs/UI, segurança e revisão. Nenhuma implementação/reset ou conexão externa nesta etapa.
- Documentado helper permissivo de participação em dev como pré-requisito de correção; contratos tratam metadados privados, concorrência, lifecycle e decisão de sessão/noite. Sem migração de textos existentes/editor rico/realtime.

## [2026-10-13] — Instruções Ponytail para agentes

**Horário:** 14:08 BRT
**Tipo:** docs
**Arquivos principais:** `AGENTS.md`, `CHANGELOG.md`.

- Adicionado integralmente o bloco solicitado de desenvolvimento mínimo, escopo, reutilização, validação e comunicação de limitações/riscos, preservando as regras existentes.

## [2026-10-13] — Clãs e concessões completas de predação

**Horário:** 13:33 BRT
**Tipo:** feat | fix | docs
**Arquivos principais:** `lib/vtm-v5/clans.ts`, `lib/character-clans.ts`, `lib/creation-effects.ts`, `lib/predator-effects.ts`, `lib/vtm-v5/predator-types/`, `lib/characters.ts`, `lib/vtm-v5/normalize.ts`, `lib/vtm-v5/validation.ts`, `app/api/characters/[id]/clan/route.ts`, `app/api/characters/[id]/predator-type/route.ts`, `app/api/characters/route.ts`, `components/character-summary/character-clan.tsx`, `components/predator-types/player-predator-selector.tsx`, `app/characters/character-form-client.tsx`, `app/characters/[id]/character-summary-client.tsx`, `tests/character-clans.test.ts`, `tests/clans-and-predator-mechanics.test.ts`, `tests/clan-predator-selectors.test.ts`, `tests/predator-types-core.test.ts`, `codex/specs/`.

- Preparação compartilhada da SPEC reutilizada: reset/seeds/integridade em memória concluídos em 12/10/2026 22:01 BRT. Nenhum novo reset, migração, backfill automático ou acesso a banco externo.
- Catálogo versionado dos sete clãs básicos, Caitiff e sangue-fraco; disciplinas 2+1, preferências/categoria específicas, Perdição/Compulsão públicas e orientação separada por perfil. Clãs com referência incompleta não são habilitados.
- Seleção de clã autorizada no servidor, revisão otimista, replay idempotente e ledger; Narrador da mesa retorna ficha a rascunho. Nosferatu/Caitiff recebem defeitos rastreados, com restrições cruzadas e perfil sangue-fraco separado.
- Os 28 predadores materializam disciplina extra, especialidade pendente, traços fixos e escolhas alternativas/distribuições; restrições Tremere/Nosferatu e exceção explícita do Narrador para sangue-fraco. Troca/remoção preserva outras origens, XP e danos; inconsistências são rejeitadas atomicamente.
- Humanidade é recalculada sobre o estado canônico da sessão dentro do comando, preservando mudanças posteriores do Narrador; respostas retornam valores persistidos, não projeções antigas de JSON.
- Formulário e resumo exibem clã, escolhas e regras; confirmação salva o rascunho antes da seleção. Orçamentos excluem concessões automáticas e consideram a disciplina de predação; IDs de traços são preservados. Duplicação copia somente origens públicas, sem aprovação, mesa ou dados privados.
- Validações: 468 testes/34 arquivos, TypeScript/build aprovados; lint zero erros/quatro avisos preexistentes; pnpm audit zero vulnerabilidades; diff-check e scan direcionado sem achados. Build configura skip de tipos, por isso TypeScript foi validado separadamente. Revisão pré-commit direcionada realizada; nenhum commit/staging.
- Referências exclusivamente locais; poderes continuam manuais. Automação contextual de Perdição/Compulsão, catálogo adicional/Alquimia, configuração avançada por mesa e histórico refinado permanecem pendentes. QA de navegador e SQL operacional continuam posteriores, não gates desta entrega em memória.

## [2026-10-13] — Resumo das implementações e pendências das SPECs

**Horário:** 12:35 BRT
**Tipo:** docs
**Arquivos principais:** `codex/specs/resumo-implementacao.md`, `codex/specs/README.md`, `codex/specs/vtm-v5-fichas-e-inicio-de-noite/spec.md`, `CHANGELOG.md`.

- Percorridos os sete diretórios de funcionalidades, documentos de apoio e metadados; consolidado panorama de implementação, limitações, pendências e próximos passos, confrontado com código/rotas/componentes existentes.
- Diferenciados checklists históricos e evidências atuais: auditoria zerada, SQL adiado e QA desejável não constituem bloqueios antigos ainda ativos. Não promovidas tarefas automaticamente; clãs, efeitos de predadores, itens/vínculo e evolução de jogo permanecem parciais.
- README aponta o resumo e caminho atual codex/specs; corrigidos status geral desatualizado da SPEC de fichas e localização da referência de clãs. Atualização exclusivamente documental, sem reset, novos testes de aplicação ou commit; resultados de 385 testes são evidências anteriores.

## [2026-10-13] — Validação de habilidades e seletor de especialidades

**Horário:** 12:18 BRT
**Tipo:** fix | feat | docs
**Arquivos principais:** `lib/vtm-v5/skills.ts`, `lib/vtm-v5/specialties.ts`, `lib/character-specialties.ts`, `lib/characters.ts`, `components/character-summary/character-specialties.tsx`, `app/characters/character-form-client.tsx`, `tests/vtm-v5-skills.test.ts`, `tests/character-specialties-selector.test.ts`, `tests/character-specialties-command.test.ts`, `CHANGELOG.md`.

- Centralizados IDs/rótulos, aliases e validação de pontos inteiros 0–5. Aliases equivalentes deduplicados, conflitos/desconhecidos/valores inválidos diagnosticados. Elegibilidade considera pontos, limites, concessões, opções do predador e especialidades pendentes/aprovadas. API gera opções por compra/grantId, sem confiar no cliente para custo/aprovação.
- Formulário carrega rótulos corretos e salva chaves canônicas; merge parcial substitui aliases editados sem perder outras habilidades. Prefixos em caixa diferente também invalidam aprovação, impedindo bypass de revisão. Seletor acompanha pontos em edição e revisões salvas; antes de confirmar, salva alterações e relê elegibilidade/revisão autoritativas. Falha impede envio; retry já enviado preserva comando/chave.
- Validação: 31 arquivos/385 testes aprovados, TypeScript/build aprovados, lint direcionado sem erros; lint completo zero erros/cinco avisos existentes, pnpm audit zero. Testes de renderização verificam opções salvas/rascunho/sem pontos (não equivalem a QA de navegador). Sem banco externo, reset de SPEC ou commit. Documentação encontrada em codex/ após movimentação externa durante a execução; arquivos locais não adicionados ao staging.

## [2026-10-13] — Endurecimento de segurança de predação

**Horário:** 11:54 BRT
**Tipo:** fix | docs
**Arquivos principais:** `lib/predator-types.ts`, `lib/characters.ts`, rotas de seleção/remoção/override/configuração de predadores, `app/api/migrate/route.ts`, `components/predator-types/master-catalog.tsx`, `tests/predator-types-security.test.ts`, testes adjacentes de rotas, `CHANGELOG.md`; documentação local .codex fora do commit.

- Configurações agora rejeitam objetos/arrays/códigos/campos inválidos e listas excessivas; leituras/gravações em memória isoladas por clone e associadas ao store atual, sem referências compartilhadas após reset. Serviço de configuração reverifica Narrador; UUIDs inválidos e falhas de infraestrutura recebem respostas controladas.
- Seleção/remoção/override usam comandos com autorização e status atuais, revisão e ledger atômicos. Projeção de campos impede escrita econômica/narrativa alheia; mudanças concorrentes são rejeitadas. Política de mesa/restrições são reverificadas na gravação em memória, inclusive escolha preparada antes de desabilitação. Overrides usam allowlist de regras, rejeitam duplicatas ativas e retornam ficha a rascunho.
- Mudança de configuração invalida aprovação das fichas elegíveis já com predador e incrementa revisão, preservando escolhas/recursos, com eventos do Narrador; atualização e auditoria no mesmo commit síncrono em memória/transação SQL planejada. UI comunica necessidade de nova aprovação. Removido backfill automático de predadores da rota administrativa e helper legado, sem executar migração/reset.
- Validação: 29 arquivos/364 testes aprovados, incluindo 12 testes de serviço em memória real e negativos 401/403/UUID/regra/duplicata; TypeScript/build aprovados, lint zero erros/cinco avisos existentes, audit pnpm zero vulnerabilidades e diff-check/scan direcionados sem achados. SQL real continua backlog; não declarar implementação persistente pronta ou efeitos mecânicos completos. Nenhum commit executado.

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

## 2026-10-17 22:55 BRT — chore
- Potência do Sangue: preparação única em processo de testes isolado (`scripts/prepare-v5-development.mjs`), provider/schema em memória atual, seeds e integridade aprovados (8 fichas/3 mesas); nenhum PostgreSQL acessado.
