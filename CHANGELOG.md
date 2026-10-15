# CHANGELOG — Ledger Command

Registro cronológico de todas as alterações relevantes implementadas no projeto.

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
