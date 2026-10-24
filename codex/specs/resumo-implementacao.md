# Resumo de implementação e pendências

Revisado em 24/10/2026, BRT. Escopo: conferir as pendências deste documento contra código, testes e specs atuais, sem implementar funcionalidades novas. O registro original de 13/10 foi preservado ao final.

## Pendências superadas ou parcialmente superadas

| Afirmação antiga | Evidência atual | Situação validada |
|---|---|---|
| Não há vínculo posterior de ficha existente | [API de vínculo](../../app/api/characters/[id]/campaign/route.ts), [testes](../../tests/character-campaign-link.test.ts) | Implementado pelo ID da mesa, com consentimento, revisão, idempotência e retorno a DRAFT. Aprovação da ficha continua separada. Não entrega desvínculo nem encaminhamento de itens. |
| Exclusão de personagem não existe | [Comando](../../lib/characters.ts), [testes](../../tests/character-deletion.test.ts) | Exclusão lógica pelo proprietário implementada; preserva histórico e bloqueia sessão/convocação ativa. Não equivale a exclusão física ou restauração. |
| Falta entidade autoritativa de sessão | [Domínio](../../lib/game-sessions.ts), [workspace](../../components/game-session/session-workspace.tsx), [revisão atual](../../.codex/specs/modo-sessao/review.md) | Sessões PostgreSQL, start/close idempotentes e polling autenticado implementados. Conclusão formal ainda bloqueada pela suíte global. |
| Rerrolagem de Vontade está por implementar | [Histórico e rerrolagem](../../lib/character-roll-history.ts), [testes](../../tests/v5-spec-dice.test.ts) | Há rerrolagem única de até três dados comuns, custo de Vontade, revisão/idempotência e projeção privada. Testes legados dessa integração ainda precisam ser migrados para SQL. |
| Progressão só compra especialidades | [Disciplinas](../../lib/character-disciplines.ts), [acesso](../../lib/vtm-v5/discipline-access.ts) | Compra de níveis de Disciplinas com XP e autorização de aprendizado também existe. Não comprova compras de atributos, habilidades e vantagens. |
| Catálogo possui apenas sete clãs e 28 predações | [Clãs](../../lib/vtm-v5/clans.ts), [teste do catálogo de predação](../../tests/predator-types-core.test.ts) | São 16 entradas de clã/perfil (14 clãs, Caitiff e sangue-ralo) e 40 tipos de predação mais uma variante. Alguns registros são alternativos, comunitários ou têm confirmação bloqueada. |
| Humanidade e manchas são exclusivas do Narrador | [API de recursos](../../app/api/characters/[id]/resources/route.ts), [testes da interface](../../tests/session-resources-ui.test.ts) | Proprietário e Narrador podem alterar ambos; dados privados de torpor continuam filtrados no backend. |
| PostgreSQL é apenas backlog e runtime usa memória | [DB](../../lib/db.ts), [comandos](../../lib/character-commands.ts), [configuração de testes](../../vitest.config.ts) | Persistência SQL e testes locais isolados existem. Busca em app/lib/components não encontrou importações de dev-db nem uso dos stores globais legados fora do próprio provider. O arquivo legado ainda existe e muitos testes ainda o usam. Não há comprovação de implantação em produção. |
| Game upgrade não possui requirements/design/tasks | [Requisitos](game-upgrade/requirements.md), [design](game-upgrade/design.md), [tasks](game-upgrade/tasks.md) | Os três documentos existem. A spec normativa externa citada por eles continua ausente do workspace. |
| Condições de clã e NPCs são apenas proposta | [Mecânicas de clã](../../lib/vtm-v5/clan-mechanics.ts), [NPCs](../../lib/npc-store.ts), [integração](../../tests/npc-narrative-integration.test.ts) | Há condições confirmadas pelo Narrador integradas às rolagens, NPCs/templates/conversões/instâncias e campos de carniçal/domitor. Isso não entrega automação narrativa completa nem Blood Bond temporal. |

## O que continua pendente

| Prioridade | Pendência real | Limite/evidência |
|---|---|---|
| 1 | Recuperar o gate global de testes e reconciliar checklists | Última suíte global desta sessão: 264 falhas/936 aprovados em 1.200 testes, 30 arquivos com falhas. Há fixtures em memória e mocks de db nulo; não atribuir todas as falhas à mesma causa sem análise individual. [Registro da sessão](../../.codex/specs/modo-sessao/tasks.md). |
| 1 | Validar serviços e operação de produção | Auth0/LiveKit/Vercel/Blob reais, reconexão e revogação efetiva de participantes pelo provider não foram comprovados. Desmontar a sala no cliente não comprova revogação de tokens externos. Migração, backup e rollback estão previstos no [README](../../README.md), sem execução em produção. |
| 2 | Encaminhar pertences no vínculo e deduplicar criação | O vínculo muda a ficha, mas não encaminha pertences. [POST de pertences](../../app/api/possessions/route.ts) e [INSERT](../../lib/possessions.ts) não têm chave de idempotência. Não confirmar conclusão do ciclo rascunho → vínculo → aprovação/retry. |
| 2 | Desvincular ficha preservando seu histórico | Não foi encontrado fluxo dedicado de desvínculo. PUT geral continua recusando mudança direta de campanha com 409. Desvinculação decorrente de exclusão lógica não substitui esse fluxo. |
| 2 | Testes resistidos/prolongados e combate completo | Há avaliador/comparador e trilhas de dano; faltam fluxo completo, combate físico/social, conversão/aplicação automática de dano, cura e impairment. [Game upgrade](game-upgrade/tasks.md). |
| 2 | Progressão econômica restante | Atributos, habilidades e vantagens por XP, projetos/propostas e políticas completas de aprendizado/concessão não estão comprovados como entrega integral. Especialidades e níveis de Disciplinas já têm comandos próprios. [Plano ampliado](../../.codex/specs/regras-dados-xp-npcs-carnicais-v5/tasks.md). |
| 3 | Poderes/Alquimia e efeitos contextuais completos | Catálogo, seleção e acesso a poderes existem; execução mecânica completa e transições avançadas não estão entregues. Há modificadores de clã confirmados; alimentação, sol, repouso e outras consequências continuam dependentes da condução narrativa. |
| 3 | Blood Bond e carniçais completos | Domitor, força do laço, modelos e conversões parciais existem; isso não comprova vitae, vínculos/poderes e evolução temporal completos. [NPCs](../../.codex/specs/criacao-gerenciamento-npcs/tasks.md). |
| 3 | Fechar requisitos narrativos e de predação | Relações, relatórios/histórico refinados, cobertura integral dos RF de NPCs e conferência independente das fontes continuam exigindo validação. Replay genérico por ator/hash já existe no comando compartilhado; não tratá-lo como inteiramente ausente. |
| Posterior | QA visual, acessibilidade e responsividade | Conferir navegador, teclado/foco e larguras 390/768/1440. É pendência desejável, sem substituir os gates obrigatórios de segurança/testes. [Backlog](../../.codex/backlog/qa-visual-responsividade.md). |

## Evidências e limites desta revisão

- Revisão estática dos caminhos acima, inventário de APIs, specs locais e changelog. Código da aplicação e banco de produção não foram alterados nesta revisão.
- Testes selecionados executados nesta revisão: **148 aprovados/35 falhas (183 testes em nove arquivos; seis arquivos aprovados/três com falhas)**. Vínculo, exclusão lógica, catálogos de clãs/predação, domínio de NPCs e integração narrativa passaram. Falharam `v5-spec-dice.test.ts` (21), `discipline-access.test.ts` (12) e `possessions-routes.test.ts` (2), com fixtures legadas de memória/provider SQL indisponível. A presença de código de rerrolagem/compra não equivale à aprovação desses testes de integração.
- Comando: `pnpm exec vitest run tests/character-campaign-link.test.ts tests/character-deletion.test.ts tests/v5-spec-dice.test.ts tests/discipline-access.test.ts tests/clan-rules-catalog.test.ts tests/predator-types-core.test.ts tests/npc-domain-v2.test.ts tests/possessions-routes.test.ts tests/npc-narrative-integration.test.ts`. Exit 1; [log local](../../tmp/resumo-implementacao-validacao.log). Preparação/fixtures apenas no PostgreSQL local autorizado, schema `meus_vampiros_test`; sem limpeza ou produção.
- Evidência anterior da mesma sessão para modo sessão: 97 testes focados/11 arquivos aprovados e revalidação final de UI/storage com 11 testes/3 arquivos; tipos, build, lint (zero erros/cinco avisos) e audit completo (zero vulnerabilidades) aprovados. São evidências da execução anterior, não verificações repetidas nesta atualização documental.
- A suíte global permanece bloqueante. Não promover automaticamente tasks a completed por existência de código, catálogo ou teste adjacente.
- Não executar os resets de memória/seeds sugeridos no histórico: a aplicação atual usa PostgreSQL, e qualquer migração/seed/limpeza exige destino e autorização próprios.

## Documentação que ainda exige reconciliação

1. O [índice](README.md), [entregas](entregas-concluidas.md) e vários tasks antigos ainda descrevem entregas em memória e pendências já implementadas. Este relatório não atualiza nem aprova todas as specs do projeto.
2. Referências antigas a `campaign-calendar-and-livekit/tasks.md` e `character/tasks.md` não existem no caminho atual. Evidências devem apontar para código/testes ou documentação realmente presente.
3. Bloqueios antigos de tipos/lint/audit não podem ser generalizados: esses gates passaram na execução recente, mas os testes globais continuam falhando.
4. `lib/dev-db.ts` e fixtures legadas precisam de remoção/migração coordenada. A existência desse arquivo, isoladamente, não prova fallback de runtime ativo.

<details>
<summary>Registro histórico de 13/10/2026 — não usar como estado atual</summary>

Atualizado originalmente em 13/10/2026, 13:38 BRT; organizado em 15/10 sem reexecutar validações. Afirmações e contagens abaixo são históricas e podem ter sido superadas pela revisão acima.

**Entrega de clãs/predação:** catálogo versionado de sete clãs/Caitiff/sangue-fraco, comandos autorizados, formulário/resumo, origens e concessões dos 28 predadores implementados. Escolhas/distribuições, disciplina extra, especialidade pendente, traços e reversão segura integrados; cópia independente preserva origens públicas sem aprovação/dados privados. 468 testes/34 arquivos, tipos/build aprovados, lint zero erros/4 avisos, audit zero. Catálogo de clãs (task-008) concluído; 009–011 em andamento por poderes/regras contextuais, configuração avançada e histórico/refinamentos. O inventário histórico abaixo de 12:35 descreve a situação anterior a esta entrega nesses módulos; consultar tasks/review/readiness atualizados.

## Escopo e interpretação

Consolidação dos sete diretórios de funcionalidades em `codex/specs/`, além de README e template. Foram confrontados requisitos/design/tasks/reviews/metadados com os módulos, rotas e componentes correspondentes. **Implementado não significa SPEC integralmente concluída.** Há checklists antigos que não incorporam as últimas correções ou decisões; os números abaixo são registros documentais, não percentuais de funcionamento.

Dev atual opera em memória. PostgreSQL operacional está no backlog; QA manual visual/acessibilidade/responsividade é desejável e posterior, não gate obrigatório do commit atual. Nenhum teste de aplicação, banco externo ou reset foi executado para elaborar este resumo.

## Panorama por SPEC

| SPEC | Estado funcional | Implementado | Pendência principal |
|---|---|---|---|
| [Calendários e LiveKit](campaign-calendar-and-livekit/tasks.md) | Implementação ampla; validação externa parcial | CRUD de eventos, visibilidade, calendários habilitáveis, modos narrativos e integração de sala/token LiveKit | Fluxo completo com sessão Auth0 e conexão LiveKit reais |
| [Regras de criação V5](vtm-v5-character-rules/tasks.md) | Base implementada | Tipos/presets, validação, distribuição de pontos, workflow de aprovação, NPCs/retentores e atributos secundários | Consolidar evidências/status e completar regras especializadas não cobertas pelo motor base |
| [Personagens independentes](character/tasks.md) | Parcial | Criar/editar sem mesa, duplicação segura, projeção privada e preservação de recursos | Vínculo posterior, desvínculo, exclusão e modelo autoritativo de sessão ativa |
| [Tipos de predação](vtm-v5-predator-type/readiness.md) | Núcleo mecânico integrado; SPEC parcial | 28 tipos, disciplina/especialidade/traços por origem, alternativas/distribuições, reversão e restrições | Poderes/regras contextuais, relações/histórico refinados e conferência independente de fontes |
| [Fichas V5 e início de noite](vtm-v5-fichas-e-inicio-de-noite/review.md) | Vários módulos implementados; pacote incompleto | Especialidades, XP, recursos, rolagens, Awake, clãs e núcleo de predação | Poderes/contexto narrativo, configuração/histórico refinados e ingresso/idempotência de itens |
| [Clãs V5](vtm-v5-cla/spec-implementacao-clas-vtm-v5.md) | Catálogo concluído; integração parcial | Sete clãs/Caitiff/sangue-fraco, seleção 2+1, origens, restrições, APIs e formulário/resumo | Poderes/Alquimia, automação contextual, clãs adicionais e configuração avançada |
| [Evolução das regras de jogo](game-upgrade/spec.md) | Infraestrutura inicial reaproveitada; evolução pendente | D10 no servidor, dados de Fome, avaliação V5, especialidade +1, Rouse no Awake e auditoria | Reroll de Vontade, testes resistidos/prolongados, combate, cura/impairment e Blood Bond automatizado |

## 1. Calendários e LiveKit

**Implementado:** cadastro/edição/exclusão/listagem de eventos, filtro por ano, visibilidade Narrador/participantes, toggles de calendário de eventos e de marcação, disponibilidade e horários; calendário real, data fictícia livre e calendário com dias/meses personalizados. Componentes de lista, formulário, badges, configuração e sala integrados à campanha. Tokens LiveKit emitidos no servidor com permissões de sala/host.

**Pendente:** comprovar fluxo autenticado e conexão LiveKit reais, tratamento operacional de credenciais/conexão e regressão de papéis no ambiente publicado. O checklist registra **31 completed e 1 in_progress**; task-014 explicita Auth0/LiveKit externos pendentes. Marcações históricas de migration/QA não são evidência de nova integração PostgreSQL ou nova sessão de QA.

## 2. Regras de criação V5

**Implementado:** contratos/enums/presets e normalização; validações de atributos, habilidades, disciplinas, convicções, vantagens/falhas, idade, geração/Potência e regras básicas de predador. Tipos de ficha por perfil, criação assistida por orçamento, submissão/aprovação/devolução/arquivamento/desativação. Presets e validação básica de NPC humano/vampiro e retentor/carniçal, controle/domitor e parâmetros de Blood Bond.

Atributos secundários calculados no servidor: Vitalidade máxima por Vigor, Vontade máxima por Determinação/Compostura e Humanidade inicial por idade/predador. Edição preserva danos e recursos usados. Ledger registra operações relevantes.

**Pendente:** poderes especializados, regras contextuais e regras temporais de Blood Bond; catálogos de clãs e concessões de predação foram integrados nesta entrega. Checklist registra **14 completed e 1 blocked**, mas o bloqueio antigo de auditoria/QA de task-015 está desatualizado: correção funcional existe, auditoria recente zerou e QA foi tornado desejável.

## 3. Personagens independentes

**Implementado:** criação e edição sem campanha; duplicação com novo UUID, estado de rascunho e sem vínculo. Copia somente campos permitidos, exclui notas/overrides/histórico privados da campanha e preserva recursos/danos. Lista/resumo e permissões por proprietário/Narrador foram integrados. Criar já vinculado exige participação autorizada existente na mesa.

**Pendente:** fluxo de ingresso posterior com aprovação, desvínculo e exclusão autorizada. APIs bloqueiam operações diretas não definidas com 409. Falta política/modelo de sessão ativa; existência de sala LiveKit não equivale a sessão em andamento. Aprovação de especialidades de ficha independente ainda não tem Narrador disponível.

Checklist registra **1 completed e 4 blocked**; vários bloqueios antigos de auditoria foram superados, mas isso não entrega vínculo/desvínculo/exclusão nem encerra automaticamente a SPEC.

## 4. Tipos de predação

**Implementado:** 10 tipos básicos e 18 expandidos da referência local, fontes opcionais e DTOs separados. Disciplina extra, especialidade pendente, vantagens/defeitos fixos e escolhas/distribuições por origem; aplicação/reaplicação/remoção testadas para os 28 tipos. Restrições Bagger/Farmer, Tremere/Siren e exceção explícita de sangue-fraco. Humanidade/Potência, configuração por mesa, overrides conhecidos e auditoria; estado canônico de Humanidade preservado.

Segurança atual: configuração estrita e isolada em memória; autorização/status/revisão atuais no comando; seleção/remoção/override e ledger atômicos; campos permitidos projetados sem alterar XP/dados alheios. Política da mesa reverificada no momento de gravar em memória. Configuração/override invalida aprovação das fichas afetadas. Regras arbitrárias/overrides ativos duplicados são rejeitados. Backfill automático de predadores foi removido.

**Pendente:** poderes/regras contextuais, relações narrativas e relatório/histórico refinados, replay exato de requisições e confirmação independente de fontes oficiais. Concessões foram confrontadas com a referência local, não com livros oficiais; isso não encerra a SPEC inteira.

Checklist original permanece **1 in_progress e 15 pending**, embora vários desses componentes já existam. O `readiness.md` e as atualizações recentes da revisão descrevem o estado real melhor que esse checklist. A tarefa antiga de backfill não deve ser retomada automaticamente para memória.

## 5. Fichas V5 e início de noite

**Especialidades:** concessões por primeiro ponto, criação e predação; compra por 3 XP, aprovação/rejeição do Narrador, reserva/reembolso e proteção contra duplicidade. Validador de habilidades centraliza IDs/rótulos/aliases e pontos 0–5. Seletor acompanha edição, considera limites/concessões e relê habilidades salvas antes do comando; habilidades inválidas não debitam XP. Aplicação de especialidade na rolagem permanece condicionada à autorização narrativa implementada.

**XP:** concessão incremental pelo Narrador, individual ou em lote, motivo/autoria, saldo canônico, revisão e idempotência; jogador não edita totais econômicos no formulário. Lote pode devolver resultados individuais/parciais, não equivale a transação única de todo o lote.

**Recursos:** estado canônico de Fome, Humanidade, danos superficiais/agravados de Vitalidade/Vontade, manchas e condições. Comandos auditáveis/revisionados; Humanidade/manchas restritas ao Narrador. API escalar antiga bloqueada. Não há motor completo de conversão de dano, cura e impairment.

**Rolagens/Awake:** pool autoritativo atributo+habilidade, até +1 especialidade, dados de Fome, resultado no servidor e proteção de rolagem secreta. Nova noite por Narrador com seleção validada, Rouse, Fome máxima 5 e torpor; preserva estaca/torpor e não selecionados. Lote de Awake atômico, resultados confirmados reutilizados; rollback descarta amostras não confirmadas, que podem ser sorteadas novamente em nova tentativa.

**Itens:** corrigidas autorização/origem, acesso após desvínculo, feedback e preservação de rascunhos temporários sem mesa. Ainda falta encaminhá-los à aprovação no ingresso efetivo e deduplicar criação em retry após resposta perdida. Memória temporária não é armazenamento persistente.

**Pendente:** poderes, políticas narrativas/condições avançadas, configuração/histórico refinados e fluxo completo de itens. Checklist registra **5 completed, 3 in_progress e 12 blocked**; SQL/QA/auditoria antiga não são mais os gates atuais. O pacote não está integralmente concluído.

## 6. Clãs V5

Catálogo versionado implementado para sete clãs/Caitiff/sangue-fraco, API autorizada por ficha, comando com revisão/idempotência/ledger, concessões 2+1 e defeitos por origem. Preferência Ventrue, categoria Malkavian, restrições Nosferatu/Caitiff e perfil sangue-fraco validados. Formulário/resumo exibem Perdição/Compulsão; orientação é filtrada por Narrador atual da mesa. Cópia independente preserva origens públicas, sem dados privados/aprovação.

**Pendente:** poderes/Alquimia e transições avançadas de perfil, automação contextual de Perdição/Compulsão, configuração avançada por mesa e clãs adicionais sem referência completa. Conferir fontes independentemente antes de declarar conteúdo oficial completo.

## 7. Evolução do jogo

Infraestrutura de geração/avaliação de dados, pool, Fome, Rouse e eventos já foi implementada pelo pacote de fichas/Awake. XP incremental e compra de especialidade também reaproveitam parte da proposta.

**Pendente:** reroll de Força de Vontade, testes resistidos/prolongados, combate físico/social, aplicação automática de dano/cura/impairment, rolagens ligadas a disciplinas e caça, compras de atributos/habilidades/disciplinas/vantagens por XP, automação temporal de Blood Bond e histórico/experiência completos de sessão. Possuir trilhas editáveis de dano não equivale a ter combate implementado.

O documento ainda se apresenta como proposta e seus checkboxes não refletem a infraestrutura reaproveitada; não há `requirements.md`/`design.md`/`tasks.md` separados nessa pasta.

## Validações e decisões transversais

- Última evidência consolidada: **385 testes em 31 arquivos aprovados**, TypeScript/build aprovados; lint completo sem erros e cinco avisos existentes; auditoria pnpm sem vulnerabilidades. Fonte: [revisão de fichas](vtm-v5-fichas-e-inicio-de-noite/review.md) e [metadados](vtm-v5-fichas-e-inicio-de-noite/tasks.meta.json). Resultados registrados anteriormente, não reexecutados para este resumo.
- [PostgreSQL operacional](../backlog/integracao-postgresql.md): backlog, fora do escopo dev em memória. Schema/caminhos SQL existentes não comprovam implementação persistente pronta.
- [QA visual/acessibilidade/responsividade](../backlog/qa-visual-responsividade.md): desejável e posterior; testes de renderização não substituem interação de navegador.
- Reset obrigatório restrito à memória, uma vez ao iniciar implementação de SPEC, não nesta atualização documental.
- Auditoria zerada, build e role `mestre` corrigidos superam os bloqueios antigos respectivos. Não são garantia absoluta de segurança nem conclusão das funcionalidades mecânicas pendentes.
- Seleção/revisão do conjunto staged final continua separada; este resumo não executa nem aprova automaticamente commit. Documentação local originalmente excluída do versionamento não deve ser adicionada indiscriminadamente.

## Documentação a reconciliar

1. Referências antigas `.kiro/specs`/`.codex/specs` versus localização atual `codex/specs`.
2. `vtm-v5-fichas-e-inicio-de-noite/spec.md` declarava implementação não iniciada e referência de clãs ausente; ambas informações já superadas.
3. Checklists de personagens/criação/predação/noite ainda contêm bloqueios históricos de auditoria/SQL/QA e tarefas já parcialmente implementadas.
4. Referências de backfill em planos antigos devem respeitar a remoção do backfill automático e o escopo de memória descartável.

Não foram promovidas tarefas para completed apenas para alinhar números. Pendências devem ser tratadas por critérios verificáveis, preservando o histórico.

## Próximas prioridades sugeridas

1. Definir ingresso/desvínculo/exclusão e sessão ativa; concluir encaminhamento/idempotência de itens.
2. Evoluir poderes/Alquimia, automação contextual e configuração avançada de clãs.
3. Refinar relações narrativas, relatórios/histórico e replay de predação.
4. Evoluir motor para reroll, conflitos/combate, cura e progressão além de especialidades.
5. Reconciliar checklists e planejar PostgreSQL/LiveKit real e QA posterior como entregas específicas.

</details>
