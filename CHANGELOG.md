## [2026-10-23 00:44 BRT] — fix - Vínculo reutilizável pelo ID da mesa

**Tipo:** fix
**Arquivos principais:** `components/campaign-creation-gate.tsx`, `components/master-panel.tsx`, `app/api/campaign-invitations/route.ts`, `app/api/characters/route.ts`, `app/api/characters/[id]/campaign/route.ts`, `lib/campaign-invitations.ts` e testes de vínculo.

- O Narrador copia o UUID da mesa. Qualquer jogador autenticado pode usar o mesmo ID para criar uma ficha vinculada ou filiar uma ficha independente própria; o servidor registra quem aceitou.
- Compartilhar o ID é o aceite do Narrador e informar o ID é o aceite do jogador. Tokens secretos e aprovações individuais foram removidos; a ficha continua sujeita à revisão e às regras da mesa.
- Validacao: 30 testes focados (4 arquivos) no schema isolado, TypeScript, build de producao, ESLint focado, pnpm audit --prod e git diff --check aprovados. QA visual nao executado.

# CHANGELOG â€” Ledger Command

Registro cronolÃ³gico de todas as alteraÃ§Ãµes relevantes implementadas no projeto.

## [2026-10-23 00:24 BRT] â€” fix - BotÃ£o copia convite para vincular ficha

**Tipo:** fix
**Arquivos principais:** `components/master-panel.tsx`, `app/api/campaigns/[id]/invitation/route.ts`, `lib/campaign-invitations.ts`, `lib/campaign-invitation-link.ts`, testes de convite.

- Os botÃµes de mesa passam a copiar um link de convite completo, com ID e token, em vez de copiar somente o UUID. A criaÃ§Ã£o no painel tambÃ©m mantÃ©m o token retornado para copiar o convite original.
- Narradores podem emitir um novo token para mesas com polÃ­tica de convite; o token anterior deixa de funcionar. Mesas antigas sem essa polÃ­tica nÃ£o sÃ£o convertidas automaticamente.
- ValidaÃ§Ã£o: 11 testes focados de UI/API, integraÃ§Ã£o PostgreSQL no schema isolado `meus_vampiros_test`, TypeScript, ESLint e `git diff --check` aprovados.

## [2026-10-22 23:55 BRT] â€” fix - DiferenciaÃ§Ã£o entre convite e link da chamada

**Tipo:** fix
**Arquivos principais:** `components/campaign-creation-gate.tsx`, `components/livekit/livekit-room-link.tsx`, `lib/campaign-invitation-link.ts`, `tests/campaign-creation-gate.test.ts`.

- O link da chamada deixa de ser apresentado como convite genÃ©rico para participantes.
- Ao tentar usÃ¡-lo para vincular uma ficha independente, a interface explica que Ã© necessÃ¡rio o convite do Narrador com cÃ³digo de acesso.
- ValidaÃ§Ã£o: 9 testes focados, TypeScript, ESLint e `git diff --check` aprovados.

## [2026-10-22 23:50 BRT] â€” fix - Link de participantes abre a sessÃ£o da mesa

**Tipo:** fix
**Arquivos principais:** `components/livekit/livekit-room-link.tsx`, `components/game-session/session-workspace.tsx`, `tests/game-session-workspace.test.ts`.

- O link copiado para participantes agora direciona Ã  sessÃ£o da campanha; a seÃ§Ã£o de videochamada fica acessÃ­vel mesmo antes de iniciar o modo sessÃ£o.
- A entrada na sala continua autorizada pelas APIs existentes, que verificam convocaÃ§Ã£o e participaÃ§Ã£o na mesa.
- ValidaÃ§Ã£o: teste focado de sessÃ£o, TypeScript e ESLint aprovados.

## [2026-10-22 20:36 BRT] â€” style - BotÃµes da confirmaÃ§Ã£o em coluna

**Tipo:** style
**Arquivos principais:** `app/campaigns/new/page.tsx`.

- O identificador da mesa e o link de convite agora aparecem um abaixo do outro, com espaÃ§amento vertical.
- ValidaÃ§Ã£o: diff-check e lint focado pendentes.

## [2026-10-22 20:34 BRT] â€” fix - PredaÃ§Ãµes permitidas por padrÃ£o

**Tipo:** fix
**Arquivos principais:** `app/campaigns/new/page.tsx`, `app/api/campaigns/route.ts`, `tests/campaign-creation.test.ts`.

- O seletor de predaÃ§Ã£o da criaÃ§Ã£o de mesa inicia com todos os tipos do catÃ¡logo marcados; o Narrador desmarca os que nÃ£o aceita.
- A API aplica o mesmo padrÃ£o completo quando a lista nÃ£o Ã© enviada, evitando restriÃ§Ã£o implÃ­cita a tipos do livro bÃ¡sico.
- ValidaÃ§Ã£o: teste unitÃ¡rio do padrÃ£o, TypeScript e ESLint dos arquivos de aplicaÃ§Ã£o aprovados. O arquivo completo de criaÃ§Ã£o de campanha mantÃ©m 3 falhas de integraÃ§Ã£o com `db` nulo no setup local de testes; Vitest tambÃ©m exibe aviso de timeout ao encerrar servidores.

## [2026-10-22 20:20 BRT] â€” feat - PersistÃªncia de sessÃµes para Vercel

**Tipo:** feat, fix
**Arquivos principais:** `lib/game-sessions.ts`, `lib/db.ts`, `components/game-session/session-workspace.tsx`, `lib/character-commands.ts`, APIs do modo sessÃ£o e testes relacionados.

- SessÃµes, vÃ­nculos a noites e encerramentos idempotentes agora usam PostgreSQL, com Ã­ndice garantindo uma sessÃ£o ativa por mesa e autorizaÃ§Ã£o do Narrador revalidada dentro das transaÃ§Ãµes.
- O workspace atualiza snapshots, rolagens e recursos por polling autenticado; removidos SSE/eventos em memÃ³ria e o endpoint sem callers `pages/api/video-meeting.ts`. A integraÃ§Ã£o `app/api/livekit/room` permanece para Ã¡udio/vÃ­deo.
- MigraÃ§Ã£o aditiva aplicada e validada somente no schema local isolado `meus_vampiros_test`; nenhum schema pÃºblico ou banco da Vercel foi alterado.
- ValidaÃ§Ã£o: 10 testes focados aprovados, incluindo migraÃ§Ã£o, persistÃªncia/idempotÃªncia no PostgreSQL isolado; TypeScript, build de produÃ§Ã£o, lint direcionado do cÃ³digo e auditoria de dependÃªncias de produÃ§Ã£o aprovados. ESLint ignora os arquivos de teste pela configuraÃ§Ã£o do projeto.
- Vitest encerrou com cÃ³digo 0 apÃ³s aviso de timeout ao fechar servidores; suÃ­te completa nÃ£o foi repetida e o QA de uma sala LiveKit real permanece pendente.
- RegressÃ£o adicional dos testes antigos de recursos/XP/rolagens: 56 falhas em 3 arquivos porque o provider global `db` foi inicializado sem DATABASE_URL; mesma limitaÃ§Ã£o de testes com `db` nulo jÃ¡ documentada na task-008, fora do escopo desta migraÃ§Ã£o.
- RegressÃ£o adicional dos testes antigos de recursos/XP/rolagens: 56 falhas em 3 arquivos porque o provider global `db` foi inicializado sem DATABASE_URL; mesma limitaÃ§Ã£o de testes com `db` nulo jÃ¡ documentada na task-008, fora do escopo desta migraÃ§Ã£o.
- Vitest encerrou com cÃ³digo 0 apÃ³s aviso de timeout ao fechar servidores; suÃ­te completa nÃ£o foi repetida e o QA de uma sala LiveKit real permanece pendente.

## [2026-10-21 21:28 BRT] â€” feat - Tela central e sincronizaÃ§Ã£o do modo sessÃ£o

**Tipo:** feat, fix
**Arquivos principais:** `app/campaigns/[id]/session/page.tsx`, `components/game-session/session-workspace.tsx`, `lib/game-session-events.ts`, `lib/character-commands.ts`, APIs de sessÃ£o/rolagem/recursos/XP/Awake e testes do modo sessÃ£o.

- Criada tela central para Narrador e participantes com fichas autorizadas, rolagens, recursos, Awake, XP, anotaÃ§Ãµes P2 e sala LiveKit recolhÃ­vel.
- Rolagens, alteraÃ§Ãµes de recursos, XP e Awake aceitam contexto opcional de sessÃ£o e validam autorizaÃ§Ã£o no servidor; mutaÃ§Ãµes confirmadas emitem invalidaÃ§Ã£o apÃ³s o commit.
- Adicionado SSE com payload mÃ­nimo, sequÃªncia, reconexÃ£o via snapshot, limite por usuÃ¡rio, encerramento no abort e revalidaÃ§Ã£o da participaÃ§Ã£o a cada evento/heartbeat.
- ValidaÃ§Ã£o: 19 testes focados, TypeScript, ESLint dos arquivos alterados, build de produÃ§Ã£o e auditoria de dependÃªncias aprovados. NÃ£o foi testada uma sala LiveKit real.
- PendÃªncia: a suÃ­te completa falha em 270 testes de 1.135, em 32 arquivos, com 9 erros recorrentes de `db` nulo; o lint global inclui `.next-backup-*` e reporta erros de artefatos gerados. Lint direcionado passa. A SPEC segue bloqueada atÃ© a resoluÃ§Ã£o dos gates globais.

## [2026-10-21 20:44 BRT] â€” feat - Base do modo sessÃ£o e rolagens independentes do vÃ­deo

**Tipo:** feat, fix
**Arquivos principais:** `lib/game-sessions.ts`, `lib/dev-db.ts`, `app/api/campaigns/[id]/sessions/route.ts`, `app/api/sessions/[id]/route.ts`, `components/livekit/livekit-room-link.tsx`, `lib/call-roll-characters.ts`, `tests/game-sessions.test.ts`, testes da chamada.

- Criadas APIs locais de sessÃ£o com inÃ­cio/encerramento idempotentes, revisÃ£o, vÃ­nculo explÃ­cito a noites da mesma mesa e projeÃ§Ãµes autorizadas. O estado fica em memÃ³ria fora de produÃ§Ã£o; consultas PostgreSQL sÃ£o somente leitura; produÃ§Ã£o retorna indisponÃ­vel atÃ© existir persistÃªncia durÃ¡vel.
- Rolagens passam a aparecer apÃ³s a convocaÃ§Ã£o mesmo antes de conectar o vÃ­deo; apÃ³s conexÃ£o, vÃ­deo e painel ficam lado a lado. A API de fichas para rolagem exige Narrador ou convocaÃ§Ã£o ativa.
- ValidaÃ§Ã£o: 13 testes em trÃªs arquivos, TypeScript e ESLint focados aprovados. O Vitest concluiu com cÃ³digo 0, mas exibiu aviso de timeout ao encerrar servidores.
- Sem DDL ou migraÃ§Ã£o; testes criaram fixtures com UUIDs no schema isolado `meus_vampiros_test`, sem limpeza global.

## [2026-10-21 19:51 BRT] â€” fix - Modo de ficha independente e XP histÃ³rico

**Tipo:** fix
**Arquivos principais:** `app/characters/character-form-client.tsx`, `components/character-form/historical-xp-import.tsx`, `tests/character-form-identity.test.ts`, `tests/historical-xp-import.test.ts`

- O modo de preenchimento aparece antes das abas no formulÃ¡rio independente.
- A importaÃ§Ã£o de XP histÃ³rico atualiza total, gasto e saldo exibidos na ficha.
- ValidaÃ§Ã£o: teste de ordem do formulÃ¡rio e teste de importaÃ§Ã£o histÃ³rica.

## [2026-10-21 19:31 BRT] â€” fix - Seletor de habilidades para rolagem

**Tipo:** fix
**Arquivos principais:** `components/character-summary/character-rolls.tsx`, `tests/character-rolls-ui.test.ts`

- O seletor de habilidades da rolagem exibe somente habilidades com pelo menos um ponto atribuÃ­do.
- ValidaÃ§Ã£o: teste de interface da rolagem aprovado; ESLint do componente sem erros.

## [2026-10-21 15:57 BRT] â€” Nomenclatura canÃ´nica e fontes sem acesso a PDF

**Tipo:** feat, fix, docs
**Arquivos principais:** `.github/ISSUE_TEMPLATE/referencia-de-regra.yml`, `lib/vtm-v5/disciplines.ts`, `lib/vtm-v5/predator-types/`, `lib/vtm-v5/rule-profile.ts`, `app/api/rule-sources/[id]/route.ts`, `components/character-summary/`, `tests/`, `codex/specs/fontes-clicaveis-nomenclatura-en/`

- Disciplinas e tipos de predaÃ§Ã£o passam a usar nomes canÃ´nicos em inglÃªs; aliases portugueses continuam resolvendo escolhas antigas e buscas.
- PDFs nÃ£o sÃ£o mais transmitidos nesta etapa: a rota responde indisponÃ­vel e as fichas mantÃªm a referÃªncia bibliogrÃ¡fica sem link de arquivo.
- Registradas decisÃµes de concessÃ£o explÃ­cita, revisÃ£o de referÃªncias por issue, curadoria adiada e destino de teste PostgreSQL restrito a `meus_vampiros_test`.
- Criado formulÃ¡rio de issue para solicitaÃ§Ãµes de inclusÃ£o/correÃ§Ã£o com publicaÃ§Ã£o, ediÃ§Ã£o, idioma, localizaÃ§Ã£o e evidÃªncia editorial.
- Nenhum schema, seed ou dado persistente foi alterado.

## 2026-10-21 02:24 BRT - fix - PredaÃ§Ãµes sem mesa nÃ£o exigem habilitaÃ§Ã£o do Narrador
- Arquivos principais: `app/api/predator-types/route.ts`, `app/api/characters/[id]/predator-type/route.ts`, `lib/predator-types.ts`, testes das rotas e serviÃ§os de predaÃ§Ã£o.
- Fichas independentes podem consultar e aplicar tipos de predaÃ§Ã£o de qualquer fonte sem habilitaÃ§Ã£o de uma mesa. Fichas vinculadas continuam respeitando a configuraÃ§Ã£o do Narrador.
- ValidaÃ§Ã£o: 26 testes especÃ­ficos, TypeScript e ESLint focados aprovados; Vitest reporta timeout ao encerrar workers apÃ³s a conclusÃ£o dos testes.

## 2026-10-21 02:05 BRT - fix - JSX e testes alinhados Ã  persistÃªncia PostgreSQL
- Arquivos principais: `components/character-form/attributes-step.tsx`, `components/character-form/skills-step.tsx`, `vitest.config.ts`, `tests/postgres-global-setup.ts`, `tests/postgres-test-helpers.ts`, testes de calendÃ¡rio, convocaÃ§Ã£o, convites, fichas independentes, notas, predaÃ§Ã£o e rolagens de chamada; `lib/dev-db.ts`.
- Vitest carrega o ambiente local e direciona conexÃµes de loopback ao schema isolado `meus_vampiros_test`, criado e preparado antes das suÃ­tes; recusa URLs de banco remoto. Fixtures usam UUIDs prÃ³prios, nÃ£o executam limpeza global nem acessam registros de `public`. Testes que verificam o provedor em memÃ³ria continuam isolados explicitamente.
- Removidas chaves JSX excedentes nos passos de atributos e habilidades. Atualizadas as expectativas que liam funÃ§Ãµes assÃ­ncronas ou objetos `__devDb` depois da migraÃ§Ã£o. A tipagem da memÃ³ria de noites agora descreve os campos jÃ¡ usados pela fixture.
- ValidaÃ§Ã£o: TypeScript sem erros; 64 testes em oito arquivos passaram contra o schema PostgreSQL isolado; ESLint focado aprovado. Nenhuma limpeza global foi executada.

## 2026-10-20 22:45 BRT - chore - Biblioteca de PDFs versionada via Git LFS
- Arquivos principais: `.gitattributes`, `docs/books/*.pdf`, `docs/books/README.md`.
- Livros previamente staged passam a usar Git LFS, incluindo dois PDFs maiores que 100 MB, para permitir envio ao GitHub e manter os caminhos usados pelas fontes autenticadas. Checkout e deploy precisam baixar os objetos LFS; nenhum PDF foi alterado ou removido do diretÃ³rio local.
- Commit/push solicitados pelo usuÃ¡rio apÃ³s o aviso dos bloqueios globais. Mantidos os resultados anteriores: testes do recorte/lint/audit aprovados; tipos/build e testes legados pendentes. Nenhum banco, schema, seed, arquivo de ambiente ou planejamento local serÃ¡ publicado neste commit. Arquivos de cÃ³digo da persistÃªncia PostgreSQL jÃ¡ descritos nas entradas anteriores estÃ£o incluÃ­dos.

## 2026-10-20 22:14 BRT - feat - RevisÃ£o dos sete clÃ£s V5 e condiÃ§Ãµes de rolagem
- Arquivos principais: `lib/vtm-v5/clans.ts`, `clan-rules.ts`, `clan-mechanics.ts`, `rule-profile.ts`, `lib/character-clans.ts`, `lib/character-rolls.ts`, `lib/character-roll-history.ts`, rotas de clÃ£/rolagens/campanha, componentes de clÃ£/condiÃ§Ãµes/rolagens/histÃ³rico e `UI-GUIDE.md`.
- SubstituÃ­dos os placeholders de Banu Haqim, Hecata, Lasombra, MinistÃ©rio, Ravnos, Salubri e Tzimisce por nomes originais/traduÃ§Ãµes, descriÃ§Ãµes, mecÃ¢nicas e referÃªncias separadas. Conferidos PDFs locais de Camarilla, Cults of the Blood Gods, Chicago by Night, Anarch e Companion; pÃ¡ginas impressas/PDF e seÃ§Ãµes ficam visÃ­veis com links autenticados pela whitelist existente. Strings bane/compulsion preservam compatibilidade; criaÃ§Ã£o, ficha e campanha compartilham a mesma base, com fallback de identificaÃ§Ã£o para fichas legadas.
- Narrador da prÃ³pria mesa ativa/remove condiÃ§Ãµes em comando com revisÃ£o, idempotÃªncia e ledger existentes. Penalidades de compulsÃ£o, luz intensa e detecÃ§Ã£o eletrÃ´nica sÃ£o calculadas no servidor antes da distribuiÃ§Ã£o de Fome; comunicaÃ§Ã£o Lasombra exige contexto do Narrador e teste de Tecnologia com dificuldade 2 + severidade do perfil de sangue da campanha. ExceÃ§Ãµes aplicÃ¡veis Ã  compulsÃ£o exigem Narrador e nÃ£o dispensam Banu Haqim/Lasombra por mera tentativa. HistÃ³rico registra penalidades/fontes sem revelar dificuldade reservada nem alterar dados originais. Troca de clÃ£ limpa condiÃ§Ãµes antigas; condiÃ§Ãµes de outra mesa/clÃ£ sÃ£o ignoradas.
- Regras de alimentaÃ§Ã£o, terceiro olho, sol e repouso estÃ£o completas para consulta, incluindo exceÃ§Ã£o Banu Haqim ao beber Salubri, dados de severidade/10s do Ravnos e dano agravado Ã  Vontade Tzimisce. Esses eventos nÃ£o existem como fatos verificÃ¡veis no motor atual: consequÃªncias permanecem conduzidas pelo Narrador nos recursos da ficha. Nenhuma ativaÃ§Ã£o automÃ¡tica por falha bestial, dano automÃ¡tico por leitura, DDL, seed, migraÃ§Ã£o ou escrita de teste no PostgreSQL. Novos metadados opcionais usam game_state/rolls jÃ¡ existentes, compatÃ­veis com dados anteriores.
- SeguranÃ§a: condiÃ§Ã£o restrita ao Narrador vinculado, validaÃ§Ã£o de flags/contexto, cache privado e projeÃ§Ã£o sem orientaÃ§Ãµes internas; POST de rolagem reutiliza validaÃ§Ã£o de origem/JSON com limite de corpo. Testes cobrem 401/403, IDOR, parÃ¢metros forjados, sigilo, perfil CORE/Companion, condiÃ§Ãµes, exceÃ§Ãµes, histÃ³rico e reenvio seguro da UI.
- ValidaÃ§Ã£o conjunta desta entrega e do ajuste dev abaixo: 15 arquivos aprovados com 260 testes. VerificaÃ§Ã£o ampliada de 16 arquivos terminou com 272 testes aprovados e 11 falhas antigas em `blood-potency.test.ts` (expectativas de tabela anterior e integraÃ§Ã£o que ainda espera provider em memÃ³ria); mÃ³dulo de cÃ¡lculo de PotÃªncia nÃ£o foi alterado. Lint global com exclusÃ£o de artefatos/planejamento local aprovado com trÃªs warnings preexistentes; lint focado incluindo testes aprovado; audit com zero vulnerabilidades e busca de segredos sem achados no recorte. Tipos/build globais seguem bloqueados por testes legados; compilaÃ§Ã£o do build aprovada. QA manual visual e integraÃ§Ã£o de escrita PostgreSQL nÃ£o executados; SPEC local permanece blocked.

## 2026-10-20 22:14 BRT - fix - Perfil mestre em dev e restauraÃ§Ã£o dos seletores
- Arquivos principais: `lib/auth0.ts`, `components/character-summary/character-clan.tsx`, `components/predator-types/player-predator-selector.tsx`, `app/api/predator-types/route.ts`, `tests/dev-master-profile.test.ts`, `tests/selectors-saved-state.test.ts` e teste da rota de predaÃ§Ã£o.
- SessÃ£o sintÃ©tica `dev|local` agora inclui a claim mestre reconhecida pela aplicaÃ§Ã£o, mesmo sem possuir mesas. ProduÃ§Ã£o continua usando exclusivamente a sessÃ£o Auth0 real, sem identidade/claim injetada. O papel global nÃ£o substitui autorizaÃ§Ã£o sobre uma mesa ou ficha.
- Corrigida inicializaÃ§Ã£o anterior Ã  resposta assÃ­ncrona: clÃ£, disciplinas 2+1, preferÃªncia/categoria/Caitiff e predaÃ§Ã£o, especialidade, disciplina e escolhas adicionais passam a restaurar o estado salvo. RevalidaÃ§Ã£o nÃ£o sobrescreve ediÃ§Ã£o local nem ressuscita predaÃ§Ã£o explicitamente removida. API retorna somente campos pÃºblicos da seleÃ§Ã£o salva com cache privado/no-store.
- VerificaÃ§Ã£o local sem mutaÃ§Ãµes: consulta PostgreSQL em transaÃ§Ã£o somente leitura confirmou zero mesas e trÃªs fichas dev; nas trÃªs fichas, APIs responderam 200 com 16 clÃ£s/41 predaÃ§Ãµes. `/campaigns/new` e `/master/vantagens-defeitos` responderam 200 sem redirecionamento apÃ³s a correÃ§Ã£o. AutorizaÃ§Ã£o de produÃ§Ã£o, role ausente e sessÃ£o ausente cobertas por testes; nenhuma mesa/seed/ownership criado ou alterado. Resultados e bloqueios globais registrados na entrada acima.

## 2026-10-20 19:57 BRT - feat - SeleÃ§Ã£o de vantagens e defeitos na ficha
- Arquivos principais: `components/character-form/trait-selector-row.tsx`, `traits-editor.tsx`, `app/characters/character-form-client.tsx`, `app/api/merits-flaws/route.ts`, `lib/vtm-v5/trait-options.ts`, `tests/trait-selector-row.test.ts` e `tests/trait-options-route.test.ts`.
- Nome e descriÃ§Ã£o abrem modal no padrÃ£o dos poderes de Disciplinas, com todas as opÃ§Ãµes do tipo e pesquisa PT/EN sem distinÃ§Ã£o de acentos por nome, efeito, requisitos e fonte. SeleÃ§Ã£o preenche nome, pontos e descriÃ§Ã£o. Adicionar vantagem/defeito cria linha e abre diretamente a modal; registros personalizados sÃ£o permitidos na ficha, inclusive com catÃ¡logo indisponÃ­vel, sem publicaÃ§Ã£o global.
- ConcessÃµes preservam IDs, nome e pontos mÃ­nimos; itens somente para referÃªncia nÃ£o sÃ£o selecionÃ¡veis. Cancelar preserva valores confirmados e descarta pontuaÃ§Ã£o invÃ¡lida do rascunho para nÃ£o bloquear o formulÃ¡rio da ficha. API exige sessÃ£o, valida os filtros e projeta somente dados pÃºblicos do catÃ¡logo com cache privado/no-store; texto escapado pelo React, sem novos privilÃ©gios, schema, seed ou escrita direta no PostgreSQL.
- ValidaÃ§Ã£o: 37 testes aprovados em cinco arquivos; lint focado de produÃ§Ã£o/testes e auditoria de dependÃªncias aprovados, zero vulnerabilidades. Build compilou, mas build/TypeScript global falharam em testes legados da migraÃ§Ã£o PostgreSQL; nenhuma falha reportada nos arquivos deste recorte. Lint global interrompido apÃ³s execuÃ§Ã£o prolongada incluindo backups de build nÃ£o ignorados pela configuraÃ§Ã£o. RevisÃ£o local de seguranÃ§a e busca de segredos sem achados no recorte; `git diff --check` aprovado. Vitest encerrou com cÃ³digo 0 e aviso de servidores Vite demorando a fechar. QA manual e integraÃ§Ã£o de salvamento no PostgreSQL nÃ£o executados; SPEC local bloqueada pelos gates globais.

## 2026-10-19 22:30 BRT - feat - PontuaÃ§Ã£o de predaÃ§Ã£o definida pelo jogador
- Arquivos principais: `lib/vtm-v5/predator-types/mechanics.ts`, `supplements.ts`, `components/predator-types/player-predator-selector.tsx`, `tests/predator-defined-rating.test.ts` e testes existentes de suplementos/rotas.
- ExclusÃ£o de Presa: moradores locais de Assassino de Estrada deixa de bloquear a escolha por ausÃªncia de pontuaÃ§Ã£o na fonte. O jogador define de 1 a 5 pontos, dentro do limite atual dos traÃ§os da ficha; valor registrado em optionCodes e aplicado pelo fluxo existente de efeitos com origem. Nenhum custo foi atribuÃ­do automaticamente ao livro.
- ValidaÃ§Ã£o no servidor exige escolha Ãºnica, inteira e dentro dos limites, recusando opÃ§Ã£o desconhecida, duplicada ou ausente. HabilitaÃ§Ã£o da fonte pelo Narrador e demais bloqueios de regras incompletas preservados; sem novo campo de API, schema, seed ou acesso de escrita ao banco.
- ValidaÃ§Ã£o: 136 testes aprovados em cinco arquivos, cobrindo rota, UI, limites/parÃ¢metros forjados, alteraÃ§Ã£o/reaplicaÃ§Ã£o sem duplicaÃ§Ã£o e remoÃ§Ã£o que preserva defeitos pessoais. ESLint focado e `git diff --check` aprovados. IntegraÃ§Ã£o PostgreSQL e QA manual no navegador nÃ£o executados; gates globais da migraÃ§Ã£o permanecem pendentes.

## 2026-10-19 22:20 BRT - feat - Pesquisa de vantagens e defeitos
- Arquivos principais: `app/master/vantagens-defeitos/page.tsx`, `components/merits-flaws-research.tsx`, `lib/vtm-v5/merits-flaws-catalog.json`, `app/campaigns/page.tsx`, `UI-GUIDE.md` e dois arquivos de testes `merits-flaws-research*`.
- Importados integralmente os 209 registros do HTML fornecido: qualidades, defeitos, antecedentes e traÃ§os de domÃ­nio. Pesquisa PT/EN sem distinÃ§Ã£o de acentos, filtros por tipo/categoria/pontos/elegibilidade/livro, paginaÃ§Ã£o de 30 registros, limpeza de filtros, regras gerais, XP a partir de zero e fontes visÃ­veis. Registros nÃ£o selecionÃ¡veis e escolhas sem pontos permanecem identificados; nÃ£o hÃ¡ compra ou aplicaÃ§Ã£o automÃ¡tica de bÃ´nus.
- PÃ¡gina protegida por sessÃ£o e autorizaÃ§Ã£o de Narrador no servidor; atalho em nova guia na listagem de mesas. ConteÃºdo exibido como texto escapado, sem executar scripts do HTML. Nenhuma alteraÃ§Ã£o de schema, seed ou escrita no PostgreSQL.
- ValidaÃ§Ã£o: 11 testes aprovados, incluindo acesso nÃ£o autenticado/sem papel, filtros combinados, paginaÃ§Ã£o, escolhas especiais e texto malicioso escapado; paridade integral com o HTML confirmada. ESLint focado e auditoria completa de dependÃªncias aprovados (zero vulnerabilidades). Checagem global TypeScript segue bloqueada por testes legados da migraÃ§Ã£o PostgreSQL, sem erros nos arquivos desta entrega; lint global da revisÃ£o anterior percorreu backups `.next-backup-*` e falhou. Build e QA em navegador nÃ£o executados; SPEC local permanece com validaÃ§Ã£o global bloqueada.

## 2026-10-19 22:05 BRT - chore - AtualizaÃ§Ã£o do catÃ¡logo de disciplinas
- Arquivos principais: `lib/vtm-v5/research-catalog.json`, `tests/master-research-catalog.test.ts`, `tests/discipline-powers-route.test.ts`.
- Importadas 376 entradas do arquivo local `codex/catalogo-disciplinas-vtm-v5 (1).html`, com nomes e campos descritivos em inglÃªs, categorias e status em portuguÃªs e referÃªncias de livro/pÃ¡gina preservadas. Mantidos os 372 IDs anteriores; adicionadas as cerimÃ´nias Fortezza Sindonica, Knit the Veil e Death Rattle, alÃ©m de Squirm como captura enviada, excluÃ­do da seleÃ§Ã£o de poderes publicados.
- ValidaÃ§Ã£o: 26 testes focados aprovados; paridade dos oito campos descritivos de todas as entradas com o HTML e preservaÃ§Ã£o dos 372 IDs confirmadas; ESLint dos consumidores e `git diff --check` aprovados. O Vitest sinalizou atraso ao encerrar servidores Vite, mas terminou com cÃ³digo 0. Sem DDL, seed ou escrita direta no PostgreSQL; o catÃ¡logo usa a sincronizaÃ§Ã£o jÃ¡ existente na consulta do Narrador.

## 2026-10-19 00:51 BRT - fix - RemoÃ§Ã£o de variÃ¡veis nÃ£o utilizadas
- Arquivos principais: `app/api/campaign-events/route.ts`, `lib/character-commands.ts`.
- Removidos campos nÃ£o usados da desestruturaÃ§Ã£o do PATCH e o import `randomUUID` sem referÃªncia. Nenhum comportamento de atualizaÃ§Ã£o foi alterado.
- ValidaÃ§Ã£o: ESLint nos dois arquivos aprovado; `git diff --check` aprovado. Warnings de Fast Refresh permanecem fora deste recorte.

## 2026-10-19 00:10 BRT - fix - CorreÃ§Ãµes focadas dos achados do Sonar
- Arquivos principais: `app/globals.css`, `app/api/characters/[id]/campaign/route.ts`, `app/api/characters/[id]/disciplines/route.ts`, `components/campaign-calendar/blood-policy-settings.tsx`, componentes de resumo de personagem e calendÃ¡rio, `lib/blood-policy.ts` e `lib/vtm-v5/presets.ts`.
- Removidas declaraÃ§Ãµes CSS duplicadas, corrigidos anÃºncios acessÃ­veis de status, chave de lista e marcaÃ§Ã£o de botÃ£o; removido `await` sem Promise e simplificadas validaÃ§Ãµes/listas apontadas. Itens de seguranÃ§a e regra de domÃ­nio foram preservados.
- O arquivo Sonar foi gerado em 18/10 e alguns locais jÃ¡ estavam corrigidos no cÃ³digo (rÃ³tulo do calendÃ¡rio, `output`, optional chaining e valores de PATCH usados); esses alertas foram classificados como desatualizados. Complexidade em funÃ§Ãµes extensas, IP permitido do ambiente de desenvolvimento e `!important` de movimento reduzido permanecem para revisÃ£o especÃ­fica, sem refatoraÃ§Ã£o de lÃ³gica normativa nesta passada.
- ValidaÃ§Ã£o: ESLint focado aprovado; 157 testes focados aprovados. Uma seleÃ§Ã£o mais ampla teve 59 falhas em suÃ­tes legadas que esperam o provider em memÃ³ria e nÃ£o configuram `DATABASE_URL`; nÃ£o houve escrita no banco. `tsc` nÃ£o apontou erros nos arquivos tocados, mas a checagem global terminou com erros preexistentes em outros arquivos.

## 2026-10-18 23:46 BRT - refactor - ValidaÃ§Ã£o central das rolagens V5
- Arquivos principais: `lib/vtm-v5/dice-roll-service.ts`, `lib/character-rolls.ts`, `lib/character-roll-history.ts`, `lib/chronicle-nights.ts`, `tests/dice-roll-service.test.ts` e planejamento local em `codex/specs/game-upgrade/`.
- Centralizada a geraÃ§Ã£o de D10 e validaÃ§Ã£o da quantidade, comprimento e faces do provider; pools de ficha continuam separando dados normais e Hunger Dice. Rerrolagem e Awake tambÃ©m usam o helper, mantendo a validaÃ§Ã£o antes da persistÃªncia/cobranÃ§a.
- ValidaÃ§Ã£o: 8 testes novos aprovados; 23 testes puros do provider/avaliador e 12 casos normativos adicionais aprovados; ESLint nos arquivos alterados aprovado. A suÃ­te completa de rolagem/API falha em 57 casos por fixtures antigas incompatÃ­veis com a migraÃ§Ã£o PostgreSQL; TypeScript continua com erros preexistentes nos testes legados. Nenhum reset, DDL, seed ou escrita no PostgreSQL.
- A SPEC segue parcial: reset perigoso bloqueado, integraÃ§Ã£o PostgreSQL dos testes pendente, combate/dano/Blood Bond nÃ£o implementados, e arquivo-base normativa referenciado ausente.

## 2026-10-18 23:15 BRT - docs - ValidaÃ§Ã£o de specs concluÃ­das e inÃ­cio da spec de fontes
- Arquivos principais: `codex/specs/README.md`, `codex/specs/entregas-concluidas.md`, `codex/specs/fontes-clicaveis-nomenclatura-en/`; removida `codex/specs/refatoracao-formulario/` apÃ³s validaÃ§Ã£o.
- RevalidaÃ§Ã£o focada da refatoraÃ§Ã£o do formulÃ¡rio aprovada: 45 testes em trÃªs arquivos. Tentativa das suÃ­tes legadas de anotaÃ§Ãµes, convites, convocaÃ§Ã£o, criaÃ§Ã£o de mesa e NPCs revelou falhas decorrentes da expectativa do provider em memÃ³ria apÃ³s a migraÃ§Ã£o; essas specs foram preservadas e nÃ£o consideradas validadas/concluÃ­das.
- Iniciada spec de fontes clicÃ¡veis com inventÃ¡rio do catÃ¡logo estÃ¡tico, rota autenticada e referÃªncias no histÃ³rico; task-001 em andamento. Sem alteraÃ§Ãµes no PostgreSQL. RevisÃ£o do armazenamento S3, autorizaÃ§Ã£o por papel, licenÃ§as e execuÃ§Ã£o da rota de fontes permanecem pendentes.

## 2026-10-18 22:54 BRT - fix - ConexÃ£o PostgreSQL local
- Arquivos principais: `.env.local` (local, nÃ£o versionado), `lib/db.ts`.
- SubstituÃ­do o pool Neon via WebSocket pelo driver `pg` sobre TCP, compatÃ­vel com PostgreSQL local. Configurada a URL fornecida em `.env.local` sem registrÃ¡-la no changelog.
- ValidaÃ§Ã£o: serviÃ§o PostgreSQL ativo, porta 5432 acessÃ­vel e consulta somente leitura confirmou database `postgres`/role `postgres`; ESLint, TypeScript de `app`/`lib`/`components` e `git diff --check` aprovados. Nenhuma escrita/DDL/seed/limpeza no banco.

## 2026-10-18 22:37 BRT - docs - ExecuÃ§Ã£o da SPEC de dados, XP, NPCs e carniÃ§ais
- Arquivos principais: `codex/specs/vtm-v5-fichas-e-inicio-de-noite/requirements.md`, `tests/v5-spec-dice.test.ts`, `tests/npc-validation.test.ts`.
- Atualizada a exigÃªncia de persistÃªncia nos requisitos locais da frente. Validada a parte pura da SPEC: 12 casos normativos de dados e 3 casos de validaÃ§Ã£o de NPC passaram. A SPEC nÃ£o foi concluÃ­da.
- Bloqueio: `DATABASE_URL` existe em `.env.local`, mas conexÃ£o somente leitura falhou; testes completos de XP, NPCs e carniÃ§ais e validaÃ§Ã£o SQL nÃ£o foram executados. Nenhuma escrita, DDL, seed ou limpeza no banco.

## 2026-10-18 22:16 BRT - refactor - MigraÃ§Ã£o de persistÃªncia para PostgreSQL
- Arquivos principais: `AGENTS.md`, `lib/db.ts`, `lib/characters.ts`, `lib/character-commands.ts`, `lib/campaigns.ts`, `lib/possessions.ts`, `lib/availability.ts`, `lib/blood-policy.ts`, `lib/notes.ts`, `lib/campaign-invitations.ts`, `lib/campaign-calls.ts`, `lib/chronicle-nights.ts` e rotas associadas; planejamento local em `codex/specs/persistencia-postgresql/`.
- Runtime sem fallback em memÃ³ria: fichas, convites, clÃ£s habilitados, chamadas, noites, calendÃ¡rios, NPCs e anotaÃ§Ãµes usam PostgreSQL; sem `DATABASE_URL`, operaÃ§Ãµes de banco falham explicitamente. Regras e roteiro de SPEC atualizados para nÃ£o exigir reset local.
- ValidaÃ§Ã£o: `npx eslint` nos mÃ³dulos/rotas alterados e `git diff --check` passaram; `npx tsc --noEmit` nÃ£o reporta erros em app/lib/components, mas ainda falha por testes antigos que esperam APIs sÃ­ncronas e o provider global. `DATABASE_URL` estÃ¡ configurada em `.env.local`, mas conexÃ£o somente leitura falhou no sandbox; schema, seed e limpeza nÃ£o foram executados. SPEC segue em andamento atÃ© migrar os testes e validar PostgreSQL isolado.

## 2026-10-18 18:02 BRT - feat - Primeira fatia da SPEC de dados, XP, NPCs e carniÃ§ais
- SPEC de referÃªncia: `codex/spec-regras-dados-xp-npcs-carnicais-v5.md`. ImplementaÃ§Ã£o iniciada pela frente de dados, na ordem prevista; SPEC permanece parcial/blocked. Ledger/compras/projetos de XP, novos modelos/templates de NPCs, fluxos de carniÃ§al, configuraÃ§Ã£o ampliada do perfil e integraÃ§Ã£o completa de disputas ainda nÃ£o implementados.
- Arquivos principais: `lib/vtm-v5/dice-evaluator.ts`, `rule-profile.ts`, `lib/character-rolls.ts`, `character-roll-history.ts`, `call-roll-characters.ts`; API de rolagem existente e novas rotas de rerrolagem/adjudicaÃ§Ãµes, fontes e fichas autorizadas da chamada; `components/character-summary/character-rolls.tsx`, `roll-history.tsx`, `components/livekit/call-rolls.tsx`, `livekit-room-link.tsx`; quatro arquivos de testes `v5-*` e `UI-GUIDE.md`.
- Separadas contagem e resoluÃ§Ã£o com margem assinada, par crÃ­tico condicionado Ã  vitÃ³ria e flags independentes de falha total/bestial. Checks, Vontade e Humanidade nÃ£o recebem Fome; Taking Half e vitÃ³ria automÃ¡tica exigem Narrador e nÃ£o sorteiam dados. Comparador puro de disputa bÃ¡sica trata empate a favor do ator, sem substituir o resolvedor de combate.
- HistÃ³rico por ficha guarda originais, revisÃµes, IDs/tipos de dados, perfil inicial `v5_core_companion` v1 e referÃªncias. Rerrolagem substitui atÃ© trÃªs dados comuns distintos e marca 1 dano superficial de Vontade na mesma operaÃ§Ã£o transacional, com revisÃ£o, lock, idempotÃªncia e uma ativaÃ§Ã£o por teste. ComplicaÃ§Ãµes, resoluÃ§Ã£o de crÃ­tico com Fome como falha narrativa e oferta/aceitaÃ§Ã£o de vitÃ³ria a custo sÃ£o auditadas separadamente, sem alterar os dados ou aplicar Frenzy, Manchas ou perda de Humanidade automaticamente.
- SeguranÃ§a: DTO oculta dificuldade/resoluÃ§Ã£o reservadas e notas privadas, incluindo revisÃµes; segredos de outra mesa permanecem ocultos. Retry revalida autorizaÃ§Ã£o e reprojeta a resposta pelo papel atual, sem retornar snapshots internos. IDs de dado nÃ£o canÃ´nicos (como N:00), seleÃ§Ã£o de Fome, valores/IDs forjados e gastos sem capacidade sÃ£o rejeitados. Novas mutaÃ§Ãµes usam origem/JSON limitado pelos helpers existentes. Fontes usam whitelist autenticada e streaming privado de PDFs locais, sem caminhos no DTO. Chamadas reutilizam a UI de rolagem com seleÃ§Ã£o de fichas aprovada no servidor, sem novas permissÃµes de LiveKit.
- PreparaÃ§Ã£o Ãºnica anterior ao cÃ³digo: script existente em processo isolado NODE_ENV=test, DATABASE_URL ausente e .env simulado; modelo em memÃ³ria atual e seeds de 8 fichas/3 mesas inicializados, integridade aprovada 1/1. Sem alteraÃ§Ã£o estrutural de schema, migraÃ§Ã£o, PostgreSQL ou servidor ativo. Teste temporÃ¡rio removido apÃ³s a preparaÃ§Ã£o; gameState JSON existente foi reutilizado.
- ValidaÃ§Ã£o: 133/133 testes focados em 9 arquivos; regressÃ£o ampliada 973/973 em 80 arquivos antes das trÃªs Ãºltimas regressÃµes adicionais (todas aprovadas no foco). Tipos, lint do recorte e build aprovados; npm audit sem vulnerabilidades; padrÃµes de segredos e whitespace em 18 arquivos sem achados. RevisÃ£o pela skill local pre-commit-review, sem vulnerabilidades crÃ­ticas/altas conhecidas no recorte.
- Bloqueios globais reconfirmados: `blood-potency.test.ts` tem 9 expectativas divergentes e `notes-preparation.test.ts` falha ao carregar DATABASE_URL do .env e aborta antes do reset (14/24 testes aprovados nesses dois arquivos); lint da aplicaÃ§Ã£o tem 7 variÃ¡veis nÃ£o usadas em `app/api/campaign-events/route.ts:168` e 3 avisos existentes. Arquivos fora do recorte preservados. SPEC permanece blocked conforme AGENTS.md, sem recomendar commit ou dispensar validaÃ§Ãµes. QA visual/manual, serviÃ§o LiveKit real, SQL e escala do histÃ³rico nÃ£o foram validados; backlog local atualizado. Sem staging, commit ou push; PDFs jÃ¡ staged e alteraÃ§Ãµes anteriores preservados.

## 2026-10-18 17:28 BRT - fix - Humanidade, criaÃ§Ã£o independente e AparÃªncia Nosferatu
- Arquivos principais: `app/characters/character-form-client.tsx`, `app/campaigns/page.tsx`, APIs de status/validaÃ§Ã£o de fichas, componentes de atributos/habilidades/clÃ£/resumo/recursos, `lib/characters.ts`, `character-clans.ts`, `discipline-allocation.ts`, `predator-effects.ts`, regras V5 de clÃ£/validaÃ§Ã£o, testes correspondentes, snapshots e `UI-GUIDE.md`.
- Humanidade recebe botÃ£o redutor acessÃ­vel com limite zero e os mesmos comandos autorizados, salvamento automÃ¡tico, revisÃ£o e idempotÃªncia. Sem mesa, distribuiÃ§Ã£o de atributos/habilidades/Disciplinas Ã© livre dentro dos limites, escolhas de clÃ£ nÃ£o exigem pacote 2+1 nem apagam Disciplinas existentes e requisitos de criaÃ§Ã£o viram avisos. Pontos iniciais de clÃ£ tornam-se manuais ao editar a ficha independente; concessÃµes de predaÃ§Ã£o, compras XP, recursos e permissÃµes permanecem protegidos. O servidor deriva a dispensa do vÃ­nculo persistido; flags do cliente nÃ£o dispensam regras em mesas. VÃ­nculo posterior retorna a ficha para DRAFT e exige regras da mesa na prÃ³xima validaÃ§Ã£o/conclusÃ£o.
- â€œPesquisa de habilidadesâ€ substitui â€œFonte de pesquisaâ€ e abre nova guia com `noopener noreferrer`. Nosferatu nÃ£o rejeita Siren/AparÃªncia positiva: cadastro e origens sÃ£o preservados, resumo indica AparÃªncia âˆ’2 e identifica bÃ´nus positivos como ignorados. Rolagens genÃ©ricas existentes nÃ£o possuem contexto de AparÃªncia e nÃ£o receberam modificador global.
- PreparaÃ§Ã£o Ãºnica antes da implementaÃ§Ã£o: script existente em processo isolado NODE_ENV=test, DATABASE_URL ausente e carregamento de .env simulado. Modelo em memÃ³ria atual inicializado; seeds de 8 fichas/3 mesas e integridade aprovados (1/1). Sem mudanÃ§a estrutural de schema, PostgreSQL, migraÃ§Ã£o ou alteraÃ§Ã£o do servidor ativo. Teste temporÃ¡rio removido apÃ³s a preparaÃ§Ã£o.
- ValidaÃ§Ãµes: 191/191 testes focados em 14 arquivos; regressÃ£o ampliada 931/931 em 76 arquivos excluindo `blood-potency.test.ts` e `notes-preparation.test.ts`, que falharam na execuÃ§Ã£o geral (9 expectativas de PotÃªncia do Sangue e 1 preparaÃ§Ã£o antiga que carrega DATABASE_URL do .env e bloqueia antes do reset). Esses arquivos e implementaÃ§Ã£o de PotÃªncia do Sangue nÃ£o foram alterados. Snapshots de formulÃ¡rio atualizados para markup vigente; testes de orientaÃ§Ã£o distinguem fichas livres e vinculadas. Tipos e build aprovados; npm audit com zero vulnerabilidades. VerificaÃ§Ãµes incluem 401/403, isolamento/propriedade, limites, flags forjadas, integridade de concessÃµes e manutenÃ§Ã£o das regras vinculadas.
- ValidaÃ§Ã£o geral blocked: lint da aplicaÃ§Ã£o encontrou 7 variÃ¡veis nÃ£o utilizadas em `app/api/campaign-events/route.ts:168` (arquivo nÃ£o alterado), alÃ©m de 3 avisos existentes. RevisÃ£o pela skill local pre-commit-review e varredura de padrÃµes de segredos no recorte realizadas, sem vulnerabilidades crÃ­ticas/altas conhecidas relacionadas Ã  alteraÃ§Ã£o. QA visual/manual, teclado real e responsividade pendentes no backlog local. Sem staging, commit ou push; alteraÃ§Ãµes anteriores preservadas.
- Lint focado nos arquivos do recorte aprovado; varredura de padrÃµes de segredos em 23 arquivos de cÃ³digo sem achados. `npm run lint` tambÃ©m percorreu backups gerados `.next-backup-*`, resultando em 195239 problemas globais; backups e configuraÃ§Ã£o existentes nÃ£o foram alterados. `git diff --check` aprovado no recorte (a linha em branco final de `.env.local.example` pertence Ã  alteraÃ§Ã£o anterior preservada).
- VerificaÃ§Ã£o final adicional: 35/35 testes de clÃ£/formulÃ¡rio, incluindo regressÃ£o que reduz pontos iniciais de clÃ£ na ficha independente e preserva Repulsivo 2. Arquivos gerados `next-env.d.ts` e `tsconfig.tsbuildinfo` restaurados apÃ³s build/tipos.

## 2026-10-17 22:46 BRT - feat - Novos tipos de predaÃ§Ã£o e fontes do catÃ¡logo
- Arquivos: lib/vtm-v5/predator-types/{catalog,supplements,types,mechanics,normalize,projections,validation}.ts; lib/predator-types.ts, character-clans.ts e vtm-v5/validation.ts; APIs predator-types e characters/[id]/{predator-type,campaign}; componentes predator-types, app/campaigns/new/page.tsx, UI-GUIDE.md e testes de predaÃ§Ã£o/seletores.
- Documento docs/regras/novos-tipos-predacao-vtm-v5.md integrado ao catÃ¡logo compartilhado pelo provider de desenvolvimento e APIs: 40 tipos e uma variante de Bagger, sem duplicar os 18 comunitÃ¡rios existentes ou reimpressÃµes de Roadside Killer. Nomes editoriais em portuguÃªs, aliases originais, referÃªncias/pÃ¡ginas e pacotes pÃºblicos preservados; fontes comunitÃ¡rias identificadas como Bully (2021), distintas do livro oficial. NÃ£o foi criada tabela SQL redundante nem executada operaÃ§Ã£o persistente.
- Cadastro de Roadside Killer, Tithe Collector, Extortionist, Graverobber, oito tipos Sabbat alternativos e variante Bagger com OblÃ­vio. Escolhas de Extorsionista distribuem trÃªs pontos; Tributos exige Ancilla e trÃªs pontos exclusivos em DomÃ­nio ou Status. Variante herda custos/benefÃ­cios e restriÃ§Ã£o Ventrue, sem duplicaÃ§Ã£o ao trocar/reaplicar/remover. Corrigidos Remorso/Habitante do Memoriam de Confidente e Subestimado de Lobo como benefÃ­cios. Preservados defeitos de um ponto de Street Feeder/Watcher, modos de Graverobber e parada atÃ­pica com Fortitude de Lobo; nÃ£o foi criado motor de caÃ§a.
- Suplementos desativados por padrÃ£o, inclusive para ficha independente; consulta independente mostra todos os registros, motivos e fontes, enquanto mesas mostram os habilitados. HabilitaÃ§Ã£o Ã© escolha do Narrador nas regras existentes. Roadside permanece bloqueado pela pontuaÃ§Ã£o ausente; Sabbat permanece consultÃ¡vel e bloqueado por depender do conjunto alternativo ainda sem suporte, incluindo dois pontos de Disciplina e alimentaÃ§Ã£o/Trilhas. PrÃ©-publicaÃ§Ãµes sÃ£o identificadas e nÃ£o foram conferidas contra ediÃ§Ãµes finais. Nenhum ponto foi inventado ou aplicado a cada caÃ§a.
- PreparaÃ§Ã£o Ãºnica anterior Ã  implementaÃ§Ã£o: script existente em processo isolado NODE_ENV=test, DATABASE_URL vazia e carregamento de .env simulado; modelo em memÃ³ria atual inicializado, seeds de 8 fichas/3 mesas e integridade aprovados (1/1). Sem alteraÃ§Ã£o estrutural de schema, reset de PostgreSQL ou mudanÃ§a no servidor em execuÃ§Ã£o. Teste temporÃ¡rio de preparaÃ§Ã£o removido apÃ³s execuÃ§Ã£o; testes de regressÃ£o mantÃªm seus prÃ³prios fixtures isolados.
- ValidaÃ§Ãµes: 276/276 testes focados em 12 arquivos; tipos e build aprovados, lint sem erros/3 avisos existentes, npm audit sem vulnerabilidades e varredura local de padrÃµes de segredos sem achados. Cobertura inclui 401/403, isolamento, escolhas/IDs invÃ¡lidos, habilitaÃ§Ã£o, perfil Ancilla vindo do servidor, bloqueios resistentes a override, DTO sem notas privadas e aplicaÃ§Ã£o/reversÃ£o idempotente da variante. RevisÃ£o pela skill local pre-commit-review sem vulnerabilidades crÃ­ticas/altas conhecidas no recorte.
- ValidaÃ§Ã£o geral bloqueada: suÃ­te completa executada com 925/941 testes aprovados; 16 snapshots de HTML em tests/character-form-refactor.test.ts divergentes nas etapas atributos/habilidades/disciplinas/recursos, que tÃªm outras alteraÃ§Ãµes em andamento no workspace. Snapshots preservados; SPEC local permanece blocked na validaÃ§Ã£o geral. Vitest focado encerrou com cÃ³digo 0 e aviso de fechamento de dois servidores Vite. QA visual/manual e responsividade nÃ£o executados, registrados no backlog local. Sem staging, commit ou push.

## 2026-10-17 22:26 BRT - fix - Credenciais do Sonar export pelo .env
- Arquivos: sonar-export.ps1 e tests/sonar-export.test.ps1.
- Script lÃª o .env ao lado do prÃ³prio arquivo, usando dotenv jÃ¡ instalado para respeitar aspas, comentÃ¡rios e valores literais. SONAR_TOKEN e SONAR_PROJECT_KEY (ou o alias SONAR_PROJECTKEY existente no projeto) tÃªm prioridade sobre o terminal; variÃ¡veis ausentes no arquivo mantÃªm a alternativa pelo ambiente. Valores vazios sÃ£o rejeitados antes de chamar a rede. Credenciais ficam no escopo do script, sem alterar o ambiente do terminal ou imprimir segredos.
- PaginaÃ§Ã£o e proteÃ§Ã£o contra pÃ¡gina vazia preservadas. Self-check PowerShell com arquivo/rede/export simulados aprovado: prioridade do arquivo, dois nomes de projeto, valores com aspas/comentÃ¡rios, expressÃ£o tratada como texto, fallback, paginaÃ§Ã£o e ausÃªncia de credenciais sem requisiÃ§Ã£o. Sintaxe PowerShell e diff conferidos. RevisÃ£o de seguranÃ§a focada no carregamento sem execuÃ§Ã£o do .env e no transporte local via stdin/saÃ­da capturada, sem argumentos contendo segredos; nenhuma dependÃªncia nova.
- Nenhuma alteraÃ§Ã£o no .env ou exportaÃ§Ã£o real executada. Sem mudanÃ§as em aplicaÃ§Ã£o/banco, nova SPEC ou reset; tipos/build/lint de aplicaÃ§Ã£o nÃ£o repetidos para este ajuste exclusivo PowerShell. Sem staging, commit ou push.

## 2026-10-17 22:21 BRT - feat - SeleÃ§Ã£o de poderes de Disciplina em modal
- Arquivos: components/character-form/discipline-power-row.tsx e disciplines-step.tsx; lib/vtm-v5/discipline-powers.ts; app/api/discipline-powers/route.ts; testes discipline-power-row/discipline-powers-route/character-form-steps, snapshots e UI-GUIDE.md.
- Clicar em qualquer um dos dez campos de uma linha de poder abre a mesma modal. Disciplina vem do contexto da ficha e nÃ­vel Ã© limitado ao menor entre a linha e o nÃ­vel atual da Disciplina, permitindo filtrar opÃ§Ãµes inferiores. Selecionar preenche nome, efeito, custo, prÃ©-requisito, amÃ¡lgama, duraÃ§Ã£o, paradas, notas e fonte da linha; cancelar/Escape mantÃ©m os valores. Campos preservam names no formulÃ¡rio e usam botÃµes com nomes acessÃ­veis, foco nativo do dialog e texto resumido na tabela.
- CatÃ¡logo carregado sob demanda por API autenticada, com validaÃ§Ã£o de filtros/duplicados e cache privado no-store. Retorna somente poderes classificados como publicaÃ§Ã£o no acervo local, excluindo rituais/cerimÃ´nias/fÃ³rmulas e registros comunitÃ¡rios/prÃ©-publicaÃ§Ã£o; fonte e requisitos visÃ­veis. DTO nÃ£o retorna caminhos/nomes de arquivo ou dados de usuÃ¡rios/mesas; observaÃ§Ãµes retornadas sÃ£o o texto de sistema do catÃ¡logo de regras. NÃ£o concede XP/nÃ­veis nem dispensa prÃ©-requisitos ou autorizaÃ§Ã£o existentes. Sem nova dependÃªncia.
- PreparaÃ§Ã£o Ãºnica antes de implementar, pelo script existente em processo isolado NODE_ENV=test, DATABASE_URL vazia e sem carregar .env: modelo em memÃ³ria atual inicializado, seeds de 8 fichas/3 mesas e integridade aprovada 1/1. Sem alteraÃ§Ã£o estrutural de schema, migraÃ§Ã£o, PostgreSQL ou servidor em execuÃ§Ã£o.
- ValidaÃ§Ãµes: suÃ­te 840/840 em 72 arquivos, preparaÃ§Ã£o excluÃ­da da regressÃ£o para nÃ£o repetir reset; 5/5 testes da modal apÃ³s ajuste final de apresentaÃ§Ã£o. Tipos/build aprovados, lint sem erros/3 avisos preexistentes, auditoria 0 vulnerabilidades e varredura local de padrÃµes de segredos em 8 arquivos sem achados. Cobertura de 401, filtros invÃ¡lidos/manipulados, DTO pÃºblico, XSS como texto, dez campos, preenchimento, filtro e cancelamento; nÃ£o hÃ¡ recurso de usuÃ¡rio nesta API de referÃªncia que exija teste de IDOR. Quatro snapshots atualizados pela orientaÃ§Ã£o de uso da modal. RevisÃ£o pela skill local pre-commit-review, sem vulnerabilidade crÃ­tica/alta conhecida no recorte.
- QA visual/manual, teclado real e responsividade pendentes no backlog local; testes de markup/handlers nÃ£o substituem QA no navegador. Vitest focado apresentou aviso de encerramento Vite com cÃ³digo final 0. Sem staging, commit ou push; alteraÃ§Ãµes anteriores preservadas.

## 2026-10-17 22:05 BRT - fix - CriaÃ§Ã£o, vÃ­nculo e revisÃ£o de fichas na mesa
- Arquivos principais: `app/create-characters/page.tsx`, `app/characters/character-form-client.tsx`, `app/campaigns/[id]/page.tsx`, APIs `characters` e `characters/[id]/campaign`, `components/campaign-creation-gate.tsx`, seletores/resumo, `lib/character-summary.ts`, `character-commands.ts`, `characters.ts`, catÃ¡logos/regras V5 e testes correspondentes; `UI-GUIDE.md` sincronizado.
- CriaÃ§Ã£o geral oferece somente tipos jogÃ¡veis; NPC humano/vampiro usa exclusivamente a criaÃ§Ã£o jÃ¡ existente na mesa. Bloqueada conversÃ£o de tipo por ediÃ§Ã£o/API. VÃ­nculo aparece no inÃ­cio apenas do editor independente de jogador, reutilizando convite aceito; servidor valida propriedade, regras de clÃ£/predaÃ§Ã£o, revisÃ£o, origem e idempotÃªncia. Token nÃ£o entra no histÃ³rico; desvinculaÃ§Ã£o/troca de mesa continuam bloqueadas pelo servidor.
- AnotaÃ§Ãµes do Narrador abrem nova guia filtrada pela mesa. Resumo da gestÃ£o sem link de evoluÃ§Ã£o, com pilares/convicÃ§Ãµes antes dos atributos, leitura canÃ´nica das habilidades com pontos e vantagens/defeitos preenchidos. Confirmar clÃ£ salva e atualiza a ficha, regras do clÃ£ e opÃ§Ãµes de predaÃ§Ã£o, inclusive no primeiro rascunho.
- Nomenclatura de apresentaÃ§Ã£o revisada para Proteanismo e sangue-ralo, inclusive no catÃ¡logo de pesquisa; IDs preservados e aliases antigos reconhecidos sem backfill. Disciplina validamente escolhida por predaÃ§Ã£o usa XP de clÃ£ (novo nÃ­vel Ã—5), preservando Caitiff Ã—6 e autorizaÃ§Ã£o de aprendizado. Exemplo fora do clÃ£: nÃ­vel 2 custa 10 XP.
- ValidaÃ§Ã£o de NPC cobre modo, dificuldade/paradas, atributos/habilidades da ficha completa, poderes por ponto e origem de vampiro, sem impor distribuiÃ§Ã£o inicial de jogador. Testes de validaÃ§Ã£o/autorizaÃ§Ã£o usam dados persistidos no provider descartÃ¡vel. Despertar verificado pelos testes de rota/domÃ­nio existentes, sem alterar sua lÃ³gica.
- PreparaÃ§Ã£o Ãºnica: script existente em processo isolado `NODE_ENV=test`, sem `DATABASE_URL` e sem carregar `.env`; memÃ³ria reinicializada com modelo atual, seeds de 8 fichas/3 mesas e integridade aprovada. Nenhuma alteraÃ§Ã£o estrutural de schema necessÃ¡ria; nenhum PostgreSQL ou servidor em execuÃ§Ã£o modificado.
- ValidaÃ§Ãµes: suÃ­te completa 819/819 testes em 70 arquivos; rodada final focada 20/20, incluindo dois testes adicionais de conversÃ£o indevida. PreparaÃ§Ã£o validada separadamente 1/1 e excluÃ­da da regressÃ£o para nÃ£o repetir reset. Tipos e build aprovados; lint 0 erros/3 avisos preexistentes; auditoria 0 vulnerabilidades. TrÃªs snapshots atualizados por nomenclatura; testes antigos de custo/navegaÃ§Ã£o sincronizados. Varredura de padrÃµes de segredos em 41 arquivos sem achados. RevisÃ£o pela skill local `pre-commit-review`, sem vulnerabilidades crÃ­ticas/altas conhecidas no recorte. Vitest focado apresentou aviso ao encerrar servidores Vite, com cÃ³digo final 0.
- PendÃªncias: QA manual visual, teclado e responsividade registrado localmente; PostgreSQL externo nÃ£o validado, vÃ­nculo/convite/NPC novos continuam limitados ao provider de desenvolvimento. Sem staging, commit ou push; alteraÃ§Ãµes locais anteriores preservadas.

## 2026-10-17 17:26 BRT - feat - Persistir catÃ¡logo de habilidades e Disciplinas no PostgreSQL
- Arquivos principais: `lib/db.ts`, `app/master/catalogo/page.tsx`, SPEC local `persistencia-postgresql`.
- Driver atualizado para `pg`/Drizzle Node PostgreSQL, necessÃ¡rio para conectar via TCP ao PostgreSQL local. Schema aditivo inclui `discipline_catalog`, `clan_disciplines`, `skill_catalog` e `discipline_research_catalog`, usando IDs estÃ¡veis.
- PÃ¡gina de pesquisa do Narrador carrega dados do PostgreSQL. Seed transacional e repetÃ­vel gravou 12 Disciplinas, 43 relaÃ§Ãµes, 27 habilidades e 372 conteÃºdos no banco local `localhost:5432/postgres`; destino inspecionado antes da gravaÃ§Ã£o, com 14 tabelas e 0 linhas de aplicaÃ§Ã£o. Nenhuma tabela ou dado foi apagado.
- ValidaÃ§Ã£o de integraÃ§Ã£o com banco local: 1 teste aprovado; TypeScript aprovado. RemoÃ§Ã£o global do provider em memÃ³ria permanece incompleta: notas, convocaÃ§Ãµes, convites, clÃ£s e outras rotas ainda dependem dele e estÃ£o registradas como trabalho pendente na SPEC. NÃ£o afirmar migraÃ§Ã£o integral nem prontidÃ£o de produÃ§Ã£o.

## 2026-10-17 17:12 BRT - feat - CatÃ¡logo de pesquisa do Narrador
- Arquivos principais: `codex/catalogo-disciplinas-vtm-v5.html`, `lib/vtm-v5/research-catalog.json`, `lib/vtm-v5/research-catalog.ts`, `lib/dev-db.ts`, `app/master/catalogo/page.tsx`, `components/master-research-catalog.tsx`, `app/campaigns/page.tsx`, teste `master-research-catalog` e `UI-GUIDE.md`.
- Importados 372 registros do catÃ¡logo com IDs estÃ¡veis por Disciplina, tipo, nÃ­vel, fonte, pÃ¡gina e nome; os 27 registros de habilidades existentes tambÃ©m sÃ£o semeados no provider em memÃ³ria. As paradas de dados ligam os conteÃºdos Ã s habilidades canÃ´nicas encontradas.
- Criada pÃ¡gina pesquisÃ¡vel por nome, efeito, requisito e fonte, com filtros por Disciplina, tipo e situaÃ§Ã£o, paginaÃ§Ã£o e exibiÃ§Ã£o de referÃªncias. Link disponÃ­vel no painel de Narradores.
- A pÃ¡gina exige sessÃ£o e autorizaÃ§Ã£o de Narrador no servidor. Sem migraÃ§Ã£o, reset ou comandos contra PostgreSQL; uso do seed descartÃ¡vel em memÃ³ria. Texto e situaÃ§Ã£o de publicaÃ§Ã£o mantÃªm as classificaÃ§Ãµes do catÃ¡logo de origem e precisam ser confirmados pelo Narrador.
- ValidaÃ§Ã£o: 33 testes pertinentes aprovados; TypeScript/build aprovados; lint sem erros (3 avisos preexistentes); `npm audit --audit-level=high` encontrou 0 vulnerabilidades. Vitest relatou timeout ao encerrar 2 servidores Vite, mas retornou cÃ³digo 0 com os testes aprovados. QA visual manual pendente no backlog.

## 2026-10-17 17:00 BRT - style - PÃ¡gina dedicada de evoluÃ§Ã£o do personagem
- Arquivos: `app/characters/[id]/evolution/page.tsx`, cliente de resumo, gestÃ£o da mesa, testes `character-evolution-page`/`character-summary-notes`, `UI-GUIDE.md` e guia de Disciplinas por origem.
- Disciplinas e especialidades movidas para pÃ¡gina prÃ³pria. BotÃ£o EvoluÃ§Ã£o junto ao nome abre nova guia, como AnotaÃ§Ãµes, com aviso acessÃ­vel e noopener/noreferrer. Removidos painÃ©is equivalentes do resumo; gestÃ£o da mesa usa acesso Ã  mesma pÃ¡gina. Editor de criaÃ§Ã£o continua com seus controles de concessÃ£o.
- PÃ¡gina valida sessÃ£o, UUID, tipo jogÃ¡vel e propriedade/Narrador atual no servidor antes de renderizar; terceiros e identificadores invÃ¡lidos nÃ£o acessam o conteÃºdo. APIs, custos, autorizaÃ§Ã£o, idempotÃªncia e regras de aquisiÃ§Ã£o reutilizados.
- ValidaÃ§Ã£o: rodada de 47 testes funcionais/seguranÃ§a/interface e rodada de 34 testes de navegaÃ§Ã£o/resumo (com sobreposiÃ§Ã£o) aprovadas. TypeScript/build aprovados, lint sem erros/3 avisos anteriores, npm audit sem vulnerabilidades. RevisÃ£o focada pela skill pre-commit-review sem bloqueios conhecidos; diff/segredos conferidos.
- Retomada da SPEC existente, sem novo reset, schema ou seeds. QA manual visual/teclado/responsividade pendente no backlog; sem validaÃ§Ã£o PostgreSQL. Sem staging, commit ou push.

## 2026-10-17 16:45 BRT - feat - Acesso a Disciplinas por origem
- Arquivos principais: catÃ¡logos `lib/vtm-v5/disciplines.ts`, `discipline-access.ts` e `discipline-contents.ts`; `lib/discipline-allocation.ts`, `character-disciplines.ts`, clÃ£s/criaÃ§Ã£o/predaÃ§Ã£o/personagens/duplicaÃ§Ã£o; API `characters/[id]/disciplines`, criaÃ§Ã£o/ediÃ§Ã£o/status/validaÃ§Ã£o; editor, seletores, painel de evoluÃ§Ã£o e gestÃ£o da mesa; `lib/dev-db.ts`, testes e `docs/regras/disciplinas-por-origem.md`/`UI-GUIDE.md`.
- Matriz integral: 12 Disciplinas e 43 relaÃ§Ãµes, com IDs estÃ¡veis; inclusÃ£o dos clÃ£s ausentes, seleÃ§Ã£o inicial 2+1 validada no servidor, polÃ­ticas prÃ³prias Caitiff/sangue-fraco e Metamorfose como apresentaÃ§Ã£o de PROTEAN. Escolhas de clÃ£ persistem IDs; nomes/aliases nÃ£o duplicam uma mesma Disciplina.
- Origem por aquisiÃ§Ã£o em `gameState`, nÃ­veis atuais em `data.disciplinas`, grants especÃ­ficos por requisito/origem/nÃ­vel/clÃ£/mesa. Reaproveitado schema JSON existente; sem tabelas SQL redundantes ou migraÃ§Ã£o/backfill de memÃ³ria. CÃ³pia conserva origens pÃºblicas sem transportar autorizaÃ§Ã£o privada da mesa.
- EvoluÃ§Ã£o cobra prÃ³ximo nÃ­vel Ã—5/Ã—7/Ã—6 conforme catÃ¡logo local, exige aprovaÃ§Ã£o especÃ­fica de aprendizado pelo Narrador atual e grava nÃ­vel, XP, origem e histÃ³rico no comando atÃ´mico/idempotente existente. Autorizar/revogar nÃ£o cria pontos ou XP; revogar exceÃ§Ã£o inicial reabre revisÃ£o. Interface mostra custos/bloqueios e disponibiliza controles do Narrador na gestÃ£o.
- Editor filtra opÃ§Ãµes iniciais, explica origem da predaÃ§Ã£o, permite corrigir escolhas manuais e bloqueia conclusÃ£o incompatÃ­vel; poderes existentes preservados. Rituais/cerimÃ´nias cadastrados como metadados vinculados com requisitos prÃ³prios (catÃ¡logo inicial de dois conteÃºdos); compra/execuÃ§Ã£o desses conteÃºdos e catÃ¡logo completo nÃ£o implementados. Alquimia permanente continua bloqueada atÃ© definiÃ§Ã£o de suas regras.
- SeguranÃ§a: 401/403/IDOR, CSRF/JSON/corpo limitado, saldo/custo/permissÃµes obtidos no servidor, resposta privada sem cache e justificativas privadas filtradas. Fechadas reutilizaÃ§Ã£o de ID de linha para duplicar origem e duplicaÃ§Ã£o por aliases; grants de outra mesa/Narrador/revogados nÃ£o autorizam compras.
- PreparaÃ§Ã£o Ãºnica: processo isolado NODE_ENV=test, DATABASE_URL removida e load de .env desabilitado; reset sÃ³ da memÃ³ria, modelo atual, seeds 8 fichas/3 mesas e integridade aprovados (1/1). Primeira tentativa abortou antes do reset ao detectar conexÃ£o configurada; PostgreSQL e servidor corrente intocados. CatÃ¡logo/seeds atualizados e integridade das 43 relaÃ§Ãµes verificada nos testes.
- ValidaÃ§Ã£o final: 789/789 testes em 64 arquivos, TypeScript/build aprovados, lint 0 erros/3 avisos anteriores, npm audit 0 vulnerabilidades. PreparaÃ§Ã£o P2 excluÃ­da da regressÃ£o para nÃ£o repetir reset; preparaÃ§Ã£o desta SPEC validada separadamente. Quatro snapshots de Disciplinas atualizados pela mudanÃ§a intencional de controles/rÃ³tulos. Teste antigo de predaÃ§Ã£o sincronizado com conversÃ£o de especialidade para habilidade jÃ¡ presente localmente.
- RevisÃ£o pela skill pre-commit-review concluÃ­da no recorte; nenhum bloqueio crÃ­tico/alto conhecido ou segredo novo detectado. QA manual visual/teclado/responsividade e SQL externo nÃ£o executados, com backlog. Demais alteraÃ§Ãµes locais preservadas; sem staging, commit ou push.

## 2026-10-17 15:53 BRT - style - AnotaÃ§Ãµes da ficha em nova guia
- Arquivos: `app/characters/[id]/character-summary-client.tsx`, `app/characters/[id]/summary/page.tsx`, `tests/character-summary-notes.test.ts` e `UI-GUIDE.md`.
- Removido card AnotaÃ§Ãµes relacionadas do resumo compartilhado. BotÃ£o AnotaÃ§Ãµes junto ao nome abre /notes em nova guia, com filtro CHARACTER/NPC e identificador da ficha, rel noopener noreferrer e aviso acessÃ­vel. Removido modal da pÃ¡gina de resumo; destino e autorizaÃ§Ã£o existentes reutilizados.
- Validado o candidato em worktree isolado: 28/28 testes, tipos e build --webpack aprovados; lint 0 erros/3 avisos anteriores; audit 0 vulnerabilidades. Build com avisos de dependÃªncia Auth0 e configuraÃ§Ã£o Auth0 ausente no worktree sem .env. RevisÃ£o pre-commit sem bloqueios no candidato; erro de tipos local de outra tarefa excluÃ­do deste commit. QA manual pendente; sem novo reset/banco.

## 2026-10-17 15:23 BRT - style - Simplificar o resumo da ficha
- Arquivos: pÃ¡gina de resumo, character-summary-client, CharacterSummary, SummaryHeader, CharacterRolls, CampaignNotesDialog, UI-GUIDE e testes archive-visual/character-rolls-ui.
- Retirado campo de motivo da rolagem; comando registra automaticamente atributo e habilidade, preservando validaÃ§Ã£o e cÃ¡lculo no servidor. ClÃ£ apÃ³s cabeÃ§alho; botÃ£o compacto AnotaÃ§Ãµes junto ao nome; removido tÃ­tulo redundante VisÃ£o Geral.
- 147/147 testes pertinentes aprovados, tipos aprovados, lint sem erros/3 avisos anteriores, audit sem vulnerabilidades. RevisÃ£o pela skill pre-commit-review sem bloqueios no recorte. Build aprovado. QA manual e PostgreSQL pendentes; sem novo reset/schema/seeds.

## 2026-10-17 15:17 BRT â€” fix â€” Especialidades de OfÃ­cios conforme o livro bÃ¡sico
- Arquivos: `lib/vtm-v5/specialties.ts`, testes de domÃ­nio/habilidades/seletor/comandos e `docs/regras/especialidades-v5.md`.
- Corrigida exceÃ§Ã£o explÃ­cita de Craft/OfÃ­cios (Corebook p.159â€“160): permite mais especialidades que pontos, preservando habilidade positiva, duplicatas, concessÃµes, custos de XP, autorizaÃ§Ã£o e limites internos explÃ­citos. CritÃ©rio compartilhado pelo seletor e validador.
- 85 testes pertinentes aprovados, incluindo cobertura das 27 habilidades, estado salvo/em ediÃ§Ã£o e compra idempotente. Tipos e lint dos arquivos alterados aprovados; auditoria sem vulnerabilidades. ComparaÃ§Ã£o de fontes distingue suplemento comunitÃ¡rio do Players Guide oficial. Sem migraÃ§Ã£o/reset ou mudanÃ§a em APIs.
- PendÃªncias documentadas: conversÃ£o de predaÃ§Ã£o para habilidade zerada e regras opcionais de vantagens comunitÃ¡rias; nÃ£o foram habilitadas implicitamente. QA manual visual nÃ£o executado.


## 2026-10-17 15:17 BRT - fix - Permitir recursos narrativos ao proprietÃ¡rio
- Arquivos: `lib/character-resources.ts`, `app/api/characters/[id]/resources/route.ts`, `components/character-summary/session-resources.tsx`, testes de comandos/interface e `UI-GUIDE.md`.
- ProprietÃ¡rio e Narrador podem alterar Humanidade e Manchas; removidos avisos de exclusividade do Narrador. Humanidade conserva somente + na interface e Manchas conserva âˆ’/+. AutorizaÃ§Ã£o no servidor, limites, histÃ³rico, revisÃ£o/idempotÃªncia e sigilo da causa de torpor preservados.
- 56/56 testes pertinentes aprovados, TypeScript aprovado, lint sem erros (3 avisos anteriores), npm audit sem vulnerabilidades. RevisÃ£o focada pela skill local pre-commit-review sem bloqueios ou padrÃµes de segredos no diff. Build aprovado; QA manual e PostgreSQL nÃ£o executados. Retomada da SPEC sem repetir reset e sem alteraÃ§Ã£o de schema/seeds. AlteraÃ§Ãµes locais de outras tarefas preservadas.

## 2026-10-17 14:39 BRT - style - Centralizar marcadores de recursos
- Arquivos: `components/character-summary/session-resources.tsx`, `app/globals.css` e `UI-GUIDE.md`.
- Centralizados os nomes, valores e controles; Manchas integrado na mesma grade, com cinco colunas a partir de 1280px. Preservados limites, permissoes e salvamento automatico. Sem mudancas em APIs ou banco, sem novo reset.
- Testes pertinentes: 55/55 aprovados; tipos e build aprovados; lint sem erros (3 avisos anteriores); auditoria sem vulnerabilidades. QA visual em navegador pendente. Skill pre-commit-review nao localizada; revisao formal bloqueada, sem recomendacao de commit.

## 2026-10-16 01:34 BRT â€” chore â€” RevisÃ£o prÃ©-commit da interface e recursos
- Candidato: 39 arquivos de interface, resumos/notas/gestÃ£o de mesas, recursos com autosave, testes e guias; inclui a pÃ¡gina dedicada de criaÃ§Ã£o de NPC e `campaignId` no resumo autorizado.
- RevisÃ£o pela skill pre-commit-review sem bloqueios crÃ­ticos/altos conhecidos no candidato. Ajustada a posiÃ§Ã£o do legend de vÃ­nculos para primeiro filho do fieldset; comentÃ¡rios da pÃ¡gina de mesas corrigidos. Sem alteraÃ§Ã£o de APIs, autenticaÃ§Ã£o ou schema.
- ValidaÃ§Ã£o reexecutada: 716 testes/60 arquivos aprovados, TypeScript e build aprovados; lint sem erros/trÃªs avisos anteriores; npm audit sem vulnerabilidades. AlteraÃ§Ãµes locais de ambiente, relatÃ³rios, gerados, codex/.codex, exclusÃµes .kiro, script de preparaÃ§Ã£o e rÃ³tulo avulso do calendÃ¡rio ficam fora do candidato.
- QA manual visual/acessibilidade/responsividade e integraÃ§Ã£o PostgreSQL continuam pendentes; sem alegaÃ§Ã£o de produÃ§Ã£o. PreparaÃ§Ã£o em memÃ³ria nÃ£o repetida nesta revisÃ£o.


## 2026-10-16 01:24 BRT â€” feat â€” Contadores compactos com salvamento automÃ¡tico
- Arquivos: `components/character-summary/session-resources.tsx`, `app/globals.css`, `UI-GUIDE.md`, `tests/session-resources-ui.test.ts` e `tests/archive-visual.test.ts`.
- BotÃµes visÃ­veis somente âˆ’ / + com rÃ³tulos acessÃ­veis; Humanidade tem apenas +, exclusivo do Narrador. Vitalidade/Vontade mostram linhas separadas por dano superficial/agravado com contador e botÃµes ao lado: âˆ’ remove dano e + adiciona dano, respeitando o mÃ¡ximo compartilhado. Manchas mantÃªm controle exclusivo do Narrador.
- Cada clique vÃ¡lido salva automaticamente pelo comando existente com motivo contextual, revisÃ£o e idempotÃªncia; removida etapa manual de motivo/salvar e inputs numÃ©ricos de rascunho. Contadores/bolinhas mudam apÃ³s resposta confirmada. Falhas preservam o Ãºltimo valor confirmado; envios em voo sÃ£o bloqueados e retry reaproveita comando/chave.
- Fome 1â†’0 mantÃ©m confirmaÃ§Ã£o de aÃ§Ã£o tabu com Cancelar como padrÃ£o; confirmar salva imediatamente com motivo especÃ­fico no histÃ³rico, sem XP ou penalidades automÃ¡ticas. Grade 1/2/4 colunas para acomodar os controles em celular/tablet/desktop.
- Retomada da SPEC existente: sem repetir preparaÃ§Ã£o/reset e sem alteraÃ§Ã£o de APIs, autorizaÃ§Ã£o ou banco. RegressÃ£o 716 testes/60 arquivos aprovada; tipos/build aprovados; lint sem erros/trÃªs avisos anteriores; audit sem vulnerabilidades. RevisÃ£o pela skill pre-commit-review e verificaÃ§Ã£o de segredos/whitespace do recorte sem bloqueios.
- QA manual visual/teclado/leitor de tela e integraÃ§Ã£o PostgreSQL nÃ£o executados nesta rodada, com pendÃªncia no backlog local. Sem novas dependÃªncias, staging, commit ou push.


## 2026-10-16 01:11 BRT â€” feat â€” Controles dos recursos da sessÃ£o e confirmaÃ§Ã£o de Fome zero
- Arquivos principais: `components/character-summary/session-resources.tsx`, `app/globals.css`, `UI-GUIDE.md`, `tests/session-resources-ui.test.ts`, `tests/character-resources-command.test.ts` e `tests/archive-visual.test.ts`.
- BotÃµes âˆ’ Reduzir / + Aumentar abaixo dos recursos; Humanidade/manchas continuam exclusivas do Narrador. Vitalidade/Vontade usam tipo de dano superficial/agravado explicitamente selecionado, mantendo campos independentes e mÃ¡ximos calculados no servidor.
- Fome em cinco bolinhas horizontais entre 0â€“5, sem XP. Reduzir 1â†’0 abre confirmaÃ§Ã£o de aÃ§Ã£o tabu com Cancelar em foco inicial; cancelar mantÃ©m 1 e confirmar prepara 0. Motivo e salvamento explÃ­citos registram a alteraÃ§Ã£o pelo comando/histÃ³rico existente, sem penalidades automÃ¡ticas.
- Resumo, campos e botÃµes compartilham o rascunho e indicam alteraÃ§Ãµes nÃ£o salvas. Bloqueio sÃ­ncrono contra duplo envio; retry conserva comando/chave; resposta invÃ¡lida, falha ou conflito nÃ£o exibem sucesso. Cache atualizado com estado/revisÃ£o retornados pelo servidor; aÃ§Ã£o de recarregar disponÃ­vel em erros.
- PreparaÃ§Ã£o Ãºnica de inÃ­cio da SPEC em processo test-memory sem DATABASE_URL: reset descartÃ¡vel, modelo atual sem alteraÃ§Ã£o de schema, seeds 8 fichas/3 mesas e integridade aprovados. PostgreSQL e servidor corrente intocados.
- ValidaÃ§Ã£o: preparaÃ§Ã£o 1/1 separada; regressÃ£o 716 testes/60 arquivos aprovada, incluindo limites, permissÃµes, danos distintos, confirmaÃ§Ã£o/cancelamento, motivo, erros, conflitos e duplicidade. Testes reais do provider em memÃ³ria e rotas cobrem 401/403/IDOR, escalada narrativa, entradas invÃ¡lidas, histÃ³rico e omissÃ£o de dados privados. Tipos/build aprovados; lint sem erros/trÃªs avisos anteriores; npm audit sem vulnerabilidades.
- RevisÃ£o focada pela skill pre-commit-review: sem novos endpoints, mudanÃ§as na autorizaÃ§Ã£o ou segredos detectados no recorte; nenhuma vulnerabilidade crÃ­tica/alta conhecida relacionada. QA visual/teclado/leitor de tela em navegador permanece pendente no backlog local. IntegraÃ§Ã£o SQL externa nÃ£o validada nesta entrega; sem nova dependÃªncia, staging, commit ou push.


## 2026-10-16 00:42 BRT â€” style â€” AnotaÃ§Ãµes ao lado do nome no resumo
- Arquivos: pÃ¡gina de resumo, cliente/resumo/cabeÃ§alho da ficha e `components/notes/campaign-notes-dialog.tsx`. BotÃ£o compacto de anotaÃ§Ãµes junto ao nome, com quebra de linha em telas estreitas.
- CondiÃ§Ã£o de mesa vinculada/ficha de jogador e modal/permissÃµes preservados; painel do Narrador mantÃ©m apresentaÃ§Ã£o anterior.
- ValidaÃ§Ã£o: 40 testes pertinentes aprovados (notas, autorizaÃ§Ã£o, cabeÃ§alho e resumo), TypeScript e lint dos arquivos alterados sem erros. RevisÃ£o focada sem alteraÃ§Ã£o de APIs/autorizaÃ§Ã£o/segredos; QA visual em navegador e novo build nÃ£o executados nesta alteraÃ§Ã£o pontual.



## 2026-10-16 00:21 BRT â€” style â€” PÃ¡ginas alinhadas Ã s referÃªncias Arquivos da Noite
- Arquivos principais: `app/page.tsx`, `app/layout.tsx`, `app/globals.css`, pÃ¡ginas de personagens/criaÃ§Ã£o/ficha, mesas/criaÃ§Ã£o/gestÃ£o/NPC e anotaÃ§Ãµes; `components/archive-header.tsx`, resumos/recursos, notas, criaÃ§Ã£o de NPC, ferramentas da mesa e `components/master-panel.tsx`.
- PDF local com 16 pÃ¡ginas renderizado e inspecionado. CabeÃ§alho compartilhado com navegaÃ§Ã£o mobile nativa, largura e hierarquia editorial, cards com conceito/status em portuguÃªs, aÃ§Ãµes separadas, formulÃ¡rios verticais e notas em duas colunas. Removido controle de autenticaÃ§Ã£o duplicado no layout; Auth0 preservado. Recursos reais/autorizados no topo da ficha, com editor recolhido, motivo e revisÃ£o preservados.
- `UI-GUIDE.md` e `design-system.md` revisados: marca Arquivos da Noite, referÃªncia por tela, tokens complementares, classes reais, dimensÃµes responsivas e limites do protÃ³tipo. Nenhuma mecÃ¢nica de bÃ´nus ou informaÃ§Ã£o demonstrativa foi adicionada ao domÃ­nio.
- PreparaÃ§Ã£o inicial Ãºnica por `tests/notes-preparation.test.ts`: processo test-memory sem DATABASE_URL; reset, modelo atual sem alteraÃ§Ã£o de schema, seeds 8 fichas/3 mesas e relaÃ§Ãµes Ã­ntegros. Nenhum PostgreSQL ou servidor corrente reinicializado.
- ValidaÃ§Ã£o: preparaÃ§Ã£o aprovada separadamente; regressÃ£o de 693 testes/59 arquivos aprovada, incluindo trÃªs testes novos de navegaÃ§Ã£o, recursos autorizados e ordem da ficha. Snapshots visuais do formulÃ¡rio atualizados intencionalmente; testes de seletores/convite alinhados aos cards e textos vigentes. TypeScript e build aprovados; lint sem erros/trÃªs avisos anteriores; npm audit sem vulnerabilidades.
- RevisÃ£o pela skill local pre-commit-review: autorizaÃ§Ã£o/isolamento, APIs, recursos e dados privados preservados, sem novo endpoint ou segredo no recorte. QA manual visual/acessibilidade/responsividade em navegador permanece pendente no backlog local; fontes usam fallbacks disponÃ­veis e nÃ£o hÃ¡ alegaÃ§Ã£o de equivalÃªncia pixel a pixel. AlteraÃ§Ãµes locais anteriores preservadas; sem staging, commit ou push.

## 2026-10-15 23:32 BRT â€” docs â€” PrÃ©via navegÃ¡vel da criaÃ§Ã£o de personagem
- Adicionado `docs/ui/criacao-personagem.html`: seis etapas visuais de atributos, habilidades/especialidades, disciplinas, recursos, vantagens/pertences e histÃ³rico, com navegaÃ§Ã£o nativa e dados fictÃ­cios.
- Artefato independente, sem scripts, persistÃªncia, APIs ou mudanÃ§a nas regras/autorizaÃ§Ã£o da aplicaÃ§Ã£o. AÃ§Ãµes de salvar/validar ficam desabilitadas; nÃ£o representa validaÃ§Ã£o funcional da ficha.
- Ajuste visual da prÃ©via: contadores permanecem em uma Ãºnica linha, sem comprimir as bolinhas; rolagem horizontal local quando necessÃ¡rio em telas estreitas.
- RevisÃ£o prÃ©-commit: 691 testes aprovados, TypeScript sem erros, lint sem erros e trÃªs avisos preexistentes, auditoria sem vulnerabilidades conhecidas. VerificaÃ§Ã£o estÃ¡tica da prÃ©via e whitespace aprovadas; QA visual ainda pendente.

## 2026-10-15 00:33 BRT â€” chore â€” ValidaÃ§Ã£o prÃ©-commit de NPCs e refatoraÃ§Ã£o
- Candidato com 23 arquivos: NPCs da mesa, extraÃ§Ã£o visual do formulÃ¡rio, testes/snapshot, README e CHANGELOG. RevisÃ£o pre-commit-review focada sem bloqueios crÃ­ticos/altos conhecidos relacionados; documentaÃ§Ã£o local, env, relatÃ³rios, gerados, exclusÃµes .kiro e alteraÃ§Ãµes alheias fora do staging.
- ReexecuÃ§Ã£o aprovada: 691 testes/59 arquivos, TypeScript sem emissÃ£o, lint zero erros/trÃªs avisos anteriores, Next build com tipos e pnpm audit sem vulnerabilidades. Diff staged sem erros de whitespace e sem padrÃµes de credenciais identificados.
- QA visual/integraÃ§Ãµes externas continuam nÃ£o executados; documentaÃ§Ã£o local mantÃ©m evidÃªncias e limites de cada recorte.

## 2026-10-15 00:33 BRT â€” chore â€” ValidaÃ§Ã£o prÃ©-commit de NPCs e refatoraÃ§Ã£o
- Candidato com 23 arquivos: NPCs da mesa, extraÃ§Ã£o visual do formulÃ¡rio, testes/snapshot, README e CHANGELOG. RevisÃ£o pre-commit-review focada sem bloqueios crÃ­ticos/altos conhecidos relacionados; documentaÃ§Ã£o local, env, relatÃ³rios, gerados, exclusÃµes .kiro e alteraÃ§Ãµes alheias fora do staging.
- ReexecuÃ§Ã£o aprovada: 691 testes/59 arquivos, TypeScript sem emissÃ£o, lint zero erros/trÃªs avisos anteriores, Next build com tipos e pnpm audit sem vulnerabilidades. Diff staged sem erros de whitespace e sem padrÃµes de credenciais identificados.
- QA visual/integraÃ§Ãµes externas continuam nÃ£o executados; documentaÃ§Ã£o local mantÃ©m evidÃªncias e limites de cada recorte.

## 2026-10-15 00:19 BRT â€” docs â€” OrganizaÃ§Ã£o de SPECs, concluÃ­das, backlog e README
- Arquivos: `README.md`, `codex/README.md`, Ã­ndices de specs/backlog/concluÃ­das e tasks selecionadas de personagens, regras V5, clÃ£s e PotÃªncia do Sangue.
- README da aplicaÃ§Ã£o em portuguÃªs com execuÃ§Ã£o/validaÃ§Ã£o, ambiente em memÃ³ria e limites; removida afirmaÃ§Ã£o nÃ£o verificada de deploy automÃ¡tico. Central local e visÃ£o das 15 frentes separam entregas, recortes parciais e propostas.
- Tarefas comprovadas reconciliadas: criaÃ§Ã£o/ediÃ§Ã£o/cÃ³pia independentes, atributos secundÃ¡rios, preparaÃ§Ã£o PS-003 e configuraÃ§Ã£o inicial de clÃ£s/predaÃ§Ã£o. OperaÃ§Ãµes de vÃ­nculo posterior/desvÃ­nculo/exclusÃ£o e regras avanÃ§adas continuam pendentes; nenhum fechamento em lote de tarefas compostas.
- RelatÃ³rios antigos preservados com aviso histÃ³rico; SQL/QA fora do gate da memÃ³ria, override individual substituÃ­do e backfill em memÃ³ria descartado explicitados. Backlog mestre mantÃ©m prioridades P1â€“P4 e aponta execuÃ§Ã£o nas SPECs, sem duplicar tarefas.
- Checagem de links Markdown relativos em README e codex: zero destinos locais inexistentes; diff sem erros de whitespace. EvidÃªncia anterior de 691 testes/59 arquivos mantida como histÃ³rica, sem reexecutar testes/tipos/lint/build/audit nesta alteraÃ§Ã£o exclusivamente documental. Sem reset, mudanÃ§a de cÃ³digo, staging, commit ou push nesta rodada.

## 2026-10-15 00:07 BRT â€” refactor â€” Primeira fatia visual do formulÃ¡rio de personagem
- Arquivos: `app/characters/character-form-client.tsx`, `components/character-form/`, `tests/character-form-refactor.test.ts`, `tests/character-form-steps.test.ts` e snapshot de caracterizaÃ§Ã£o.
- Atributos, habilidades, disciplinas, recursos/convicÃ§Ãµes e histÃ³rico extraÃ­dos como componentes controlados. Controles/opÃ§Ãµes/tipos atuais compartilhados; estado, cÃ¡lculos, concessÃµes, carregamento, salvamento, names, campos ocultos e contratos permanecem existentes.
- 20 fingerprints do HTML SSR completo capturados antes da extraÃ§Ã£o e preservados sem atualizar a baseline; cinco testes adicionais de callbacks/campos/bloqueios/origens. RegressÃ£o: 691 testes/59 arquivos, tipos/build aprovados, lint sem erros/trÃªs avisos anteriores, audit sem vulnerabilidades.
- RevisÃ£o focada pre-commit-review/seguranÃ§a: nenhum novo acesso a API/segredo/autorizaÃ§Ã£o ou persistÃªncia; diff e arquivos novos sem padrÃµes de credenciais. Achados/estimativas, SPEC local e backlog QA atualizados. Sem commit/push.
- Limites: identidade, vantagens/pertences e estado/carregamento ainda nÃ£o refatorados. QA visual/integraÃ§Ãµes externas nÃ£o executados; estilos/textos legados preservados. Sem novas dependÃªncias, schema ou alegaÃ§Ã£o de ganho de performance.

## 2026-10-14 23:59 BRT â€” chore â€” PreparaÃ§Ã£o da refatoraÃ§Ã£o incremental do formulÃ¡rio
- Achados/estimativas registrados no backlog local e SPEC da primeira fatia: separar cinco etapas visuais, preservando estado/regras/contratos e editor atual.
- PreparaÃ§Ã£o Ãºnica por `tests/notes-preparation.test.ts`, test-memory sem DATABASE_URL: modelo existente sem mudanÃ§a de schema, seeds 8 fichas/3 mesas, relaÃ§Ãµes Ã­ntegras. Nenhum servidor corrente ou banco externo reinicializado.

## 2026-10-14 23:25 BRT â€” feat â€” NPCs vinculados Ã  mesa no gerenciamento
- Arquivos: `app/campaigns/[id]/page.tsx`, `components/campaign-npc-creator.tsx`, `app/api/campaigns/[id]/npcs/route.ts`, `lib/characters.ts`, `lib/dev-db.ts`, testes de NPC/interface/ordem da gestÃ£o.
- Narrador cria NPC humano/vampiro com nome e abre o editor existente. Rascunho sempre vinculado Ã  mesa da rota; ediÃ§Ã£o geral nÃ£o permite desvÃ­nculo.
- SeguranÃ§a: dono da mesa validado no servidor; origem/JSON/UUID/nome/tipo/campos estritos, sem aceitar campanha do payload ou papel global como permissÃ£o. ST_ONLY evita descoberta tambÃ©m nas anotaÃ§Ãµes dos jogadores. Demais criaÃ§Ãµes preservam visibilidade padrÃ£o anterior.
- Falhas de rede/HTTP/JSON preservam campos, liberam tentativa e exibem alerta; controles bloqueados durante criaÃ§Ã£o. Novo fluxo retorna 503 em produÃ§Ã£o/provider externo; SQL apenas mantÃ©m referÃªncia parametrizada Ã  coluna existente, sem validaÃ§Ã£o externa ou alteraÃ§Ã£o de schema.
- 666 testes/57 arquivos, tipos e build aprovados; lint sem erros/trÃªs avisos anteriores, audit sem vulnerabilidades. RevisÃ£o focada pre-commit-review/seguranÃ§a, diff e segredos sem bloqueios relacionados; SPEC local e backlog QA atualizados.
- QA visual/responsivo e integraÃ§Ãµes reais nÃ£o executados. Rascunho permanece salvo ao abandonar editor; sem novas dependÃªncias, commit ou push nesta entrega.

## 2026-10-14 23:18 BRT â€” chore â€” PreparaÃ§Ã£o da SPEC NPCs da mesa
- SPEC local de NPCs planejada com vÃ­nculo obrigatÃ³rio Ã  mesa atual e autorizaÃ§Ã£o por dono; reutilizaÃ§Ã£o do editor e modelo existentes.
- PreparaÃ§Ã£o Ãºnica via teste isolado `tests/notes-preparation.test.ts`: test-memory sem DATABASE_URL, modelo atual sem alteraÃ§Ã£o de schema, seeds 8 fichas/3 mesas e integridade aprovada. Sem reset de servidor corrente, autenticaÃ§Ã£o ou banco externo.

## 2026-10-14 23:05 BRT â€” fix â€” Continuidade da auditoria da aplicaÃ§Ã£o
- Arquivos: `lib/auth0.ts`, `lib/availability.ts`, `lib/dev-db.ts`, API/component de disponibilidade, `next.config.mjs`, `lib/character-summary.ts`, pÃ¡ginas de ficha/resumo e testes correspondentes.
- ProduÃ§Ã£o ignora DEV_AUTH_BYPASS e exige sessÃ£o Auth0; testes com SDK simulado, sem alegaÃ§Ã£o de login real.
- HorÃ¡rios persistidos por mesa em memÃ³ria; destaque por identidade, rascunho Ãºnico para exibir/enviar e ediÃ§Ã£o preservada em falhas HTTP/rede/JSON com alerta e liberaÃ§Ã£o dos controles. POST preserva sugestÃ£o e PATCH alterna/cria uma vez.
- SeguranÃ§a: API valida origem, participaÃ§Ã£o/dono por campanha, identificadores/datas/intervalos/JSON e nÃ£o expÃµe detalhes internos; leitura privada/no-store.
- Build volta a verificar TypeScript; teste isolado do verificador Next rejeita erro proposital e aceita cÃ³digo vÃ¡lido. ProjeÃ§Ã£o Ãºnica preserva autorizaÃ§Ã£o e corrige habilidades zeradas no resumo por chaves incorretas.
- 647 testes/55 arquivos aprovados, TypeScript/build aprovados, lint sem erros/trÃªs avisos anteriores e audit sem vulnerabilidades. RevisÃ£o focada de seguranÃ§a/pre-commit e segredos realizada; documentaÃ§Ã£o local sincronizada.
- Sem dependÃªncias novas, reset externo, commit ou push. QA visual, Auth0/SQL/LiveKit reais e pipeline externa nÃ£o verificados. ExecuÃ§Ãµes focadas emitiram aviso de encerramento tardio do Vite; suÃ­te completa encerrou com sucesso.

## 2026-10-14 21:50 BRT â€” feat â€” Convite e regras de criaÃ§Ã£o da mesa
- Arquivos: APIs/formulÃ¡rios de campanhas e personagens, `lib/campaign-invitations.ts`, `lib/campaign-exception-options.ts`, `lib/dev-db.ts`, `components/campaign-creation-gate.tsx`, serviÃ§os/catÃ¡logos de clÃ£/predaÃ§Ã£o, validaÃ§Ã£o/conclusÃ£o, disponibilidade e testes correspondentes.
- Narrador define exceÃ§Ãµes predefinidas opcionais somente na criaÃ§Ã£o da mesa e recebe link reutilizÃ¡vel. Convite usa token aleatÃ³rio/hash no servidor, fragmento no link e consulta POST autenticada/no-store com DTO mÃ­nimo.
- Nova ficha pergunta por mesa planejada: sem mesa segue independente; com convite mostra restriÃ§Ãµes/exceÃ§Ãµes e exige ciÃªncia. Aceite cria primeiro rascunho vinculado e concede acesso como jogador, sem aprovar ficha/pertences, elevar papel ou dispensar convocaÃ§Ã£o da sessÃ£o.
- RestriÃ§Ãµes/exceÃ§Ãµes canÃ´nicas aplicadas nos catÃ¡logos, escolhas, ediÃ§Ã£o e validaÃ§Ã£o final. Painel individual removido, endpoint antigo retorna 410 sem mutaÃ§Ã£o e polÃ­tica das novas mesas nÃ£o Ã© editÃ¡vel depois da criaÃ§Ã£o. CÃ³pia nÃ£o transfere acesso/ciÃªncia.
- SeguranÃ§a: identificaÃ§Ã£o do dono em memÃ³ria e permissÃ£o de sugestÃ£o especÃ­fica da mesa corrigidas para que Narrador de outra campanha ingresse sem privilÃ©gios de planejamento. Token nÃ£o Ã© persistido em ficha/ledger; testes cobrem 401/403, origem, falsificaÃ§Ã£o, ciÃªncia, privacidade, tipos, clÃ£s, duplicaÃ§Ã£o e isolamento.
- 628 testes/51 arquivos, TypeScript/build aprovados, lint sem erros/3 avisos anteriores e audit sem vulnerabilidades; revisÃ£o focada de seguranÃ§a/pre-commit, diff e segredos aprovada. DocumentaÃ§Ã£o local sincronizada, sem commit/push solicitado.
- ProteÃ§Ã£o de origem/JSON e confirmaÃ§Ã£o da identidade tambÃ©m na aceitaÃ§Ã£o; tentativa cross-site recusada sem criar vÃ­nculo. RevalidaÃ§Ã£o final em 21:56 BRT mantÃ©m 628 testes/51 arquivos e tipos/lint/build/audit aprovados.
- Limites: convites de novas mesas em memÃ³ria, reutilizÃ¡veis, sem expiraÃ§Ã£o/rotaÃ§Ã£o, exibidos uma vez ao Narrador. Copiar antes de sair e distribuir somente aos convidados. SQL/produÃ§Ã£o indisponÃ­vel; sem migraÃ§Ã£o de mesas antigas, QA visual/Auth0 multiusuÃ¡rio e integraÃ§Ãµes externas nÃ£o executados.

## 2026-10-14 21:27 BRT â€” chore â€” PreparaÃ§Ã£o da SPEC regras da mesa
- PreparaÃ§Ã£o isolada do provider em memÃ³ria via teste/script existente: ambiente nÃ£o produtivo sem DATABASE_URL, reset Ãºnico no processo, modelo vigente e seeds de 8 fichas/3 campanhas com relaÃ§Ãµes Ã­ntegras. Nenhum servidor corrente, autenticaÃ§Ã£o ou banco externo alterado.
- SPEC atualizada: convite vÃ¡lido + ciÃªncia concede vÃ­nculo inicial como jogador; ID da campanha isolado nÃ£o concede acesso. ExceÃ§Ãµes predefinidas somente na criaÃ§Ã£o, sem override individual posterior.

## 2026-10-14 20:18 BRT â€” fix â€” Mesa virtual somente apÃ³s convocaÃ§Ã£o
- Arquivos: `components/livekit/livekit-room-link.tsx` e `tests/campaign-call-ui.test.ts`.
- Card completo oculto para jogador sem convocaÃ§Ã£o ativa confirmada, inclusive carregamento/erro; consulta periÃ³dica permanece montada para exibir o card apÃ³s convocaÃ§Ã£o. Narrador mantÃ©m painel e diagnÃ³stico, sem liberaÃ§Ã£o da entrada em erro.
- 616 testes/49 arquivos aprovados, cobrindo ausÃªncia/ativaÃ§Ã£o, erro com dados em cache e visÃ£o do Narrador. RevisÃ£o focada preserva hooks, autorizaÃ§Ã£o/token no servidor e isolamento; nenhuma nova dependÃªncia/credencial. NÃ£o implementa provider externo de convocaÃ§Ã£o, que segue indisponÃ­vel. QA visual/SQL/LiveKit reais posteriores.
- TypeScript/build aprovados; lint sem erros/3 avisos anteriores, audit sem vulnerabilidades e diff focado sem erros de whitespace. Nenhum commit solicitado nesta alteraÃ§Ã£o.

## 2026-10-14 01:00 BRT â€” chore â€” ExportaÃ§Ã£o Sonar e revisÃ£o prÃ©-commit
- Arquivos: `package.json`, `sonar-export.ps1`, `tests/sonar-export.test.ps1`; candidato inclui correÃ§Ãµes das duas rodadas Sonar descritas abaixo.
- Comando `pnpm sonar:export` pagina issues abertas do SonarCloud usando token/projeto do ambiente, sem credenciais embutidas. PÃ¡gina vazia antes do total interrompe execuÃ§Ã£o sem substituir export, evitando loop infinito.
- Self-check PowerShell valida paginaÃ§Ã£o, token ausente e pÃ¡gina vazia sem rede/escrita; package JSON validado. CorreÃ§Ãµes de aplicaÃ§Ã£o previamente validadas com 614 testes/49 arquivos, tsc/build aprovados, lint sem erros/3 avisos prÃ©vios e audit sem vulnerabilidades. RevisÃ£o conforme pre-commit-review preserva permissÃµes, validaÃ§Ã£o e ledger; nenhum segredo novo identificado.
- Fora do commit: env, specs/backlogs locais, export JSON, exclusÃµes `.kiro`, arquivos gerados e alteraÃ§Ãµes nÃ£o relacionadas de label/seed. NÃ£o executado scan/export real ou QA manual; achados restantes continuam pendentes.

## 2026-10-14 00:48 BRT â€” refactor â€” Segunda rodada Sonar
- Arquivos: rota de override de predaÃ§Ã£o, pÃ¡ginas de ficha/resumo, normalizaÃ§Ã£o de avisos de predaÃ§Ã£o e calendÃ¡rio de disponibilidade; testes de rotas de Narrador e normalizaÃ§Ã£o textual.
- Separadas validaÃ§Ã£o do pedido e criaÃ§Ã£o/revogaÃ§Ã£o de overrides para reduzir complexidade; mesma autorizaÃ§Ã£o, revisÃ£o, cÃ³digos de erro e registro em ledger. Cobertas entradas malformadas, regras nÃ£o permitidas e revogaÃ§Ã£o inexistente.
- Helper textual da rodada anterior reutilizado nos resumos e avisos de dados legados para impedir stringificaÃ§Ã£o de objetos. Reducer do calendÃ¡rio com escopos claros e dependÃªncia estÃ¡vel no useMemo.
- 614 testes/49 arquivos aprovados. Export ainda contÃ©m 227 achados e trechos anteriores Ã s correÃ§Ãµes; nenhum novo scan executado, sem alegaÃ§Ã£o de relatÃ³rio zerado. RevisÃ£o focada preserva autenticaÃ§Ã£o/isolamento, regras e dados, sem novas dependÃªncias/segredos. PendÃªncias na triagem local; QA manual/SQL/LiveKit posteriores.
- TypeScript/build aprovados, lint sem erros/3 avisos anteriores (aviso do calendÃ¡rio corrigido), audit sem vulnerabilidades; diff focado sem erros de whitespace. Nenhum commit nesta rodada.

## 2026-10-14 00:34 BRT â€” fix â€” Triagem dos achados Sonar
- Arquivos: `lib/vtm-v5/text.ts`, normalizaÃ§Ã£o de ficha, serviÃ§os/APIs de predaÃ§Ã£o, `lib/characters.ts`, especialidades, estado de sessÃ£o, clÃ£s e painÃ©is de calendÃ¡rios/override; testes em `tests/sonar-input-normalization.test.ts`.
- Evitada conversÃ£o implÃ­cita de objetos em texto para nomes, convicÃ§Ãµes, clÃ£, predaÃ§Ã£o e listas; strings/nÃºmeros finitos preservados. OrdenaÃ§Ã£o numÃ©rica explÃ­cita, escopos/indentaÃ§Ã£o claros sem alterar condiÃ§Ãµes, rejeiÃ§Ãµes Promise com Error e type submit no botÃ£o de override.
- 227 achados avaliados por categoria; triagem e pendÃªncias registradas localmente em `codex/backlog/sonar-triagem.md`. Sem substituiÃ§Ãµes indiscriminadas de roles acessÃ­veis nem paralelizaÃ§Ã£o de transaÃ§Ãµes; contrato assÃ­ncrono do token mantido. Complexidade, chaves e demais ajustes cosmÃ©ticos permanecem em backlog, sem declarar resoluÃ§Ã£o completa.
- 607 testes/49 arquivos aprovados, incluindo entradas malformadas e objetos com toString malicioso. RevisÃ£o de seguranÃ§a focada preserva autenticaÃ§Ã£o/autorizaÃ§Ã£o, transaÃ§Ãµes e validaÃ§Ãµes; sem novos segredos/dependÃªncias. Export original preservado; nenhum novo scan Sonar ou QA manual/SQL/LiveKit realizado.
- TypeScript/build aprovados, lint sem erros (4 avisos anteriores), audit sem vulnerabilidades; diff focado sem erros de whitespace. Nenhum commit solicitado nesta rodada.

## 2026-10-14 00:17 BRT â€” feat â€” ConfiguraÃ§Ã£o inicial de clÃ£s e predaÃ§Ãµes
- Arquivos: API e formulÃ¡rio de criaÃ§Ã£o de campanhas, `lib/campaigns.ts`, `lib/campaign-clans.ts`, `lib/character-clans.ts` e testes de criaÃ§Ã£o.
- Narrador escolhe clÃ£s/predaÃ§Ãµes ao criar mesa em memÃ³ria; servidor valida catÃ¡logo, duplicatas e autorizaÃ§Ã£o. SeleÃ§Ã£o de clÃ£ respeita configuraÃ§Ã£o persistida, sem expor orientaÃ§Ãµes privadas ao jogador. SQL externo retorna indisponibilidade para configuraÃ§Ã£o nÃ£o implementada.
- RevisÃ£o prÃ©-commit inclui funcionalidades de ficha/convocaÃ§Ã£o/layout registradas nas entradas anteriores. Mantidos fora `.env`, specs/backlogs, exclusÃµes `.kiro`, arquivos gerados, label local de calendÃ¡rio e alteraÃ§Ã£o textual de seed. Corrigido JSON invÃ¡lido local do package.json restaurando formato anterior; sem alteraÃ§Ã£o de dependÃªncias.
- Candidato validado com 598 testes/48 arquivos, TypeScript e build aprovados, lint sem erros (4 avisos anteriores) e auditoria sem vulnerabilidades. Staging conferido sem arquivos locais proibidos, padrÃµes de credenciais ou erros de whitespace. AutorizaÃ§Ã£o, isolamento, concessÃµes/XP e emissÃ£o de tokens revisados conforme pre-commit-review; funcionalidades externas nÃ£o validadas permanecem indisponÃ­veis, sem alegaÃ§Ã£o de prontidÃ£o SQL/LiveKit. QA manual posterior.
- Candidato validado com 598 testes/48 arquivos, TypeScript e build aprovados, lint sem erros (4 avisos anteriores) e auditoria sem vulnerabilidades. Staging conferido sem arquivos locais proibidos, padrÃµes de credenciais ou erros de whitespace. AutorizaÃ§Ã£o, isolamento, concessÃµes/XP e emissÃ£o de tokens revisados conforme pre-commit-review; funcionalidades externas nÃ£o validadas permanecem indisponÃ­veis, sem alegaÃ§Ã£o de prontidÃ£o SQL/LiveKit. QA manual posterior.

## 2026-10-13 23:54 BRT â€” style â€” Ordem da gestÃ£o da mesa
- Arquivos: `app/campaigns/[id]/page.tsx` e `tests/campaign-layout-order.test.ts`.
- ConteÃºdo apÃ³s o tÃ­tulo: anotaÃ§Ãµes, calendÃ¡rios, acesso Ã  sessÃ£o, inÃ­cio da noite, revisÃµes/gestÃ£o e depois clÃ£s e predaÃ§Ãµes. Reutilizados componentes existentes, sem novas dependÃªncias, endpoints ou alteraÃ§Ãµes de dados/permissÃµes.
- Testes de ordem e presenÃ§a Ãºnica dos painÃ©is adicionados; 593 testes/47 arquivos aprovados. RevisÃ£o focada preserva autorizaÃ§Ã£o no servidor e sequÃªncia DOM/teclado, sem novos segredos. QA visual/responsividade permanece posterior.
- TypeScript/build aprovados, lint sem erros (4 avisos anteriores), audit sem vulnerabilidades; diff focado sem problemas de whitespace.

## 2026-10-13 22:40 BRT â€” fix â€” AprovaÃ§Ã£o somente para fichas vinculadas
- Arquivos: `lib/character-specialties.ts`, `lib/predator-effects.ts`, `lib/characters.ts`, `lib/dev-db.ts`, `lib/possessions.ts`, `lib/character-rolls.ts`, API de rolagens, formulÃ¡rio, painÃ©is de especialidades/rolagens e testes correspondentes.
- Pertences e especialidades gratuitas, de predaÃ§Ã£o e compradas com XP recebem aprovaÃ§Ã£o automÃ¡tica em fichas independentes. CÃ³pias independentes recebem concessÃµes prÃ³prias; compras continuam custando 3 XP, com retry idempotente.
- Interface permite cadastrar pertence em ficha salva sem mesa e explica a dispensa. ProprietÃ¡rio independente pode aplicar especialidade aprovada em rolagem pÃºblica; rolagens secretas e revisÃ£o em mesa continuam restritas ao Narrador.
- SeguranÃ§a: vÃ­nculo derivado do servidor (inclusive no INSERT SQL), sem aceitar campanha/status enviados como autoridade; limites, habilidades, saldo e isolamento preservados. Testes reais cobrem dispensa, XP/retry, predaÃ§Ã£o/cÃ³pia, autorizaÃ§Ã£o e rolagens; 591 testes/46 arquivos aprovados, auditoria sem vulnerabilidades. RevisÃ£o de seguranÃ§a focada na alteraÃ§Ã£o, sem aprovaÃ§Ã£o do restante do WIP.
- Sem migraÃ§Ã£o de registros anteriores em memÃ³ria. QA visual e integraÃ§Ã£o PostgreSQL nÃ£o executados. Entrada futura em mesa deve reavaliar aprovaÃ§Ãµes no fluxo de vÃ­nculo ainda pendente.
- TypeScript e build aprovados; lint sem erros (4 avisos anteriores), diff focado sem problemas de whitespace.

## [2026-10-13] Resumo somente com itens preenchidos
**HorÃ¡rio:** 22:01 BRT
**Tipo:** fix | style
**Arquivos principais:** components/character-summary/summary-merits.tsx, components/character-summary/summary-disciplines.tsx, components/character-summary/summary-header.tsx, lib/vtm-v5/summary.ts, tests/character-summary-filled.test.ts

- Resumo oculta nomes vazios/whitespace/placeholders Sem nome, vantagens/defeitos e disciplinas vazias, poderes sem nome e textos de ausÃªncia. Colunas/seÃ§Ãµes sem conteÃºdo nÃ£o aparecem; itens nomeados/notas continuam visÃ­veis sem nÃ­vel zero presumido.
- Filtragem somente de apresentaÃ§Ã£o: nenhum dado/ponto/poder Ã© apagado, cÃ¡lculos/recursos zero vÃ¡lidos e autorizaÃ§Ãµes permanecem inalterados. Nome padrÃ£o do personagem passa a tÃ­tulo neutro Resumo da ficha.
- 584 testes/46 arquivos, TypeScript/lint/build aprovados (4 avisos anteriores), auditoria sem vulnerabilidades. QA manual posterior.

## [2026-10-13] Chaves Ãºnicas no relatÃ³rio de validaÃ§Ã£o
**HorÃ¡rio:** 21:45 BRT
**Tipo:** fix
**Arquivos principais:** app/characters/character-form-client.tsx, tests/vtm-v5-creation-guidance.test.ts

- Confirmada colisÃ£o: mÃºltiplas disciplinas sem poderes usam cÃ³digo/campo iguais em mensagens diferentes. Chaves dos erros/avisos passam a incluir a posiÃ§Ã£o no snapshot, sem suprimir mensagens nem mudar contratos de validaÃ§Ã£o.
- 24 testes especÃ­ficos, assert JSX, TypeScript e lint aprovados. QA manual/build nÃ£o repetidos nesta correÃ§Ã£o de chave.

## [2026-10-13] Poderes editÃ¡veis em disciplinas concedidas
**HorÃ¡rio:** 21:39 BRT
**Tipo:** fix
**Arquivos principais:** app/characters/character-form-client.tsx, lib/vtm-v5/discipline-editor.ts, tests/discipline-editor.test.ts

- Corrigida origem do bloqueio: concessÃµes persistem nÃ­vel com powers vazio; ediÃ§Ã£o mapeava array vazio e descartava texto digitado. Carregamento inicializa uma entrada independente por ponto, sem escolher poderes automaticamente nem apagar existentes/notas adicionais.
- 569 testes/45 arquivos, TypeScript/lint/build aprovados (4 avisos anteriores), auditoria sem vulnerabilidades. QA manual de navegador posterior.

## [2026-10-13] ConcessÃµes contam no preenchimento de vantagens/defeitos
**HorÃ¡rio:** 21:35 BRT
**Tipo:** fix
**Arquivos principais:** lib/vtm-v5/normalize.ts, app/characters/character-form-client.tsx, tests/vtm-v5-creation-guidance.test.ts

- Conforme decisÃ£o do usuÃ¡rio, concessÃµes de clÃ£/predaÃ§Ã£o entram no total de vantagens/defeitos exibido e validado. Removido desconto de creationAdvantageDots/creationFlawDots; origens e aplicaÃ§Ã£o/reversÃ£o das concessÃµes preservadas.
- Limites do perfil mantidos: concessÃµes de defeitos ajudam a atingir o mÃ­nimo e concessÃµes de vantagens tambÃ©m podem atingir/exceder o limite. Metadados nÃ£o podem mais mascarar a contagem real.
- 563 testes/45 arquivos, TypeScript/lint/build aprovados (4 avisos anteriores), auditoria sem vulnerabilidades. QA manual posterior.

## [2026-10-13] Legenda e feedback de concessÃ£o gratuita
**HorÃ¡rio:** 21:29 BRT
**Tipo:** fix | style
**Arquivos principais:** app/characters/character-form-client.tsx, components/character-summary/character-specialties.tsx, tests/character-specialties-selector.test.ts

- Legenda de pontos manuais em vermelho, mantendo concessÃµes automÃ¡ticas em azul.
- ConcessÃ£o gratuita mostra processamento, resultado junto ao botÃ£o (habilidade/nome, nenhum XP gasto e aprovaÃ§Ã£o real) e destaca a especialidade adicionada. NÃ£o confundir concessÃ£o pendente com bÃ´nus ativo ou aumento de pontos da habilidade; regras/autorizaÃ§Ãµes e retry idempotente preservados.
- SuÃ­te 561 testes/45 arquivos, TypeScript/lint/build aprovados (4 avisos anteriores), auditoria sem vulnerabilidades. QA manual de navegador posterior.

## [2026-10-13] Aba Disciplinas contextual e mais limpa
**HorÃ¡rio:** 21:23 BRT
**Tipo:** fix | style
**Arquivos principais:** app/characters/character-form-client.tsx, lib/vtm-v5/discipline-editor.ts, tests/discipline-editor.test.ts, tests/character-form-identity.test.ts

- Ficha inicia com uma linha vazia; carregamento ordena concessÃµes primeiro, disciplinas manuais depois e mantÃ©m um espaÃ§o vazio, respeitando limite vigente de sete. BotÃ£o existente permite adicionar outras; dados/poderes preenchidos nÃ£o sÃ£o descartados, mesmo com nome ainda vazio.
- InstruÃ§Ãµes por tipo/perfil usam regras existentes: 3 pontos 2+1 para vampiros jogadores, ponto adicional de predaÃ§Ã£o sem duplicaÃ§Ã£o, poderes por ponto; sangue-fraco sem pacote comum, NPCs com definiÃ§Ã£o do Narrador e carniÃ§al com template nÃ­vel 1/revisÃ£o acima dele. XP do perfil separado da distribuiÃ§Ã£o inicial.
- 19 testes especÃ­ficos e suÃ­te 559 testes/45 arquivos, tipos/lint/build aprovados (4 avisos anteriores). QA visual posterior; sem alteraÃ§Ãµes de autorizaÃ§Ã£o ou regras mecÃ¢nicas.
- Auditoria de dependÃªncias sem vulnerabilidades conhecidas.

## [2026-10-13] ConcessÃµes automÃ¡ticas destacadas em azul
**HorÃ¡rio:** 21:17 BRT
**Tipo:** fix | style
**Arquivos principais:** lib/vtm-v5/creation-grants.ts, lib/characters.ts, app/api/characters/route.ts, app/characters/character-form-client.tsx, components/character-summary/, app/globals.css, UI-GUIDE.md, design-system.md

- ConcessÃµes existentes de clÃ£/predaÃ§Ã£o sÃ£o projetadas por origem e ID, sem copiar estado privado ou confiar em metadata do cliente. Pontos de disciplinas/vantagens/defeitos ficam azuis na ediÃ§Ã£o; resumo indica quantidade/origem em azul e especialidades de predaÃ§Ã£o tambÃ©m sÃ£o destacadas, mantendo status de aprovaÃ§Ã£o.
- AtualizaÃ§Ã£o apÃ³s confirmar usa o ID retornado pelo salvamento, inclusive primeira criaÃ§Ã£o; concessÃµes aparecem automaticamente sem recarregar manualmente. NÃ£o cria pontos adicionais, nÃ£o escolhe poderes de Disciplina nem substitui pontos manuais.
- Token azul --grant-origin documentado no design system; rÃ³tulos/aria diferenciam clÃ£/predaÃ§Ã£o sem depender apenas da cor. EdiÃ§Ã£o de disciplina nÃ£o reduz abaixo dos pontos concedidos; validaÃ§Ã£o do servidor continua autoritativa.
- ValidaÃ§Ã£o: 548 testes/44 arquivos, TypeScript/build/lint aprovados (4 avisos anteriores), auditoria sem vulnerabilidades. QA visual posterior; sem commit solicitado.

## [2026-10-13] ConfirmaÃ§Ã£o de predaÃ§Ã£o sem salvamento manual prÃ©vio
**HorÃ¡rio:** 21:04 BRT
**Tipo:** fix
**Arquivos principais:** components/predator-types/player-predator-selector.tsx, tests/clan-predator-selectors.test.ts

- Removida mensagem de prÃ©-requisito de rascunho; confirmaÃ§Ã£o usa o salvamento automÃ¡tico existente e o ID retornado. Falha real informa os campos a corrigir, sem aplicar efeitos a ficha inexistente nem ignorar validaÃ§Ãµes.
- 9 testes e lint aprovados; build/QA manual nÃ£o repetidos para este ajuste de comunicaÃ§Ã£o.

## [2026-10-13] SeleÃ§Ã£o recolhÃ­vel de predaÃ§Ã£o
**HorÃ¡rio:** 20:56 BRT
**Tipo:** fix | style
**Arquivos principais:** components/predator-types/player-predator-selector.tsx, tests/clan-predator-selectors.test.ts

- CatÃ¡logo recolhe ao selecionar e pode ser reaberto; revisÃ£o, especialidade, disciplina e alternativas ficam visÃ­veis antes de Confirmar escolha. Selecionar nÃ£o grava automaticamente.
- ConfirmaÃ§Ã£o salva o rascunho e usa o ID retornado, inclusive na primeira criaÃ§Ã£o; remoÃ§Ã£o reabre o catÃ¡logo. AutorizaÃ§Ãµes/regras do servidor preservadas.
- 14 testes especÃ­ficos, TypeScript e lint aprovados. Foco direcionado Ã  revisÃ£o e erros visÃ­veis mesmo com catÃ¡logo recolhido; build/QA manual nÃ£o repetidos.

## [2026-10-13] Nome e Sire no inÃ­cio da Identidade
**HorÃ¡rio:** 20:46 BRT
**Tipo:** style
**Arquivos principais:** app/characters/character-form-client.tsx, tests/character-form-identity.test.ts

- Nome do personagem e Sire movidos para o primeiro bloco da aba Identidade, antes da classificaÃ§Ã£o/clÃ£/predaÃ§Ã£o, sem duplicar entradas ou alterar salvamento.
- 8 testes especÃ­ficos e lint aprovados; build/QA visual nÃ£o repetidos neste ajuste de ordem.

## [2026-10-13] CÃ¡lculos da PotÃªncia do Sangue CORE_V5
**HorÃ¡rio:** 20:43 BRT
**Tipo:** feat | fix
**Arquivos principais:** lib/vtm-v5/blood-potency.ts, lib/character-blood-potency.ts, lib/characters.ts, app/api/characters/[id]/blood-potency-effects/route.ts, components/character-summary/blood-potency-summary.tsx, app/characters/character-form-client.tsx, app/characters/[id]/character-summary-client.tsx, tests/blood-potency.test.ts

- CatÃ¡logo/cÃ¡lculo Ãºnico dos seis campos para nÃ­veis 0â€“5 conforme tabela fornecida no backlog, alimentaÃ§Ã£o estruturada e exceÃ§Ãµes Caitiff/sangue-fraco. Fonte local identificada; nÃ£o alegar conferÃªncia independente dos livros. NÃ­veis 6â€“10 e outros perfis exibem erro, sem nÃºmeros presumidos.
- CriaÃ§Ã£o/ediÃ§Ã£o exibem prÃ©via somente leitura e resumo consulta projeÃ§Ã£o autorizada; API calcula a partir da PotÃªncia real no servidor, nÃ£o dos derivados do navegador. Campos legados nÃ£o sÃ£o migrados nem usados como autoridade; alteraÃ§Ãµes forjadas recusadas na criaÃ§Ã£o/ediÃ§Ã£o geral.
- CÃ¡lculo nÃ£o grava estado, rola dados, executa cura/alimentaÃ§Ã£o ou altera Fome/danos; atualizaÃ§Ã£o de PotÃªncia mantÃ©m comandos/revisÃ£o/ledger existentes.
- PreparaÃ§Ã£o PS em memÃ³ria isolada concluÃ­da uma vez pelo script vigente, modelo/seeds e integridade OK (8 fichas/3 mesas), sem modificar banco externo/servidor corrente.
- 23 testes especÃ­ficos e suÃ­te 544 testes/43 arquivos aprovados; build aprovado. Modificadores por vantagens, Companion, perfis de campanha e execuÃ§Ã£o das aÃ§Ãµes mecÃ¢nicas permanecem pendentes; QA manual/SQL nÃ£o executados.
- TypeScript e lint aprovados (0 erros/4 avisos anteriores), auditoria sem vulnerabilidades conhecidas; revisÃ£o de seguranÃ§a/diff/scan sem achados crÃ­ticos ou altos relacionados.
- TypeScript e lint aprovados (0 erros/4 avisos anteriores), auditoria sem vulnerabilidades conhecidas; revisÃ£o de seguranÃ§a/diff/scan sem achados crÃ­ticos ou altos relacionados.

## [2026-10-13] Planejamento de PotÃªncia do Sangue e convocaÃ§Ã£o da mesa
**HorÃ¡rio:** 20:28 BRT
**Tipo:** feat | docs | fix
**Arquivos principais:** lib/campaign-calls.ts, app/api/campaigns/[id]/call/route.ts, app/api/livekit/room/route.ts, components/livekit/livekit-room-link.tsx, app/characters/page.tsx, tests/campaign-calls.test.ts, tests/campaign-call-ui.test.ts

- Workflow de autopreenchimento organizado em requirements/design/tasks/meta locais; fontes, preparaÃ§Ã£o, cÃ¡lculo, API/UI, aÃ§Ãµes mecÃ¢nicas e validaÃ§Ãµes dependentes. Nenhum valor de PotÃªncia calculado nesta entrega; fontes nÃ£o conferidas nÃ£o sÃ£o inventadas.
- PreparaÃ§Ã£o da convocaÃ§Ã£o: reset Ãºnico em memÃ³ria isolada, modelo vigente/seeds, 8 fichas/3 mesas e integridade OK; nenhum PostgreSQL ou servidor em execuÃ§Ã£o modificado.
- Narrador atual convoca/encerra; participantes recebem entrada em Suas criaturas, por mesa deduplicada/nomeada, atualizada por foco/polling de 5s. Entrada como host nÃ£o convoca implicitamente; Narrador deve preparar a sala.
- API valida sessÃ£o/participaÃ§Ã£o atual/CSRF/JSON/UUID; status sem token. Entrada do jogador exige convocaÃ§Ã£o no servidor e revalida acesso apÃ³s geraÃ§Ã£o; host Ã© o Narrador atual. Erros internos protegidos e respostas no-store.
- MVP somente em memÃ³ria de dev, indisponÃ­vel em SQL/produÃ§Ã£o; nÃ£o representa GameSession P1. Encerrar bloqueia novas entradas, mas nÃ£o revoga JWTs jÃ¡ emitidos ou desconecta usuÃ¡rios remotamente por SDK.
- ValidaÃ§Ã£o: 9 testes especÃ­ficos e suÃ­te 521 testes/42 arquivos aprovados; TypeScript/build aprovados, lint sem erros (4 avisos anteriores), audit sem vulnerabilidades e scan/diff-check sem achados. ConexÃ£o LiveKit real e QA manual posteriores; sem commit solicitado.

## [2026-10-13] Identidade e validaÃ§Ã£o em todas as etapas
**HorÃ¡rio:** 20:07 BRT
**Tipo:** fix | style
**Arquivos principais:** app/characters/character-form-client.tsx, tests/character-form-identity.test.ts

- Removidas entradas redundantes de clÃ£/predaÃ§Ã£o para vampiro jogador, definidos pelos seletores; XP total/gasto/disponÃ­vel apresentado como resumo, sem inputs.
- GeraÃ§Ã£o, Sire, PotÃªncia de Sangue e detalhes de sangue permanecem manuais: nÃ£o hÃ¡ cÃ¡lculo automÃ¡tico desses detalhes no cÃ³digo atual. Campos de clÃ£/predaÃ§Ã£o para NPCs/retentores preservados.
- ValidaÃ§Ã£o disponÃ­vel no rodapÃ© de todas as abas; salva antes de validar e trata falha de conexÃ£o sem bloquear permanentemente o botÃ£o. Campos de sangue desmontados nÃ£o sÃ£o apagados ao salvar em outra aba.
- ValidaÃ§Ãµes: 8 testes especÃ­ficos de renderizaÃ§Ã£o (7 etapas + identidade), suÃ­te 512 testes/40 arquivos, TypeScript, lint dos arquivos e build aprovados; auditoria sem vulnerabilidades. Rotas/autorizaÃ§Ã£o e autoridade dos campos derivados mantidas; QA manual posterior.

## [2026-10-13] PreparaÃ§Ã£o de commit â€” anotaÃ§Ãµes e gestÃ£o contextual
**HorÃ¡rio:** 19:23 BRT
**Tipo:** feat | fix | style
**Arquivos principais:** app/api/campaigns/[id]/clans/route.ts, app/api/campaigns/[id]/predator-types/route.ts, components/character-summary/campaign-clans.tsx, components/predator-types/master-catalog.tsx, components/duplicate-character-button.tsx, app/characters/page.tsx

- GestÃ£o exibe somente clÃ£s/predaÃ§Ãµes representados entre os participantes, deduplicando aliases e ignorando fichas de outra mesa. Rotas permanecem restritas ao Narrador atual; testes validam autenticaÃ§Ã£o, ID, autorizaÃ§Ã£o e ausÃªncia de dados privados das fichas.
- RÃ³tulos da listagem simplificados para Vinculados/Desvinculados e aÃ§Ã£o Duplicar, sem mudar a duplicaÃ§Ã£o independente.
- Commit inclui P2 em memÃ³ria e ajustes da mesa/ficha jÃ¡ documentados; specs/backlogs locais, exclusÃµes .kiro, arquivos gerados, label local do calendÃ¡rio e configuraÃ§Ã£o de clÃ£s/predaÃ§Ãµes na criaÃ§Ã£o da campanha ficam fora.
- PrÃ©-commit: 502 testes/39 arquivos aprovados e 13 testes especÃ­ficos de rotas apÃ³s ampliar cobertura; TypeScript e lint sem erros (4 avisos anteriores), diff e scan de segredos aprovados. Sem push solicitado.
- Build de produÃ§Ã£o aprovado e pnpm audit sem vulnerabilidades conhecidas na revisÃ£o prÃ©-commit.
- Build de produÃ§Ã£o aprovado e pnpm audit sem vulnerabilidades conhecidas na revisÃ£o prÃ©-commit.

## [2026-10-13] Ordem dos seletores de identidade
**HorÃ¡rio:** 19:18 BRT
**Tipo:** style
**Arquivos principais:** app/characters/character-form-client.tsx

- Seletor de clÃ£ exibido antes de predaÃ§Ã£o, sem alterar regras, permissÃµes ou salvamento.

## [2026-10-13] GestÃ£o contextual da mesa e catÃ¡logo inicial de clÃ£s
**HorÃ¡rio:** 19:07 BRT
**Tipo:** feat | fix
**Arquivos principais:** components/master-panel.tsx, components/notes/campaign-notes-dialog.tsx, components/notes/notes-panel.tsx, app/campaigns/[id]/page.tsx, components/character-summary/character-clan.tsx, app/characters/character-form-client.tsx

- RevisÃ£o de pertences aparece somente com pendÃªncias; revalidaÃ§Ã£o apÃ³s revisÃ£o, foco e a cada 15 segundos detecta novas solicitaÃ§Ãµes. ConcessÃ£o e XP permanecem disponÃ­veis.
- AnotaÃ§Ãµes destacadas no topo da gestÃ£o abrem dialog modal nativo sem sair da mesa; fechar mantÃ©m o rascunho montado. Novas anotaÃ§Ãµes usam o contexto da mesa e continuam privadas por padrÃ£o.
- Participantes possuem link para ficha resumida, reutilizando autorizaÃ§Ã£o do proprietÃ¡rio/Narrador atual, com teste de revogaÃ§Ã£o apÃ³s troca e desvÃ­nculo.
- CatÃ¡logo pÃºblico de clÃ£s disponÃ­vel antes do primeiro rascunho; confirmaÃ§Ã£o salva a ficha e usa o ID/revisÃ£o retornados, mantendo validaÃ§Ã£o da polÃ­tica no servidor.
- PreparaÃ§Ã£o da SPEC em processo isolado de testes: reset Ãºnico de memÃ³ria, modelo atual e seeds (8 personagens/3 mesas), integridade aprovada; nenhum banco externo ou servidor em execuÃ§Ã£o alterado.
- Testes especÃ­ficos: 19 aprovados em 4 arquivos; build aprovado e auditoria sem vulnerabilidades conhecidas. QA manual posterior; notas permanecem exclusivamente em memÃ³ria no desenvolvimento.
- SuÃ­te completa: 502 testes/39 arquivos; TypeScript aprovado, lint sem erros (4 avisos preexistentes). RevisÃ£o de seguranÃ§a desta SPEC sem achados crÃ­ticos/altos; nÃ£o constitui aprovaÃ§Ã£o de alteraÃ§Ãµes anteriores para commit.


## [2026-10-13] PredaÃ§Ãµes de personagens sem mesa
**HorÃ¡rio:** 19:02 BRT
**Tipo:** fix
**Arquivos principais:** lib/predator-types.ts, tests/predator-types-security.test.ts

- CatÃ¡logo e validaÃ§Ã£o de gravaÃ§Ã£o liberam Livro bÃ¡sico e Livro do Jogador para personagens independentes, mantendo as restriÃ§Ãµes das campanhas.
- RegressÃ£o cobre catÃ¡logo, isolamento de referÃªncias, gravaÃ§Ã£o sem mesa e rejeiÃ§Ã£o apÃ³s vÃ­nculo restrito. SuÃ­te: 493 testes aprovados em 37 arquivos.
- TypeScript sem emissÃ£o e lint dos arquivos alterados aprovados. Sem alteraÃ§Ã£o das autorizaÃ§Ãµes ou dos dados existentes; build e QA visual nÃ£o repetidos nesta correÃ§Ã£o.

Cada entrada deve incluir data, horÃ¡rio (BRT), tipo e resumo do que foi feito.

**Formato de entrada:**
```
## [AAAA-MM-DD] vX.X â€” TÃ­tulo da sessÃ£o
**HorÃ¡rio:** HH:MM BRT
**Tipo:** feat | fix | refactor | style | chore | docs
**Arquivos principais:** lista dos arquivos alterados

- Resumo item 1
- Resumo item 2
```

---

## [2026-10-13] â€” P2 em memÃ³ria, planejamento P1 e validaÃ§Ã£o do backlog

**HorÃ¡rio:** 15:00 BRT
**Tipo:** feat | fix | docs
**Arquivos principais:** `lib/notes.ts`, `lib/notes-http.ts`, `lib/availability.ts`, `lib/dev-db.ts`, `app/api/notes/`, `app/notes/page.tsx`, `components/notes/notes-panel.tsx`, `app/characters/page.tsx`, `app/characters/[id]/character-summary-client.tsx`, `components/campaign-calendar/event-card.tsx`, `components/awake-panel.tsx`, `tests/notes*.test.ts`, `codex/specs/sistema-anotacoes/`, `codex/specs/modo-sessao/`, `codex/backlog/backlog-mestre.md`, `codex/backlog/validacao-implementacao.md`, `codex/specs/README.md`.

- P2: notas pessoais/exclusivas do Narrador atual, compartilhamento explÃ­cito somente leitura/revogaÃ§Ã£o, CRUD revisado/idempotente e backlinks para fichas/NPCs/eventos/noites; projeÃ§Ãµes omitem alvos secretos e contagens ocultas. Armazenamento exclusivamente dev/test em memÃ³ria, SQL/produÃ§Ã£o explicitamente indisponÃ­veis.
- Corrigida participaÃ§Ã£o de dev no helper compartilhado, sem acesso universal. APIs validam entrada/limites em streaming, CSRF/sessÃ£o, UUIDs/IDs Auth0, autoria/status e revisÃµes; nenhuma publicaÃ§Ã£o realtime ou log de texto privado.
- Editor/listagem paginada e opÃ§Ãµes autorizadas, confirmaÃ§Ã£o de compartilhar/excluir, cache por perfil/perda de acesso e links contextuais. CÃ³pia de ficha nÃ£o copia notas; exclusÃ£o de entidade no provider remove relaÃ§Ãµes sem apagar texto pessoal.
- P1 planejado em requirements/design/tasks/meta: sessÃ£o real distinta de noite/sala, LiveKit existente, comandos canÃ´nicos, SSE autorizado/reconexÃ£o e ferramentas contextuais. Oito tasks pending; nenhum cÃ³digo P1/reset dessa SPEC.
- Oito itens do backlog confrontados com cÃ³digo/testes; ambas as tabelas repetidas atualizadas sem limpar registros histÃ³ricos. Itens, sessÃ£o central/realtime e exclusÃµes seguem parciais/pendentes; duplicaÃ§Ã£o e nÃºcleo de rolagens jÃ¡ testados.
- ValidaÃ§Ãµes: 490 testes/37 arquivos, tipos aprovados com incremental desabilitado para evitar diagnÃ³stico de cache antigo, build aprovado, lint zero erros/quatro avisos preexistentes e auditoria zerada; diff-check/scan sem achados. Review final registrado na SPEC; SQL/LiveKit reais e QA manual nÃ£o executados. Nenhum commit/staging/push solicitado nesta rodada.

## [2026-10-13] â€” PreparaÃ§Ã£o P2 de anotaÃ§Ãµes

**HorÃ¡rio:** 14:39 BRT
**Tipo:** chore | docs
**Arquivos principais:** `tests/notes-preparation.test.ts`, `scripts/prepare-v5-development.mjs`, `codex/specs/sistema-anotacoes/tasks.md`, `CHANGELOG.md`.

- Confirmada configuraÃ§Ã£o efetiva de desenvolvimento somente em memÃ³ria, sem DATABASE_URL. Script existente usado no processo isolado de testes, sem alterar servidor em execuÃ§Ã£o, conexÃ£o externa ou autenticaÃ§Ã£o.
- Reset/inicializaÃ§Ã£o descartÃ¡vel e seeds validados: duas mesas de testes, jogadores, personagem independente, NPC reservado, evento e noite registrada. RelaÃ§Ãµes/integridade aprovadas; execuÃ§Ãµes de teste usam fixtures isoladas e nÃ£o resetam banco persistente.
- PreparaÃ§Ã£o registrada antes de desenvolver o mÃ³dulo; SESSION referencia noite registrada, nÃ£o sala LiveKit. Membership permissivo de dev serÃ¡ corrigido no helper compartilhado.

## [2026-10-13] â€” PreparaÃ§Ã£o P2 de anotaÃ§Ãµes

**HorÃ¡rio:** 14:39 BRT
**Tipo:** chore | docs
**Arquivos principais:** `tests/notes-preparation.test.ts`, `scripts/prepare-v5-development.mjs`, `codex/specs/sistema-anotacoes/tasks.md`, `CHANGELOG.md`.

- Confirmada configuraÃ§Ã£o efetiva de desenvolvimento somente em memÃ³ria, sem DATABASE_URL. Script existente usado no processo isolado de testes, sem alterar servidor em execuÃ§Ã£o, conexÃ£o externa ou autenticaÃ§Ã£o.
- Reset/inicializaÃ§Ã£o descartÃ¡vel e seeds validados: duas mesas de testes, jogadores, personagem independente, NPC reservado, evento e noite registrada. RelaÃ§Ãµes/integridade aprovadas; execuÃ§Ãµes de teste usam fixtures isoladas e nÃ£o resetam banco persistente.
- PreparaÃ§Ã£o registrada antes de desenvolver o mÃ³dulo; SESSION referencia noite registrada, nÃ£o sala LiveKit. Membership permissivo de dev serÃ¡ corrigido no helper compartilhado.

## [2026-10-13] â€” PreparaÃ§Ã£o e revisÃ£o do commit

**HorÃ¡rio:** 14:29 BRT
**Tipo:** chore | docs
**Arquivos principais:** `CHANGELOG.md`, `codex/specs/vtm-v5-fichas-e-inicio-de-noite/review.md`, `codex/specs/vtm-v5-fichas-e-inicio-de-noite/tasks.md`.

- RevisÃ£o prÃ©-commit do candidato de clÃ£s, efeitos/seguranÃ§a de predaÃ§Ã£o, elegibilidade de especialidades, APIs/UI, testes e instruÃ§Ãµes. Removidas entradas duplicadas de clÃ£s/especialidades deste changelog, sem remover registros Ãºnicos.
- RevalidaÃ§Ã£o: 468 testes/34 arquivos aprovados, TypeScript/build aprovados, lint zero erros/4 avisos preexistentes, pnpm audit zero vulnerabilidades; diff-check e scan direcionado sem achados. Build pula tipos, portanto tsc foi executado separadamente.
- Specs/backlog locais (`codex/` e `.codex/`), exclusÃµes da antiga `.kiro/`, artefatos gerados, script isolado de preparaÃ§Ã£o nÃ£o reexecutado e mudanÃ§a avulsa de label do calendÃ¡rio ficam fora do candidato. Nenhum reset, acesso SQL externo ou commit executado. SQL/QA manual continuam posteriores.

## [2026-10-13] â€” PreparaÃ§Ã£o e revisÃ£o do commit

**HorÃ¡rio:** 14:29 BRT
**Tipo:** chore | docs
**Arquivos principais:** `CHANGELOG.md`, `codex/specs/vtm-v5-fichas-e-inicio-de-noite/review.md`, `codex/specs/vtm-v5-fichas-e-inicio-de-noite/tasks.md`.

- RevisÃ£o prÃ©-commit do candidato de clÃ£s, efeitos/seguranÃ§a de predaÃ§Ã£o, elegibilidade de especialidades, APIs/UI, testes e instruÃ§Ãµes. Removidas entradas duplicadas de clÃ£s/especialidades deste changelog, sem remover registros Ãºnicos.
- RevalidaÃ§Ã£o: 468 testes/34 arquivos aprovados, TypeScript/build aprovados, lint zero erros/4 avisos preexistentes, pnpm audit zero vulnerabilidades; diff-check e scan direcionado sem achados. Build pula tipos, portanto tsc foi executado separadamente.
- Specs/backlog locais (`codex/` e `.codex/`), exclusÃµes da antiga `.kiro/`, artefatos gerados, script isolado de preparaÃ§Ã£o nÃ£o reexecutado e mudanÃ§a avulsa de label do calendÃ¡rio ficam fora do candidato. Nenhum reset, acesso SQL externo ou commit executado. SQL/QA manual continuam posteriores.

## [2026-10-13] â€” Planejamento do sistema de anotaÃ§Ãµes P2

**HorÃ¡rio:** 14:14 BRT
**Tipo:** docs
**Arquivos principais:** `codex/specs/sistema-anotacoes/requirements.md`, `codex/specs/sistema-anotacoes/design.md`, `codex/specs/sistema-anotacoes/tasks.md`, `codex/specs/sistema-anotacoes/tasks.meta.json`, `codex/specs/README.md`, `codex/backlog/backlog-mestre.md`, `CHANGELOG.md`.

- Elaborada SPEC do P2 com notas privadas/exclusivas do Narrador, grants explÃ­citos revogÃ¡veis e backlinks autorizados de fichas/NPCs/eventos/sessÃµes.
- Dez tarefas dependentes, todas pending: preparaÃ§Ã£o Ãºnica de memÃ³ria futura, domÃ­nio/APIs/UI, seguranÃ§a e revisÃ£o. Nenhuma implementaÃ§Ã£o/reset ou conexÃ£o externa nesta etapa.
- Documentado helper permissivo de participaÃ§Ã£o em dev como prÃ©-requisito de correÃ§Ã£o; contratos tratam metadados privados, concorrÃªncia, lifecycle e decisÃ£o de sessÃ£o/noite. Sem migraÃ§Ã£o de textos existentes/editor rico/realtime.

## [2026-10-13] â€” InstruÃ§Ãµes Ponytail para agentes

**HorÃ¡rio:** 14:08 BRT
**Tipo:** docs
**Arquivos principais:** `AGENTS.md`, `CHANGELOG.md`.

- Adicionado integralmente o bloco solicitado de desenvolvimento mÃ­nimo, escopo, reutilizaÃ§Ã£o, validaÃ§Ã£o e comunicaÃ§Ã£o de limitaÃ§Ãµes/riscos, preservando as regras existentes.

## [2026-10-13] â€” ClÃ£s e concessÃµes completas de predaÃ§Ã£o

**HorÃ¡rio:** 13:33 BRT
**Tipo:** feat | fix | docs
**Arquivos principais:** `lib/vtm-v5/clans.ts`, `lib/character-clans.ts`, `lib/creation-effects.ts`, `lib/predator-effects.ts`, `lib/vtm-v5/predator-types/`, `lib/characters.ts`, `lib/vtm-v5/normalize.ts`, `lib/vtm-v5/validation.ts`, `app/api/characters/[id]/clan/route.ts`, `app/api/characters/[id]/predator-type/route.ts`, `app/api/characters/route.ts`, `components/character-summary/character-clan.tsx`, `components/predator-types/player-predator-selector.tsx`, `app/characters/character-form-client.tsx`, `app/characters/[id]/character-summary-client.tsx`, `tests/character-clans.test.ts`, `tests/clans-and-predator-mechanics.test.ts`, `tests/clan-predator-selectors.test.ts`, `tests/predator-types-core.test.ts`, `codex/specs/`.

- PreparaÃ§Ã£o compartilhada da SPEC reutilizada: reset/seeds/integridade em memÃ³ria concluÃ­dos em 12/10/2026 22:01 BRT. Nenhum novo reset, migraÃ§Ã£o, backfill automÃ¡tico ou acesso a banco externo.
- CatÃ¡logo versionado dos sete clÃ£s bÃ¡sicos, Caitiff e sangue-fraco; disciplinas 2+1, preferÃªncias/categoria especÃ­ficas, PerdiÃ§Ã£o/CompulsÃ£o pÃºblicas e orientaÃ§Ã£o separada por perfil. ClÃ£s com referÃªncia incompleta nÃ£o sÃ£o habilitados.
- SeleÃ§Ã£o de clÃ£ autorizada no servidor, revisÃ£o otimista, replay idempotente e ledger; Narrador da mesa retorna ficha a rascunho. Nosferatu/Caitiff recebem defeitos rastreados, com restriÃ§Ãµes cruzadas e perfil sangue-fraco separado.
- Os 28 predadores materializam disciplina extra, especialidade pendente, traÃ§os fixos e escolhas alternativas/distribuiÃ§Ãµes; restriÃ§Ãµes Tremere/Nosferatu e exceÃ§Ã£o explÃ­cita do Narrador para sangue-fraco. Troca/remoÃ§Ã£o preserva outras origens, XP e danos; inconsistÃªncias sÃ£o rejeitadas atomicamente.
- Humanidade Ã© recalculada sobre o estado canÃ´nico da sessÃ£o dentro do comando, preservando mudanÃ§as posteriores do Narrador; respostas retornam valores persistidos, nÃ£o projeÃ§Ãµes antigas de JSON.
- FormulÃ¡rio e resumo exibem clÃ£, escolhas e regras; confirmaÃ§Ã£o salva o rascunho antes da seleÃ§Ã£o. OrÃ§amentos excluem concessÃµes automÃ¡ticas e consideram a disciplina de predaÃ§Ã£o; IDs de traÃ§os sÃ£o preservados. DuplicaÃ§Ã£o copia somente origens pÃºblicas, sem aprovaÃ§Ã£o, mesa ou dados privados.
- ValidaÃ§Ãµes: 468 testes/34 arquivos, TypeScript/build aprovados; lint zero erros/quatro avisos preexistentes; pnpm audit zero vulnerabilidades; diff-check e scan direcionado sem achados. Build configura skip de tipos, por isso TypeScript foi validado separadamente. RevisÃ£o prÃ©-commit direcionada realizada; nenhum commit/staging.
- ReferÃªncias exclusivamente locais; poderes continuam manuais. AutomaÃ§Ã£o contextual de PerdiÃ§Ã£o/CompulsÃ£o, catÃ¡logo adicional/Alquimia, configuraÃ§Ã£o avanÃ§ada por mesa e histÃ³rico refinado permanecem pendentes. QA de navegador e SQL operacional continuam posteriores, nÃ£o gates desta entrega em memÃ³ria.

## [2026-10-13] â€” Resumo das implementaÃ§Ãµes e pendÃªncias das SPECs

**HorÃ¡rio:** 12:35 BRT
**Tipo:** docs
**Arquivos principais:** `codex/specs/resumo-implementacao.md`, `codex/specs/README.md`, `codex/specs/vtm-v5-fichas-e-inicio-de-noite/spec.md`, `CHANGELOG.md`.

- Percorridos os sete diretÃ³rios de funcionalidades, documentos de apoio e metadados; consolidado panorama de implementaÃ§Ã£o, limitaÃ§Ãµes, pendÃªncias e prÃ³ximos passos, confrontado com cÃ³digo/rotas/componentes existentes.
- Diferenciados checklists histÃ³ricos e evidÃªncias atuais: auditoria zerada, SQL adiado e QA desejÃ¡vel nÃ£o constituem bloqueios antigos ainda ativos. NÃ£o promovidas tarefas automaticamente; clÃ£s, efeitos de predadores, itens/vÃ­nculo e evoluÃ§Ã£o de jogo permanecem parciais.
- README aponta o resumo e caminho atual codex/specs; corrigidos status geral desatualizado da SPEC de fichas e localizaÃ§Ã£o da referÃªncia de clÃ£s. AtualizaÃ§Ã£o exclusivamente documental, sem reset, novos testes de aplicaÃ§Ã£o ou commit; resultados de 385 testes sÃ£o evidÃªncias anteriores.

## [2026-10-13] â€” ValidaÃ§Ã£o de habilidades e seletor de especialidades

**HorÃ¡rio:** 12:18 BRT
**Tipo:** fix | feat | docs
**Arquivos principais:** `lib/vtm-v5/skills.ts`, `lib/vtm-v5/specialties.ts`, `lib/character-specialties.ts`, `lib/characters.ts`, `components/character-summary/character-specialties.tsx`, `app/characters/character-form-client.tsx`, `tests/vtm-v5-skills.test.ts`, `tests/character-specialties-selector.test.ts`, `tests/character-specialties-command.test.ts`, `CHANGELOG.md`.

- Centralizados IDs/rÃ³tulos, aliases e validaÃ§Ã£o de pontos inteiros 0â€“5. Aliases equivalentes deduplicados, conflitos/desconhecidos/valores invÃ¡lidos diagnosticados. Elegibilidade considera pontos, limites, concessÃµes, opÃ§Ãµes do predador e especialidades pendentes/aprovadas. API gera opÃ§Ãµes por compra/grantId, sem confiar no cliente para custo/aprovaÃ§Ã£o.
- FormulÃ¡rio carrega rÃ³tulos corretos e salva chaves canÃ´nicas; merge parcial substitui aliases editados sem perder outras habilidades. Prefixos em caixa diferente tambÃ©m invalidam aprovaÃ§Ã£o, impedindo bypass de revisÃ£o. Seletor acompanha pontos em ediÃ§Ã£o e revisÃµes salvas; antes de confirmar, salva alteraÃ§Ãµes e relÃª elegibilidade/revisÃ£o autoritativas. Falha impede envio; retry jÃ¡ enviado preserva comando/chave.
- ValidaÃ§Ã£o: 31 arquivos/385 testes aprovados, TypeScript/build aprovados, lint direcionado sem erros; lint completo zero erros/cinco avisos existentes, pnpm audit zero. Testes de renderizaÃ§Ã£o verificam opÃ§Ãµes salvas/rascunho/sem pontos (nÃ£o equivalem a QA de navegador). Sem banco externo, reset de SPEC ou commit. DocumentaÃ§Ã£o encontrada em codex/ apÃ³s movimentaÃ§Ã£o externa durante a execuÃ§Ã£o; arquivos locais nÃ£o adicionados ao staging.

## [2026-10-13] â€” Endurecimento de seguranÃ§a de predaÃ§Ã£o

**HorÃ¡rio:** 11:54 BRT
**Tipo:** fix | docs
**Arquivos principais:** `lib/predator-types.ts`, `lib/characters.ts`, rotas de seleÃ§Ã£o/remoÃ§Ã£o/override/configuraÃ§Ã£o de predadores, `app/api/migrate/route.ts`, `components/predator-types/master-catalog.tsx`, `tests/predator-types-security.test.ts`, testes adjacentes de rotas, `CHANGELOG.md`; documentaÃ§Ã£o local .codex fora do commit.

- ConfiguraÃ§Ãµes agora rejeitam objetos/arrays/cÃ³digos/campos invÃ¡lidos e listas excessivas; leituras/gravaÃ§Ãµes em memÃ³ria isoladas por clone e associadas ao store atual, sem referÃªncias compartilhadas apÃ³s reset. ServiÃ§o de configuraÃ§Ã£o reverifica Narrador; UUIDs invÃ¡lidos e falhas de infraestrutura recebem respostas controladas.
- SeleÃ§Ã£o/remoÃ§Ã£o/override usam comandos com autorizaÃ§Ã£o e status atuais, revisÃ£o e ledger atÃ´micos. ProjeÃ§Ã£o de campos impede escrita econÃ´mica/narrativa alheia; mudanÃ§as concorrentes sÃ£o rejeitadas. PolÃ­tica de mesa/restriÃ§Ãµes sÃ£o reverificadas na gravaÃ§Ã£o em memÃ³ria, inclusive escolha preparada antes de desabilitaÃ§Ã£o. Overrides usam allowlist de regras, rejeitam duplicatas ativas e retornam ficha a rascunho.
- MudanÃ§a de configuraÃ§Ã£o invalida aprovaÃ§Ã£o das fichas elegÃ­veis jÃ¡ com predador e incrementa revisÃ£o, preservando escolhas/recursos, com eventos do Narrador; atualizaÃ§Ã£o e auditoria no mesmo commit sÃ­ncrono em memÃ³ria/transaÃ§Ã£o SQL planejada. UI comunica necessidade de nova aprovaÃ§Ã£o. Removido backfill automÃ¡tico de predadores da rota administrativa e helper legado, sem executar migraÃ§Ã£o/reset.
- ValidaÃ§Ã£o: 29 arquivos/364 testes aprovados, incluindo 12 testes de serviÃ§o em memÃ³ria real e negativos 401/403/UUID/regra/duplicata; TypeScript/build aprovados, lint zero erros/cinco avisos existentes, audit pnpm zero vulnerabilidades e diff-check/scan direcionados sem achados. SQL real continua backlog; nÃ£o declarar implementaÃ§Ã£o persistente pronta ou efeitos mecÃ¢nicos completos. Nenhum commit executado.

## [2026-10-13] â€” SimplificaÃ§Ã£o da projeÃ§Ã£o de duplicaÃ§Ã£o

**HorÃ¡rio:** 02:12 BRT
**Tipo:** refactor
**Arquivos principais:** `lib/character-duplicate.ts`, `tests/character-duplicate-projection.test.ts`, `CHANGELOG.md`.

- Separadas projeÃ§Ãµes de traÃ§os, disciplinas, poderes, danos e seleÃ§Ã£o de predador em funÃ§Ãµes pequenas; reduzidos callbacks aninhados e centralizada allowlist de poderes/defaults. Mantidos campos permitidos, versÃ£o aplicada, remoÃ§Ã£o de dados privados e isolamento por clone; grupo regex sem captura desnecessÃ¡ria.
- ValidaÃ§Ã£o direcionada: 3 arquivos/24 testes aprovados, TypeScript e lint dos arquivos tocados sem erros. IncluÃ­dos casos de conteÃºdo privado, tipos invÃ¡lidos, defaults, campos dinÃ¢micos e ausÃªncia de referÃªncias compartilhadas. RelatÃ³rio/IDs SonarQube nÃ£o disponÃ­veis localmente, solicitados ao usuÃ¡rio; nÃ£o alegada anÃ¡lise Sonar ou resoluÃ§Ã£o de todos os seus achados.

## [2026-10-13] â€” CorreÃ§Ã£o das cadeias vulnerÃ¡veis da CLI Vercel

**HorÃ¡rio:** 02:07 BRT
**Tipo:** fix | chore | docs
**Arquivos principais:** `package.json`, `pnpm-lock.yaml`, `package-lock.json`, `README.md`, `CHANGELOG.md`; evidÃªncias locais em .codex, fora do commit.

- Auditoria identificou as cadeias vulnerÃ¡veis na CLI vercel, nÃ£o referenciada por scripts/imports do projeto. Removida essa dependÃªncia desnecessÃ¡ria e sincronizadas as Ã¡rvores/lockfiles pnpm e npm sem overrides forÃ§ados nem alteraÃ§Ã£o das outras dependÃªncias diretas nesta rodada. @vercel/analytics preservado; documentaÃ§Ã£o explica que eventual CLI de deploy local deve ser configurada separadamente e auditada.
- pnpm audit e npm audit atuais sem vulnerabilidades em qualquer severidade. Gate alto/crÃ­tico da auditoria resolvido; nÃ£o Ã© garantia absoluta de seguranÃ§a nem conclusÃ£o das funcionalidades pendentes.
- ReinstalaÃ§Ã£o pnpm com scripts desabilitados; apÃ³s bloqueio de acesso a node_modules, repetida com permissÃ£o ampliada. ValidaÃ§Ã£o: 27 arquivos/344 testes aprovados, TypeScript/build aprovados, lint zero erros/seis avisos, diff-check e scan de segredos direcionados sem achados. Nenhum reset, banco externo ou commit executado; .codex segue ignorada.

## [2026-10-13] â€” RevalidaÃ§Ã£o do candidato a commit

**HorÃ¡rio:** 02:01 BRT
**Tipo:** docs
**Arquivos principais:** `CHANGELOG.md`; review/tasks/metadados locais da SPEC, fora do commit conforme regra .codex.

- Reaplicada revisÃ£o prÃ©-commit ao workspace: 27 arquivos/344 testes aprovados, TypeScript/lint/build aprovados (6 avisos). Auditoria pnpm atual: 43 achados (1 crÃ­tico, 20 altos, 17 moderados, 5 baixos); crÃ­tico tar ainda bloqueia junto aos altos.
- Role mestre resolvido; SQL futuro e QA desejÃ¡vel nÃ£o bloqueiam escopo dev. .codex ignorada e fora do staging; staging vazio. SeleÃ§Ã£o final deve evitar deleÃ§Ãµes .kiro e artefatos; whitespace residual em pages/api/auth/me.ts registrado. Sem alteraÃ§Ãµes de aplicaÃ§Ã£o/dependÃªncias, reset ou commit nesta rodada.

## [2026-10-13] â€” Contexto das alteraÃ§Ãµes de dependÃªncias

**HorÃ¡rio:** 01:58 BRT
**Tipo:** docs
**Arquivos principais:** `CHANGELOG.md`; contexto de alteraÃ§Ãµes existentes em `package.json` e lockfiles.

- Motivo confirmado pelo usuÃ¡rio para alteraÃ§Ãµes de shadcn/Vercel: erros de build motivaram a mudanÃ§a de versÃµes. NÃ£o realizadas novas alteraÃ§Ãµes de dependÃªncias nesta confirmaÃ§Ã£o; build jÃ¡ aprovado apÃ³s remoÃ§Ã£o do import CSS incompatÃ­vel.
- AWS SDK foi adicionado para uma tentativa de integraÃ§Ã£o de banco posteriormente nÃ£o continuada. DependÃªncias S3 presentes nÃ£o representam integraÃ§Ã£o PostgreSQL entregue; planejamento de persistÃªncia externa permanece no backlog. NÃ£o alegada implementaÃ§Ã£o operacional nem removidos pacotes nesta rodada.
- .codex Ã© ignorada apenas no versionamento Git; arquivos continuam disponÃ­veis localmente para leitura, planejamento e revisÃ£o. A regra nÃ£o exclui a pasta do trabalho do agente nem apaga seu conteÃºdo.

## [2026-10-13] â€” ExclusÃ£o da pasta local .codex do commit

**HorÃ¡rio:** 01:52 BRT
**Tipo:** chore | docs
**Arquivos principais:** `.gitignore`, `AGENTS.md`, `CHANGELOG.md`.

- Pasta .codex ignorada e retirada do staging, por decisÃ£o do usuÃ¡rio. Renomes associados a .kiro tambÃ©m retirados do staging para nÃ£o incluir exclusÃµes acidentais. Arquivos locais preservados; nenhuma alteraÃ§Ã£o de histÃ³rico ou commit executada.
- Regra registrada no AGENTS para futuras seleÃ§Ãµes de arquivos; documentaÃ§Ã£o local da revisÃ£o nÃ£o serÃ¡ adicionada ao commit.

## [2026-10-13] â€” QA visual definido como desejÃ¡vel

**HorÃ¡rio:** 01:51 BRT
**Tipo:** docs
**Arquivos principais:** `AGENTS.md`, `.codex/backlog/qa-visual-responsividade.md`, `.codex/backlog/backlog-mestre.md`, requirements/design/tasks/metadados/review da SPEC de fichas V5, `.codex/specs/character/tasks.md`, `CHANGELOG.md`.

- Registrada decisÃ£o do usuÃ¡rio: QA manual visual/acessibilidade/responsividade posterior e desejÃ¡vel, sem obrigatoriedade para commit atual. Planejamento transferido ao backlog e gate documental atualizado, sem alegar QA executado.
- SeguranÃ§a/autorizaÃ§Ã£o, validaÃ§Ãµes automatizadas e correÃ§Ã£o de vulnerabilidades crÃ­ticas/altas continuam obrigatÃ³rias. MudanÃ§a exclusivamente documental; nenhum teste visual ou alteraÃ§Ã£o de aplicaÃ§Ã£o realizada.

## [2026-10-13] â€” IntegraÃ§Ã£o PostgreSQL adiada para backlog

**HorÃ¡rio:** 01:45 BRT
**Tipo:** docs
**Arquivos principais:** `AGENTS.md`, `.codex/backlog/integracao-postgresql.md`, `.codex/backlog/backlog-mestre.md`, requirements/design/tasks/metadados/review da SPEC de fichas V5, `.codex/specs/character/tasks.md`, `CHANGELOG.md`.

- Registrada decisÃ£o do usuÃ¡rio: dev somente em memÃ³ria; conexÃ£o/integraÃ§Ã£o operacional PostgreSQL e testes reais passam ao backlog, fora do gate dev atual. Schema/caminhos SQL existentes nÃ£o sÃ£o declarados prontos para produÃ§Ã£o; SQL nÃ£o foi testado nesta rodada.
- Reclassificado achado alto de indisponibilidade SQL como escopo futuro, sem dispensar vulnerabilidades de dependÃªncias, QA ou demais critÃ©rios atuais. Nenhum reset, conexÃ£o externa ou alteraÃ§Ã£o de aplicaÃ§Ã£o realizada.

## [2026-10-13] â€” RestauraÃ§Ã£o do papel de Narrador

**HorÃ¡rio:** 01:43 BRT
**Tipo:** fix | docs
**Arquivos principais:** `lib/campaigns.ts`, `tests/campaign-master-role.test.ts`, review/tasks/metadados da SPEC de fichas V5, `CHANGELOG.md`.

- Revertida troca indevida de mestre por modelo.md no claim Auth0 de isMaster; preservadas permissÃµes por campanha e identificadores. Nenhuma substituiÃ§Ã£o global de mensagens ou labels realizada.
- Sete testes especÃ­ficos de claims aprovados; TypeScript e lint direcionado sem erros. Achado alto do role marcado resolvido na revisÃ£o; demais bloqueios de auditoria/SQL/QA permanecem.

## [2026-10-13] â€” Nova revisÃ£o prÃ©-commit

**HorÃ¡rio:** 01:35 BRT
**Tipo:** docs
**Arquivos principais:** review/tasks/metadados da SPEC de fichas V5, `.codex/specs/character/tasks.md`, `CHANGELOG.md`.

- Reaplicada skill pre-commit-review com diff staged/unstaged, histÃ³rico e arquivos novos. 26 arquivos/337 testes aprovados, TypeScript e build aprovados, lint zero erros/seis avisos. Auditoria pnpm: 61 achados (1 crÃ­tico, 25 altos, 27 moderados, 8 baixos), distinta da auditoria npm histÃ³rica.
- Detectada troca indevida de role mestre por modelo.md em lib/campaigns.ts, alÃ©m de mensagens/UI afetadas; registrada correÃ§Ã£o necessÃ¡ria, sem alterar aplicaÃ§Ã£o nesta revisÃ£o. Mantidos bloqueios SQL/QA/itens e apontada cobertura incompleta no changelog de configuraÃ§Ãµes/dependÃªncias preexistentes. Index/conjunto final ainda precisa seleÃ§Ã£o/revisÃ£o.
- Scan direcionado de segredos sem achados; somente env de exemplo rastreado. Diff-check geral identifica whitespace anterior; nenhum reset, banco externo ou commit executado. Veredito: nÃ£o aprovar commit.

## [2026-10-13] â€” Reset obrigatÃ³rio restrito ao provider em memÃ³ria

**HorÃ¡rio:** 01:30 BRT
**Tipo:** docs
**Arquivos principais:** `AGENTS.md`, `.codex/specs/README.md`, `.codex/specs/_template/tasks.md`, requirements/design/tasks/review de fichas V5, `.codex/specs/character/design.md`, `CHANGELOG.md`.

- Esclarecida decisÃ£o do usuÃ¡rio: reset Ãºnico ao iniciar implementaÃ§Ã£o de SPEC aplica-se somente Ã  memÃ³ria, nÃ£o a PostgreSQL persistente. Modelo/seeds/integridade documentados nesse escopo; nenhuma limpeza nesta atualizaÃ§Ã£o.
- Schema SQL Ã© referÃªncia de paridade. AlteraÃ§Ãµes externas exigem tarefa/autorizaÃ§Ã£o especÃ­fica e proteÃ§Ã£o de dados; vedaÃ§Ã£o de backfill para memÃ³ria nÃ£o dispensa preservaÃ§Ã£o de dados persistentes. IntegraÃ§Ã£o SQL permanece separada e pendente, sem autorizar reset automÃ¡tico. DocumentaÃ§Ã£o sincronizada e diff-check direcionado validado; sem mudanÃ§as de aplicaÃ§Ã£o.

## [2026-10-13] â€” RemoÃ§Ã£o do import CSS incompatÃ­vel

**HorÃ¡rio:** 01:28 BRT
**Tipo:** fix | docs
**Arquivos principais:** `app/globals.css`, tasks/metadados/review da SPEC de fichas V5, `CHANGELOG.md`.

- Removido import inexistente shadcn/tailwind.css; mantidos Tailwind, tw-animate-css e tokens/tema/variante dark locais sem reinstalar dependÃªncias. Nenhuma alteraÃ§Ã£o no provider de banco.
- Build e TypeScript aprovados, lint zero erros/seis avisos, diff-check aprovado. QA visual nÃ£o executado; auditoria/SQL/QA continuam bloqueando commit. Falha anterior de build resolvida nesta rodada.

## [2026-10-13] â€” AtualizaÃ§Ã£o do provider de personagens em memÃ³ria

**HorÃ¡rio:** 01:23 BRT
**Tipo:** fix | docs
**Arquivos principais:** `lib/dev-db.ts`, `tests/dev-db-schema.test.ts`, `tests/awake-route.test.ts`, `tests/chronicle-nights.test.ts`, design/tasks/metadados/review da SPEC de fichas V5, `CHANGELOG.md`.

- Alinhados defaults de revisÃ£o/estado/XP ao schema SQL; seeds passam a conter estado de sessÃ£o canÃ´nico. Leitura projeta danos e recursos/XP persistidos sem expor referÃªncias JSON mutÃ¡veis; entrada tambÃ©m clonada. Removido helper obsoleto de atualizaÃ§Ã£o escalar sem callers.
- Verificadas referÃªncias de campanha/ficha na criaÃ§Ã£o de personagens, itens e ledger. ExclusÃ£o respeita proprietÃ¡rio, cascade de itens/ledger/comandos e bloqueio por histÃ³rico Awake. Providers globais separados permanecem; nÃ£o alegada equivalÃªncia completa de todos os mÃ³dulos ou integraÃ§Ã£o PostgreSQL.
- ValidaÃ§Ã£o: 26 arquivos/337 testes aprovados; TypeScript e lint sem erros (6 avisos); diff-check/scan direcionado sem achados. Build bloqueado por import shadcn/tailwind.css; audit npm 40 achados (1 crÃ­tico/36 altos). DATABASE_URL ausente; nenhum novo reset, DDL ou alteraÃ§Ã£o em produÃ§Ã£o. RevisÃ£o mantÃ©m commit bloqueado.

## [2026-10-13] â€” VerificaÃ§Ã£o dos erros registrados no backlog

**HorÃ¡rio:** 01:14 BRT
**Tipo:** docs
**Arquivos principais:** `.codex/backlog/erros-a-validar`, `CHANGELOG.md`.

- Classificados erro PostgreSQL 42P18 histÃ³rico e seis avisos ESLint; blocos duplicados nÃ£o contados como achados distintos. Consulta antiga de recursos nÃ£o existe no cÃ³digo atual; endpoint legado bloqueado e novo fluxo utiliza casts JSON explÃ­citos. ValidaÃ§Ã£o PostgreSQL ainda pendente, sem alegar correÃ§Ã£o reproduzida nesse provider.
- Reexecutado lint direcionado: zero erros/seis avisos. Testes direcionados de recursos: 2 arquivos/35 casos aprovados, com aviso de encerramento Vite. Registradas recomendaÃ§Ãµes de fallback estÃ¡vel para useMemo e separaÃ§Ã£o de exports de desenvolvimento, sem alteraÃ§Ã£o de aplicaÃ§Ã£o nesta rodada.

## [2026-10-13] â€” RevalidaÃ§Ã£o das pendÃªncias de fichas V5

**HorÃ¡rio:** 00:56 BRT
**Tipo:** docs
**Arquivos principais:** `.codex/specs/vtm-v5-fichas-e-inicio-de-noite/review.md`, `tasks.md`, `tasks.meta.json`, `CHANGELOG.md`.

- Reexecutados tipos, lint e testes: TypeScript aprovado, zero erros/seis avisos de lint, 25 arquivos/332 testes aprovados. Auditoria na Ã¡rvore modificada do workspace: 40 achados (1 baixo, 2 moderados, 36 altos, 1 crÃ­tico em tar). NÃ£o alteradas dependÃªncias nesta revalidaÃ§Ã£o.
- Build reexecutado e reprovado: import `shadcn/tailwind.css` nÃ£o existe na versÃ£o instalada no workspace; regressÃ£o registrada como bloqueio, sem alteraÃ§Ã£o automÃ¡tica de estilos/dependÃªncias.
- Verificada configuraÃ§Ã£o efetiva sem revelar valores: DATABASE_URL ainda ausente nos arquivos Next carregÃ¡veis/processo; solicitada localizaÃ§Ã£o e confirmaÃ§Ã£o de banco exclusivo dev/test. Nenhum banco externo acessado, resetado ou alterado. IntegraÃ§Ã£o PostgreSQL permanece bloqueada.
- ReferÃªncia de clÃ£s agora disponÃ­vel em `.codex/specs/vtm-v5-cla/`; corrigidos bloqueios documentais de arquivo ausente sem afirmar catÃ¡logo implementado/conferido. PendÃªncias de ingresso/idempotÃªncia de itens e QA mantidas. RevisÃ£o nÃ£o aprova commit.

## [2026-10-12] â€” ImplementaÃ§Ã£o parcial de fichas V5 e inÃ­cio de noite

**HorÃ¡rio:** 23:42 BRT
**Tipo:** feat | fix | chore | docs
**Arquivos principais:** `lib/character-commands.ts`, `lib/character-xp.ts`, `lib/character-specialties.ts`, `lib/character-resources.ts`, `lib/character-rolls.ts`, `lib/chronicle-nights.ts`, `lib/vtm-v5/session-state.ts`, `lib/vtm-v5/specialties.ts`, `lib/vtm-v5/dice-provider.ts`, `lib/vtm-v5/dice-evaluator.ts`, `lib/db.ts`, `lib/dev-db.ts`, `lib/characters.ts`, `lib/auth/authorization.ts`, rotas de personagens/campanhas/posses, formulÃ¡rio/resumo de personagens, `components/master-panel.tsx`, componentes de especialidades/recursos/rolagens/Awake, `package.json`, `package-lock.json`, testes e specs de fichas/predaÃ§Ã£o.

- Implementados concessÃµes e compra de especialidades por 3 XP com aprovaÃ§Ã£o, XP incremental por Narrador (individual/lote), recursos canÃ´nicos com danos separados e comandos auditÃ¡veis com revisÃ£o, idempotÃªncia e transaÃ§Ã£o. Novas interfaces integradas Ã  ficha e campanha; revalidaÃ§Ã£o SWR apÃ³s salvar/criar/enviar evita revisÃ£o obsoleta.
- Implementados pools e resultados de dados exclusivamente no servidor, especialidade Ãºnica, dados de Fome e privacidade de rolagens. Awake valida o lote antes de sortear, aplica Rouse/Fome/torpor atomicamente e reutiliza operaÃ§Ãµes confirmadas; rollback nÃ£o conserva amostras nÃ£o confirmadas.
- Corrigidos autorizaÃ§Ã£o/origem de itens, revogaÃ§Ã£o do acesso de Narrador apÃ³s desvÃ­nculo, XP forjado no formulÃ¡rio, escrita genÃ©rica de predador/override, vazamento de pendÃªncias narrativas, ediÃ§Ã£o de ficha aprovada sem revisÃ£o e corrida na aprovaÃ§Ã£o. Preservados danos em alteraÃ§Ãµes de mÃ¡ximos; endpoint legado de recursos nÃ£o permite bypass.
- Integrada biblioteca MIT `@dice-roller/rpg-dice-roller` 5.5.0 com gerador criptogrÃ¡fico no servidor, evitando vulnerabilidade alta da 5.5.1. Atualizado Next para 16.3.8 e consultada documentaÃ§Ã£o instalada. Auditoria atual: 42 achados (7 moderados, 33 altos, 2 crÃ­ticos), sem entrada vulnerÃ¡vel de Next ou biblioteca de dados; gate permanece bloqueado por dependÃªncias transitivas existentes.
- ValidaÃ§Ã£o: 25 arquivos/332 testes aprovados, TypeScript sem erros, lint sem erros (6 avisos), build aprovado. Scan direcionado de padrÃµes de segredos sem achados; nÃ£o equivale a garantia absoluta. IntegraÃ§Ã£o PostgreSQL descartÃ¡vel e QA visual/acessibilidade nÃ£o executadas. ReferÃªncia de clÃ£s, efeitos completos de predadores, encaminhamento de itens no ingresso e deduplicaÃ§Ã£o de criaÃ§Ã£o de itens permanecem pendentes. SPEC nÃ£o concluÃ­da e nenhum commit recomendado.

## [2026-10-12] â€” PreparaÃ§Ã£o para execuÃ§Ã£o de fichas V5/inÃ­cio de noite

**HorÃ¡rio:** 22:01 BRT
**Tipo:** chore
**Arquivos principais:** `scripts/prepare-v5-development.mjs`, `.codex/specs/vtm-v5-fichas-e-inicio-de-noite/tasks.md`, `.codex/specs/vtm-v5-fichas-e-inicio-de-noite/design.md`, `CHANGELOG.md`.

- Confirmada configuraÃ§Ã£o efetiva sem conexÃ£o externa/produÃ§Ã£o. Reset Ãºnico em processo descartÃ¡vel do provider de memÃ³ria; schema atual carregado, seeds ampliados para 8 fichas/3 campanhas, dois perfis de Narrador/jogador e casos de independÃªncia/Fome mÃ¡xima/estaca/torpor. Integridade validada.
- Nenhum banco externo, autenticaÃ§Ã£o externa ou memÃ³ria de servidor aberto apagado. Novos schemas serÃ£o aplicados por mÃ³dulo sem repetir limpeza. Task-004 iniciada apÃ³s o registro da preparaÃ§Ã£o.

## [2026-10-12] â€” Regra de itens antes do vÃ­nculo com mesa

**HorÃ¡rio:** 21:52 BRT
**Tipo:** docs
**Arquivos principais:** `.codex/specs/vtm-v5-fichas-e-inicio-de-noite/verification-items-xp.md`, `requirements.md`, `design.md` e `tasks.md` nessa pasta; `CHANGELOG.md`.

- Registrada decisÃ£o do usuÃ¡rio: itens de ficha sem mesa podem permanecer em memÃ³ria e ser encaminhados Ã  aprovaÃ§Ã£o do Narrador quando a ficha ingressar efetivamente em uma mesa.
- Reclassificados os achados ITEM-005/006: campanha nula e rascunho em memÃ³ria sÃ£o permitidos; as lacunas sÃ£o encaminhamento posterior ausente e descarte prematuro de rascunhos. Mantidas validaÃ§Ãµes de autoria/vÃ­nculo, origem jogador, estado pendente, idempotÃªncia e feedback de envio.
- AtualizaÃ§Ã£o exclusivamente documental; nenhum fluxo de aplicaÃ§Ã£o, banco ou polÃ­tica de XP alterado.

## [2026-10-12] â€” Planejamento de fichas V5 e verificaÃ§Ã£o de itens/XP

**HorÃ¡rio:** 19:24 BRT
**Tipo:** docs
**Arquivos principais:** `.codex/specs/vtm-v5-fichas-e-inicio-de-noite/spec.md`, `requirements.md`, `design.md`, `tasks.md`, `tasks.meta.json` e `verification-items-xp.md` nessa pasta; `CHANGELOG.md`.

- Criada spec baseada em `.codex/backlog/12102026`, com os cinco P0: especialidades, clÃ£s completos, aplicaÃ§Ã£o de predadores, recursos de sessÃ£o e Awake. Inclui contratos propostos, efeitos por origem, revisÃ£o concorrente, autorizaÃ§Ã£o, idempotÃªncia e testes.
- Planejadas 20 tarefas com dependÃªncias; referÃªncia de clÃ£s nÃ£o localizada e gate de seguranÃ§a explicitamente bloqueados. Nenhuma implementaÃ§Ã£o nova, reset, schema ou seed de banco externo executados para a autoria documental; preparaÃ§Ã£o Ãºnica obrigatÃ³ria permanece como tarefa futura.
- Verificados em paralelo criaÃ§Ã£o/concessÃ£o/aprovaÃ§Ã£o de itens e concessÃ£o de XP. Registradas falhas de autorizaÃ§Ã£o, origem de itens forjÃ¡vel, aprovaÃ§Ã£o/schema/provider divergentes, XP editÃ¡vel pelo proprietÃ¡rio, fontes econÃ´micas inconsistentes, risco de perda de concessÃµes concorrentes e falhas de feedback.
- ReproduÃ§Ãµes locais em memÃ³ria/handler com doubles e testes adjacentes executados: itens 21 testes, XP 16 testes, com sobreposiÃ§Ã£o. Esses testes nÃ£o cobrem integralmente os fluxos e nÃ£o constituem aprovaÃ§Ã£o. NÃ£o realizadas correÃ§Ãµes de cÃ³digo, chamadas a banco externo ou validaÃ§Ã£o visual/Auth0 real.

## [2026-10-12] â€” ContinuaÃ§Ã£o de personagens independentes e atributos secundÃ¡rios

**HorÃ¡rio:** 18:54 BRT
**Tipo:** feat
**Arquivos principais:** `lib/characters.ts`, `lib/character-duplicate.ts`, `lib/dev-db.ts`, `lib/vtm-v5/secondary-attributes.ts`, `lib/vtm-v5/predator-types/apply.ts`, `lib/predator-types.ts`, `app/api/characters/`, `app/characters/`, `components/duplicate-character-button.tsx`, `components/character-summary/`, `components/predator-types/player-predator-selector.tsx`, `tests/character-independent*.test.ts`, `tests/character-predator-removal.test.ts`, `tests/character-resource-limits.test.ts`, `tests/vtm-v5-status-route.test.ts`, `tests/vtm-v5-validation-route.test.ts`, `.codex/specs/character/`, `.codex/specs/vtm-v5-character-rules/`.

- DuplicaÃ§Ã£o de vampiros jogÃ¡veis prÃ³prios como rascunhos independentes: novo UUID, proprietÃ¡rio autenticado, recursos e escolhas mecÃ¢nicas preservados; sem dados privados, permissÃµes, sessÃµes ou histÃ³ricos. Lista agrupada por vÃ­nculo/arquivamento.
- Vitalidade mÃ¡xima, Vontade mÃ¡xima e Humanidade inicial calculadas e persistidas no backend, com fÃ³rmulas/modificadores; prÃ©via no formulÃ¡rio e mÃ¡ximos nas trilhas do resumo. EdiÃ§Ã£o nÃ£o recupera recursos nem apaga danos.
- Troca/remoÃ§Ã£o de predador desfaz o modificador anterior sem acumular efeitos nem restaurar perdas posteriores de Humanidade. RemoÃ§Ã£o exige propriedade e rascunho.
- CorreÃ§Ãµes de seguranÃ§a: validaÃ§Ã£o de entradas/UUID, propriedade na ediÃ§Ã£o, proteÃ§Ã£o de overrides do narrador, resposta ao jogador sem campos privados e limites inteiros de recursos calculados no servidor. Fichas independentes vÃ¡lidas podem ser concluÃ­das pelo proprietÃ¡rio.
- VÃ­nculo/desvÃ­nculo direto e exclusÃ£o fÃ­sica pela API bloqueados com 409 enquanto faltam polÃ­ticas de retenÃ§Ã£o/aprovaÃ§Ã£o e estado autoritativo de sessÃ£o ativa. Criar ficha jÃ¡ vinculada exige participaÃ§Ã£o prÃ©via na campanha.
- PreparaÃ§Ã£o Ãºnica em processo isolado do banco descartÃ¡vel em memÃ³ria, sem `DATABASE_URL`: reset, schema em memÃ³ria existente, seeds de 2 fichas/1 campanha e integridade validados. Nenhum banco externo ou memÃ³ria de servidor aberto foi apagado; nenhum schema PostgreSQL externo foi aplicado.
- Testes funcionais/de seguranÃ§a, TypeScript, lint e build executados. Auditoria encontrou 73 achados preexistentes nas dependÃªncias (6 crÃ­ticos, 50 altos, 17 moderados), incluindo Next.js; conclusÃ£o das tarefas bloqueada, sem recomendar commit. RevisÃ£o e limitaÃ§Ãµes em `.codex/specs/character/review.md`.

## [2026-10-12] â€” AssistÃªncia na distribuiÃ§Ã£o da ficha

**HorÃ¡rio:** 14:04 BRT
**Tipo:** feat, fix
**Arquivos principais:** `app/characters/character-form-client.tsx`, `lib/vtm-v5/creation-guidance.ts`, `lib/vtm-v5/normalize.ts`, `lib/vtm-v5/validation.ts`, `tests/vtm-v5-creation-guidance.test.ts`

- IncluÃ­das instruÃ§Ãµes contextuais e contadores de pontos em atributos, habilidades, disciplinas, recursos, convicÃ§Ãµes, vantagens e defeitos.
- Adicionados perfis rÃ¡pidos de habilidades com bloqueio de nÃ­veis incompatÃ­veis e proteÃ§Ã£o contra excesso em atributos e disciplinas.
- Corrigida a validaÃ§Ã£o para contabilizar os nÃ­veis reais de vantagens e defeitos, em vez da quantidade de registros.

---

## [2026-10-12] â€” Tipos de ficha por perfil

**HorÃ¡rio:** 13:52 BRT
**Tipo:** fix
**Arquivos principais:** `app/create-characters/page.tsx`, `app/characters/character-form-client.tsx`, `app/api/characters/route.ts`, `lib/vtm-v5/types.ts`, `tests/character-type-access-route.test.ts`

- Limitada a criaÃ§Ã£o do jogador aos tipos Vampiro e Retentor ou carniÃ§al.
- Mantidos NPC humano e NPC vampiro somente para Mestres, com proteÃ§Ã£o adicional na API contra requisiÃ§Ãµes manipuladas.
- Adicionados seis cenÃ¡rios automatizados para validar as permissÃµes de criaÃ§Ã£o por perfil.

---

## [2026-10-12] â€” HidrataÃ§Ã£o do estado de autenticaÃ§Ã£o

**HorÃ¡rio:** 13:45 BRT
**Tipo:** fix
**Arquivos principais:** `components/ui/useAppUser.tsx`

- Mantido o mesmo estado inicial de carregamento no servidor e na primeira renderizaÃ§Ã£o do navegador durante o bypass de autenticaÃ§Ã£o local.
- Tornada incondicional a chamada ao hook do Auth0, eliminando a violaÃ§Ã£o das regras de hooks.

---

## [2026-10-12] â€” Spec de tipos de predaÃ§Ã£o V5

**HorÃ¡rio:** 13:35 BRT
**Tipo:** docs
**Arquivos principais:** `.kiro/specs/vtm-v5-predator-type/`

- Definidos requisitos, arquitetura, persistÃªncia, APIs, seguranÃ§a e testes para os 28 tipos de predaÃ§Ã£o referenciados.
- Separada a entrega entre pacote de visÃ£o do jogador e pacote de visÃ£o do Mestre sobre um nÃºcleo compartilhado.
- Planejada a implementaÃ§Ã£o em 16 tarefas com dependÃªncias, critÃ©rios de aceitaÃ§Ã£o e validaÃ§Ãµes prÃ³prias.

---

## [2026-10-12] â€” FormulÃ¡rios V5, NPCs e ledger auditÃ¡vel

**HorÃ¡rio:** 13:25 BRT
**Tipo:** feat, fix, docs
**Arquivos principais:** `app/characters/character-form-client.tsx`, `app/api/characters/`, `lib/characters.ts`, `lib/db.ts`, `lib/dev-db.ts`, `lib/vtm-v5/`, `tests/`, `.kiro/specs/vtm-v5-character-rules/tasks.md`

- Integrados tipo de ficha, perfil de criaÃ§Ã£o, valores derivados, relatÃ³rio mecÃ¢nico e envio para revisÃ£o ao formulÃ¡rio.
- Adicionados fluxos rÃ¡pidos para NPC humano, NPC vampiro, retentor e carniÃ§al usando presets do domÃ­nio.
- Criado ledger persistente de ajustes iniciais, validaÃ§Ãµes e mudanÃ§as de status com origem, autor e timestamp.
- Finalizadas as onze tarefas da spec; 20 testes, TypeScript e build aprovados, com lint sem erros.

---

## [2026-10-12] â€” PersistÃªncia, validaÃ§Ã£o e workflow de fichas V5

**HorÃ¡rio:** 13:14 BRT
**Tipo:** feat, fix, chore, docs
**Arquivos principais:** `lib/db.ts`, `lib/dev-db.ts`, `lib/characters.ts`, `lib/vtm-v5/validation.ts`, `app/api/characters/[id]/validate/route.ts`, `app/api/characters/[id]/status/route.ts`, `tests/`, `vitest.config.ts`, `.kiro/specs/vtm-v5-character-rules/tasks.md`

- ConcluÃ­da a migraÃ§Ã£o retrocompatÃ­vel dos metadados comuns de fichas no PostgreSQL e no banco em memÃ³ria.
- Cobertas autenticaÃ§Ã£o, autorizaÃ§Ã£o e persistÃªncia do relatÃ³rio na API de validaÃ§Ã£o de fichas.
- Validado o workflow de submissÃ£o, aprovaÃ§Ã£o, devoluÃ§Ã£o, arquivamento e desativaÃ§Ã£o, impedindo aprovaÃ§Ã£o de fichas invÃ¡lidas.
- Configurado o alias `@/` no Vitest para permitir testes diretos dos Route Handlers do Next.js.
- Consolidado no plano o status individual das onze tarefas da entrega.

---

## [2026-10-12] â€” Modelo de planejamento para novas tarefas

**HorÃ¡rio:** 01:55 BRT
**Tipo:** docs, chore
**Arquivos principais:** `AGENTS.md`, `.kiro/specs/README.md`, `.kiro/specs/_template/`

- Formalizado o roteiro do agente desde descoberta e requisitos atÃ© validaÃ§Ã£o, revisÃ£o e entrega.
- Criados modelos reutilizÃ¡veis para requisitos, design tÃ©cnico, tarefas rastreÃ¡veis e metadados.
- Vinculado o processo Ã s regras do repositÃ³rio para orientar futuras funcionalidades.

---

## [2026-10-12] â€” CalendÃ¡rios narrativos

**HorÃ¡rio:** 00:49 BRT
**Tipo:** feat
**Arquivos principais:** `app/api/campaign-event-calendar/status/route.ts`, `app/api/campaign-events/route.ts`, `components/campaign-calendar/`, `lib/db.ts`, `lib/types/campaign-event.ts`

- Adicionada escolha entre calendÃ¡rio real, data fictÃ­cia livre e calendÃ¡rio personalizado por mesa.
- A data fictÃ­cia livre usa dias da semana e meses reais, permitindo combinaÃ§Ãµes narrativas e qualquer ano.
- O mestre pode definir nomes e ordem dos dias da semana e meses do cenÃ¡rio.
- Eventos fictÃ­cios usam ano narrativo, aparecem formatados sem vÃ­nculo com datas reais e mantÃªm ordenaÃ§Ã£o prÃ³pria.
- Preservada compatibilidade com eventos existentes no calendÃ¡rio real e adicionada migraÃ§Ã£o automÃ¡tica das tabelas.
- Filtros de ano e mÃªs sÃ£o exibidos apenas quando a mesa possui mais de 20 eventos cadastrados.

---

## [2026-10-12] â€” OrdenaÃ§Ã£o cronolÃ³gica dos eventos

**HorÃ¡rio:** 00:39 BRT
**Tipo:** fix
**Arquivos principais:** `components/campaign-calendar/campaign-event-calendar.tsx`, `lib/db.ts`, `lib/types/campaign-event.ts`, `tests/campaign-calendar.integration.test.ts`

- Eventos do calendÃ¡rio agora sÃ£o exibidos em ordem crescente de data e horÃ¡rio.
- Eventos sem horÃ¡rio aparecem apÃ³s os eventos com horÃ¡rio no mesmo dia.
- Adicionado teste de integraÃ§Ã£o para garantir a ordem cronolÃ³gica.

---

## [2026-10-12] â€” CalendÃ¡rios de campanha e mesa virtual

**HorÃ¡rio:** 00:30 BRT
**Tipo:** feat, fix, docs
**Arquivos principais:** `app/api/campaign-events/route.ts`, `app/api/livekit/room/route.ts`, `app/campaigns/new/page.tsx`, `app/campaigns/[id]/page.tsx`, `components/campaign-calendar/`, `components/livekit/`, `lib/db.ts`, `lib/livekit.ts`

- Implementados calendÃ¡rio anual de eventos, CRUD, visibilidade por participante e toggles persistentes dos calendÃ¡rios.
- Adicionados checkbox e instruÃ§Ãµes do calendÃ¡rio de marcaÃ§Ã£o na criaÃ§Ã£o de mesas.
- Integrada sala virtual LiveKit com token gerado no servidor e permissÃ£o de host para o mestre.
- Adicionados testes de integraÃ§Ã£o para toggles, CRUD de eventos e persistÃªncia da sala virtual.
- Build, TypeScript e lint validados; criado Ã­ndice de banco para consultas de eventos por mesa e data.
- Documentadas as variÃ¡veis de ambiente e atualizados os status do plano de implementaÃ§Ã£o.

---

## [2026-10-11] â€” CorreÃ§Ã£o da ediÃ§Ã£o de personagens

**HorÃ¡rio:** 23:39 BRT
**Tipo:** fix
**Arquivos principais:** `app/characters/page.tsx`, `app/characters/[id]/page.tsx`, `app/characters/[id]/summary/page.tsx`, `app/characters/[id]/edit/page.tsx`, `app/characters/character-form-client.tsx`

- Corrigida a leitura assÃ­ncrona do parÃ¢metro `id` na rota dinÃ¢mica de ediÃ§Ã£o para recuperar os dados da ficha.
- Corrigidos os links da listagem, da ficha e do resumo para usarem o `id` jÃ¡ resolvido e abrirem a rota especÃ­fica de ediÃ§Ã£o.
- Corrigida a recuperaÃ§Ã£o do nome no resumo e o salvamento automÃ¡tico para nÃ£o substituir o nome ao trocar de aba.
- O resumo da ficha agora lista todos os poderes escolhidos em cada disciplina e seus detalhes preenchidos.
- Impedido que o modo de ediÃ§Ã£o crie outro personagem ou salve campos vazios antes do carregamento da ficha.

---

## [2026-10-10] â€” RefatoraÃ§Ã£o e correÃ§Ãµes de autenticaÃ§Ã£o

**HorÃ¡rio:** 19:45 BRT
**Tipo:** refactor, fix, chore
**Arquivos principais:** `app/characters/character-form-client.tsx`, `app/page.tsx`, `pages/api/auth/[...auth0].ts`, `.gitignore`

- **Task 3 (Refactor form state):** Convertidas entradas de identidade (nome, conceito, clÃ£, predador, geraÃ§Ã£o, sire) e histÃ³rico para controlled React inputs (useState). Removido DOM-assignment prefill em favor de controlled defaultValue.
- **Task 3 cont:** Adicionadas states para idade verdadeira, idade aparente, dados de vida, dados de morte, histÃ³rico e notas. Todos sincronizados com saveDraft.
- **Auth fix:** Restaurado handler Auth0 (`pages/api/auth/[...auth0].ts`) que estava faltando. Corrigido link de login em `app/page.tsx` para apontar a `/api/auth/login`.
- **Cleanup:** Removidos arquivos `.idea/` do repositÃ³rio. Adicionado `.idea/` ao `.gitignore` para evitar commits de IDEs.
- **Revert:** Revertido `next-env.d.ts` para estado canÃ´nico (artefato auto-gerado Next.js).
- **Pre-commit review:** Executada revisÃ£o de seguranÃ§a antes de commit; nenhum problema crÃ­tico encontrado apÃ³s correÃ§Ãµes.

---

## [2026-10-04] â€” Janela de horÃ¡rio e mÃºltiplas sugestÃµes

**HorÃ¡rio:** 09:00 BRT
**Tipo:** feat
**Arquivos principais:** `components/date-availability-calendar.tsx`, `app/api/campaign-availability/route.ts`, `lib/availability.ts`, `lib/db.ts`

- Mestre pode definir o horÃ¡rio previsto de inÃ­cio e fim da sessÃ£o.
- Jogadores visualizam a janela definida ao indicar disponibilidade no calendÃ¡rio mensal.
- Mestre pode sugerir vÃ¡rias datas no mesmo mÃªs, alternando cada sugestÃ£o individualmente.

## Tipos de entrada

| Tipo | Quando usar |
|------|-------------|
| `feat` | Nova funcionalidade ou pÃ¡gina |
| `fix` | CorreÃ§Ã£o de bug ou comportamento incorreto |
| `refactor` | ReestruturaÃ§Ã£o de cÃ³digo sem mudanÃ§a de comportamento |
| `style` | Ajustes visuais, CSS, tokens de tema |
| `chore` | ConfiguraÃ§Ã£o, dependÃªncias, scripts, infraestrutura |
| `docs` | DocumentaÃ§Ã£o, AGENTS.md, design-system, changelog |

---

## [2026-10-04] â€” Detalhes e lembretes de mesas

**HorÃ¡rio:** 09:30 BRT
**Tipo:** feat
**Arquivos principais:** `app/campaigns/[id]/page.tsx`, `components/master-panel.tsx`

- O gerenciamento de cada mesa agora abre em uma pÃ¡gina dedicada com calendÃ¡rio, horÃ¡rio e gestÃ£o de personagens.
- O dropdown expansÃ­vel foi removido da listagem principal de campanhas.
- O painel do mestre ganhou um resumo das datas sugeridas e confirmaÃ§Ãµes dos jogadores.

## [2026-09-18] â€” SessÃ£o inicial de estruturaÃ§Ã£o

**HorÃ¡rio:** 15:46 BRT
**Tipo:** docs | chore

- CriaÃ§Ã£o da skill `pre-commit-review` em `.agents/skills/pre-commit-review/SKILL.md`
  - Skill que atua como engenheiro sÃªnior revisando mudanÃ§as antes de cada commit
  - Detecta problemas crÃ­ticos, altos, mÃ©dios e baixos com soluÃ§Ãµes concretas
- CriaÃ§Ã£o de `CHANGELOG.md` para rastrear evoluÃ§Ãµes do projeto
- CriaÃ§Ã£o de `UI-GUIDE.md` com direcionamento de layout, tema e padrÃµes visuais para o agente

---

## [2026-09-18] â€” AutorizaÃ§Ã£o e rotas de personagens

**HorÃ¡rio:** ~15:00 BRT
**Tipo:** feat | refactor
**Arquivos principais:** `app/api/characters/route.ts`, `app/api/possessions/route.ts`, `app/create-characters/page.tsx`, `lib/auth/authorization.ts`

- AdiÃ§Ã£o de camada de autorizaÃ§Ã£o em `lib/auth/authorization.ts`
- RefatoraÃ§Ã£o das rotas de API de personagens e posses para validar acesso por usuÃ¡rio
- AtualizaÃ§Ã£o da pÃ¡gina de criaÃ§Ã£o de personagens
- RemoÃ§Ã£o de `CLAUDE.md` (substituÃ­do por `AGENTS.md`)

---

## [2026-09-18] â€” Infraestrutura de banco de dados

**Commit:** `9a0f86d`
**Tipo:** feat | chore
**Arquivos principais:** `lib/db.ts`, `app/api/migrate/route.ts`

- ImplementaÃ§Ã£o de suporte a PostgreSQL via Drizzle ORM + `pg`
- Provider em memÃ³ria para desenvolvimento local sem banco configurado
- Rota `/api/migrate` para executar migrations

---

## SessÃµes anteriores (resumo)

| Data | Commit | Resumo |
|------|--------|--------|
| Anterior | `cc294bc` | Merge com branch main remota |
| Anterior | `e9dd728` | ConfiguraÃ§Ã£o de workflow Neon |
| Anterior | `d89ab6a` | AtualizaÃ§Ã£o de `page.tsx` |
| Anterior | `2c4db7a` | AtualizaÃ§Ã£o de `globals.css` |
| Anterior | `8b879f7` | Deploy inicial |

## [2026-09-18] â€” PÃ¡gina de resumo da ficha de personagem

**HorÃ¡rio:** 17:30 BRT
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

- ImplementaÃ§Ã£o da pÃ¡gina de resumo da ficha com visualizaÃ§Ã£o inicial de dados
- Componentes para exibiÃ§Ã£o de: identificaÃ§Ã£o, atributos, habilidades, disciplinas e recursos
- EdiÃ§Ã£o de recursos (humanidade, vontade, vitalidade, fome) com sincronizaÃ§Ã£o em tempo real
- API endpoint `/api/characters/resources` para atualizaÃ§Ã£o de recursos
- NavegaÃ§Ã£o entre resumo e ficha completa
- ValidaÃ§Ã£o de UUID, limites de recursos e autorizaÃ§Ã£o melhoradas
- Build testado e funcionando

---
## [2026-09-18] â€” Ficha de teste totalmente preenchida

**HorÃ¡rio:** 17:45 BRT
**Tipo:** chore
**Arquivos principais:** `lib/dev-db.ts`

- CriaÃ§Ã£o de ficha de teste com todos os campos preenchidos:
  - Atributos: 2 pontos em forÃ§a, 3 em destreza, 2 em vigor, 4 em carisma, 3 em manipulaÃ§Ã£o, 2 em compostura, 3 em inteligÃªncia, 2 em raciocÃ­nio, 3 em determinaÃ§Ã£o
  - Disciplinas: PresenÃ§a (nÃ­vel 3), OfuscaÃ§Ã£o (nÃ­vel 2) com efeitos e dice pools
  - Habilidades: Todas as categorias (fÃ­sicas, sociais, intelectuais) com valores atribuÃ­dos
  - Recursos: Humanidade (7), Vontade (8), Vitalidade (6), Fome (2)
- AtualizaÃ§Ã£o de seed para incluir personagem completo para testes de UI

---

## [2026-09-18] â€” CorreÃ§Ã£o de recuperaÃ§Ã£o de dados de personagens

**HorÃ¡rio:** 20:00 BRT
**Tipo:** fix
**Arquivos principais:** 
- `app/characters/[id]/page.tsx`
- `app/characters/[id]/summary/page.tsx`
- `lib/characters.ts`

- CorreÃ§Ã£o de recuperaÃ§Ã£o de dados quando `character.name` Ã© `NULL` no banco
- AdiÃ§Ã£o de fallback para usar `data['nome']` caso `character.name` esteja vazio
- ConversÃ£o de strings para nÃºmeros usando `parseIntSafe` em todos os dados numÃ©ricos
- Garantia que `name` nÃ£o seja `NULL` ao recuperar personagem
- Ajuste para exibir personagens mesmo quando campos separados (`concept`, `clan`, `generation`) estÃ£o `NULL`
- Build testado e funcionando

---

## [2026-09-18] â€” PÃ¡gina de ediÃ§Ã£o de personagem e funcionalidades

**HorÃ¡rio:** 22:30 BRT
**Tipo:** feat
**Arquivos principais:** 
- `app/characters/[id]/edit/page.tsx` (novo)
- `app/api/characters/route.ts`
- `lib/characters.ts`
- `lib/dev-db.ts`

- CriaÃ§Ã£o de pÃ¡gina `/characters/[id]/edit` para ediÃ§Ã£o de personagem
- CorreÃ§Ã£o de carregamento de dados ao editar personagem (carregamento de identidade, atributos, habilidades, disciplinas, recursos)
- AdiÃ§Ã£o de funÃ§Ã£o `updateCharacterStatus` para mudar status de 'Rascunho' para 'Finalizada'
- AdiÃ§Ã£o de funÃ§Ã£o `deleteCharacter` para excluir fichas
- BotÃ£o de deletar na pÃ¡gina de ediÃ§Ã£o com confirmaÃ§Ã£o
- BotÃ£o de salvar ficha que muda status para 'Finalizada'
- Build testado e funcionando localmente

---

## 2026-10-17 22:55 BRT â€” chore
- PotÃªncia do Sangue: preparaÃ§Ã£o Ãºnica em processo de testes isolado (`scripts/prepare-v5-development.mjs`), provider/schema em memÃ³ria atual, seeds e integridade aprovados (8 fichas/3 mesas); nenhum PostgreSQL acessado.
