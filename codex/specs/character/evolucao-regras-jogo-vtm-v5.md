# SPEC — Evolução das Regras de Jogo VtM V5

**Projeto:** Meus Vampiros  
**Versão revisada:** 2.1 — auditoria de implementação, integração com Disciplinas, Awake e fichas independentes  
**Branch de trabalho:** `docs/revisao-specs-v5`  
**Status:** IMPLEMENTAÇÃO PARCIAL — requisitos não homologados permanecem pendentes  
**Documento de referência fornecido:** “SPEC — Evolução das Regras de Jogo VtM V5”, versão 2.0, com integração `@dice-roller/rpg-dice-roller`.  
**Dependências documentais:** `spec-evolucao-regras-jogo-vtm-v5.md` e `spec-regras-criacao-fichas-vtm-v5.md` (validar localização atual).  
**Integrações:** `codex/specs/character/awake.md`, `docs/regras/spec-autopreenchimento-potencia-sangue-vtm-v5.md` e `docs/backlog/backlog-prioritario-mecanicas-sangue-vtm-v5.md`.

> Esta revisão consolida os requisitos funcionais do material fornecido com uma inspeção **estática** do código da branch. “Existe no código” não equivale a “testado” ou “pronto para produção”. O documento original carregava uma lista de tarefas inteiramente pendentes; os estados abaixo foram reclassificados com base apenas nas evidências identificadas, sem executar comandos, banco ou build. Não se deve apagar requisitos anteriores que ainda precisem de cobertura detalhada.

## 1. Objetivo e escopo preservado

Oferecer rolagens de dados V5, testes simples, resistidos e prolongados; Rouse Check; crítico normal, **Messy Critical** e **Bestial Failure**; rerroll de Força de Vontade; predação e Disciplinas; combate físico e social, dano superficial e agravado, Impairment, cura e recuperação; evolução por XP; Blood Bond; auditoria e intervenções do Narrador.

`@dice-roller/rpg-dice-roller` deve ser **apenas provedor de dados**. O domínio da aplicação continua responsável por montar pools, interpretar regras, autorizar, aplicar consequências, persistir e projetar resultados permitidos. Nenhuma regra deve depender diretamente de APIs do pacote externo.

### 1.1 Regras de compatibilidade e produto

- Ficha de vampiro sem campanha (`campaignId === null`) é válida e pode realizar rolagens autorizadas e Rouse Checks; a UI poderá indicar explicitamente “Mesa fora do aplicativo” quando essa opção for declarada pelo usuário.
- Personagens de campanha usam a política efetiva da mesa; ficha independente usa política explícita e estável, sem inventar Narrador interno.
- Jogadores executam rolagens do próprio personagem e consultam apenas informações liberadas. Narrador autorizado decide modificadores ocultos, dificuldades secretas, consequências e ajustes narrativos.
- Modo Sessão **já existe** e deve ser estendido; não recriar mesa, chamada ou cadastro de personagens.
- Preservar os resultados dos dados mesmo que a avaliação de regras evolua. Não alegar replay idêntico da aleatoriedade além do dado já persistido.

## 2. Auditoria de implementação na branch de revisão

| Item | Evidência | Situação |
|---|---|---|
| Dependência externa instalada | `package.json` — `@dice-roller/rpg-dice-roller: 5.5.0` | **Implementado** (instalação confirmada; não significa homologação) |
| Adaptação `DiceProvider` | `lib/vtm-v5/dice-provider.ts`: interface síncrona `rollD10(count): number[]`, `DiceRoll`, `NumberGenerator` e `randomBytes` | **Implementado**, auditoria de RNG ainda requerida |
| Separação de dados normais/Fome | `lib/vtm-v5/dice-roll-service.ts`: `rollV5Pool` | **Implementado** |
| Avaliação de sucessos/críticos | `lib/vtm-v5/dice-evaluator.ts`: `evaluateV5Roll` e `resolveV5Count` | **Implementado**, exige cobertura de precedência |
| Testes de personagem e autorização | `lib/character-rolls.ts`, `tests/character-rolls.test.ts` | **Implementado parcialmente / não homologado** |
| Histórico e rerroll com Força de Vontade | `lib/character-roll-history.ts`: `storeRoll`, `rerollCharacterDice` | **Código existente**, validar todos os custos e restrições |
| Rolagem rápida de sessão | `lib/session-rolls.ts`, `components/game-session/session-quick-roll.tsx` | **Implementação parcial**: requer verificar histórico durável e autorização integral; serviço observado retorna resultado sem persistência própria |
| Potência de Sangue nas mecânicas | `lib/vtm-v5/blood-potency.ts`, `lib/blood-policy.ts` | **Parcial**: derivados existem; integração por ação deve ser completada |
| Alimentação e regeneração | `lib/vtm-v5/blood-actions.ts`, `lib/character-blood-actions.ts` | **Inicial**, QA/integração ainda pendentes |
| Awake | `lib/chronicle-nights.ts`, `lib/vtm-v5/session-state.ts` | **Motor existente**, fluxo jogador/ficha livre/configuração de Narrador pendente |
| Progressão/ledger de XP | `lib/xp-transactions.ts`, comandos existentes | **Parcial**; não equiparar ledger genérico aos custos completos por categoria |
| Disciplinas com rolagem contextual | Catálogo e motor existem separadamente | **Pendente** a integração automática validada por poder |
| Combate físico/social e Blood Bond | Módulos de rolagem e recursos existem | **Sem comprovação de fluxo completo**; manter como pendente de auditoria/implementação |

### 2.1 Ajustes indispensáveis na SPEC v2.0

1. `DiceProvider` implementado é **síncrono**, diferente do exemplo `Promise<number[]>` do texto original. Preservar o contrato efetivo da aplicação, evitando migração artificial para `async`.
2. O provedor limita pools a **50 dados** na implementação atual, não 100. Ajustar exemplos, contratos e testes ao limite vigente; não elevar sem justificativa.
3. O pacote é uma **dependência já instalada**, não “biblioteca candidata ainda a instalar”; DEC-005 permanece válida como decisão de encapsulamento e revisão de segurança.
4. O avaliador atual retorna `CRITICAL`, não `CRITICAL_SUCCESS`; contratos front/back/testes devem utilizar um enum canônico ou mapeamento compatível.
5. Regras de segurança devem impedir resultado e pool forjado pelo cliente. Há fluxo de rolagem avulsa de sessão em que pool/Fome são fornecidos como números pelo solicitante autorizado: documentar como **rolagem livre de Narrador**, diferente do pool de personagem obtido no servidor.
6. A lista de tabelas proposta no documento original é **modelo lógico desejado**, não evidência de que todas essas tabelas existem. Não recriar entidades sem mapear o schema real e os eventos existentes.

## 3. Requisitos funcionais revisados

### RF-001 — Motor único de rolagens e `DiceProvider`

- [x] Usar `DiceProvider` e `rollV5Pool` para geração base de D10 de personagem.
- [ ] Padronizar o acesso ao motor em predação, Disciplinas, combate, Blood Bond, testes resistidos e prolongados.
- [ ] Auditar imprevisibilidade e distribuição de `NumberGenerator.generator.engine`, impactos de configuração global e concorrência; fixar versão e lockfile verificáveis.
- [ ] Evitar múltiplas implementações de interpretação da mesma rolagem. Usar `FakeDiceProvider` em testes determinísticos.

**Aceite:** todas as ações mecânicas que exigem dados usam contratos comuns sem permitir substituição do resultado pelo cliente.

### RF-002 — Pools normais e Hunger Dice

- [x] Separar dados normais e dados de Fome e preservar resultados individuais.
- [ ] Garantir que Fome é obtida do estado autoritativo e não da contagem indicada pelo cliente nas rolagens do personagem.
- [ ] Respeitar `0 <= Hunger Dice <= min(Fome, pool)`, limites de pool e exceções de regras V5.
- [ ] Preservar a natureza de cada dado em rerrolls, histórico e animação.

**Aceite:** nenhum rerroll de Força de Vontade altera um Hunger Die; a divisão dos dados não se perde entre API e tela.

### RF-003 — Interpretação do resultado V5

- [x] Contar 6–10 como sucesso e pares de 10 como crítico com +2 sucessos por par.
- [ ] Testar precedência: crítico normal, Messy Critical, Bestial Failure, falha comum, zero sucessos, dificuldade e margem; não interpretar um Rouse Check como pool comum.
- [ ] Manter esquema canônico de `FAILURE | SUCCESS | CRITICAL | MESSY_CRITICAL | BESTIAL_FAILURE` ou conversão explícita nas bordas.

**Aceite:** resultados reavaliáveis a partir dos dados originais, sem vazamento de dificuldade oculta.

### RF-004 — Rerroll de Força de Vontade

- [x] Existe `rerollCharacterDice` com histórico de revisões.
- [ ] Verificar custo de Força de Vontade, limite e elegibilidade dos dados, impedimento de trocar dados de Fome, versão de ficha e idempotência.
- [ ] Validar interface e mensagens acessíveis; conservar resultado original e substituições.

**Aceite:** custo debitado uma única vez por rerroll aceito e somente dados elegíveis são substituídos.

### RF-005 — Rouse Check e mecânicas de sangue

- [x] Há motor de Rouse do despertar e motor inicial para regeneração.
- [ ] Unificar contrato de Rouse/registro de resultado para despertar, cura, uso de poderes e outras ações de sangue, preservando motivos distintos.
- [ ] Aplicar custo de Rouse apenas às ações elegíveis; diferença entre “falha do Rouse” e “falha do teste de poder”.
- [ ] Respeitar Gravidade da Perdição, bônus e rerrolls de Rouse quando previstos para poder/nível da Potência, sem presumir interação universal.
- [ ] Completar Fome 5, torpor e decisão assistida conforme SPEC Awake e backlog SG-004.
- [ ] Viabilizar Rouse e regeneração em ficha independente, sem `campaignId`.

**Aceite:** nenhuma ação recebe rolagem duplicada em retry; Fome e resultados são auditados junto com a causa.

### RF-006 — Disciplinas e poderes acionáveis pelo jogador

- [ ] Na ficha e na visão de sessão ativa, exibir **Rolar poder** somente para poderes adquiridos/permitidos ao personagem.
- [ ] Preservar nomes de Disciplinas e poderes **em inglês** como identificador de referência e oferecer tradução de exibição PT-BR onde cadastrada.
- [ ] Validar o poder no servidor: clã, aquisição, nível, pré-requisitos, condições, custo, exceções e política de mesa.
- [ ] Para cada poder, identificar o tipo de resolução: passivo, efeito sem teste, teste simples, resistido, prolongado, Rouse, disputa ou intervenção narrativa.
- [ ] Resolver automaticamente apenas fórmulas **explícitas** do catálogo. Exibir resumo antes: atributo, habilidade, bônus elegíveis por Potência, dados de Fome, dificuldade pública e custos.
- [ ] Integrar gasto de Rouse e rerroll de Rouse autorizados, sem presumir que todo poder gera pool comum.
- [ ] Expor ao jogador somente resultado permitido; preservar dificuldades/modificadores secretos do Narrador.
- [ ] Produzir eventos de rolagem com `disciplineId`, `powerId`, revisão das regras, dados e alterações de recursos.
- [ ] Atender personagem vinculado e ficha independente (contexto de mesa externa explícito).

**Aceite:** cada poder com mecânica catalogada reproduz fórmula e custo corretos em um único comando idempotente; poderes sem regra parametrizada mostram fluxo assistido e não inventam resultados.

### RF-007 — Testes resistidos e prolongados

- [ ] Modelar participantes e suas autorizações, dificuldade, pontuação, empates, tempo ficcional e rodadas.
- [ ] Persistir fases parciais com regras de continuidade, sem rerrolar resultados concluídos.
- [ ] Permitir intervenção do Narrador onde houver contexto narrativo.
- [ ] Trabalhar também sem mesa quando houver oponente narrativo declarado, sem fabricar ficha de outro usuário.

**Aceite:** ações de participantes são rastreáveis, com progresso e fechamento explícitos.

### RF-008 — Resumo e visibilidade da rolagem

- [x] Há respostas e histórico de rolagem de personagem com políticas de visibilidade.
- [ ] Garantir projeções distintas pelo backend, não só UI, para dificuldade secreta, riscos narrativos e modificadores ocultos.
- [ ] Prévia: pool base, atributo/habilidade, especialidade, bônus, Hunger Dice e custo.
- [ ] Pós-rolagem: dados separados, total de sucessos, margem quando divulgável, classificação e efeitos.
- [ ] Exibir histórico na sessão e na ficha, com filtragem por autorização.

### RF-009 — Combate físico/social, dano e condições

- [ ] Completar resolução de iniciativa/ordem aplicável, ataques e defesas, margens, cobertura, armas e modificadores.
- [ ] Completar combate social com consequências válidas sobre Força de Vontade e resolução narrativa.
- [ ] Usar serviço de dano para conversões superficial/agravado, absorção, Impairment e estados incapacitantes; não alterar Vitalidade por retorno de dado isolado.
- [ ] Usar regeneração por Rouse já especificada, respeitando limites e noite ficcional de fichas independentes.
- [ ] Registrar evento de dano com valor bruto, conversão, valor aplicado, origem e relação com a rolagem.

**Aceite:** ações mecânicas e efeitos no personagem são transacionais e auditáveis.

### RF-010 — Progressão por XP

Preservar custos do documento original como **requisitos para validação**, não como comprovação de implementação:

| Característica | Custo de XP |
|---|---:|
| Atributo | Novo nível × 5 |
| Habilidade | Novo nível × 3 |
| Especialidade | 3 |
| Disciplina de clã | Novo nível × 5 |
| Disciplina fora de clã | Novo nível × 7 |
| Disciplina Caitiff | Novo nível × 6 |
| Ritual de Blood Sorcery | Nível × 3 |
| Fórmula Thin-Blood Alchemy | Nível × 3 |
| Vantagem | 3 por ponto |
| Blood Potency | Novo nível × 10 |

- [x] Há mecanismo de transação de XP em `lib/xp-transactions.ts`.
- [ ] Auditar compras por categoria, saldo, pré-requisitos, reembolso e registros vinculados ao catálogo.
- [ ] Validar Potência de Sangue contra limites de geração; Sangue-Ralo não sobe Potência diretamente, exigindo fluxo de Diablerie quando aplicável.
- [ ] Respeitar aprovações da mesa, e contexto da ficha independente, sem saldo negativo ou gastos duplicados.

### RF-011 — Blood Bond

- [ ] Auditar eventos existentes e completar domínio temporal de ingestões e estágios do Laço de Sangue.
- [ ] Rolar resistências pelo motor central, conservando contexto e visibilidade.
- [ ] Relacionar alimentação entre vampiros (SG-006) e cronologia, sem automatizar efeitos narrativos além das regras definidas.
- [ ] Preparar automações temporais futuras sem fazê-las depender do relógio real.

### RF-012 — Awake e noites da crônica

A autoridade do Awake **é configurável por mesa**, como definido em `codex/specs/character/awake.md`:
- `PLAYER_ROLLS`: Narrador prepara a noite, cada jogador desperta o próprio personagem.
- `NARRATOR_FORCES`: Narrador executa os despertares, podendo selecionar subconjunto.
- Ficha de mesa externa ao aplicativo: o próprio proprietário executa o despertar, sem Narrador cadastrado.
- Rejeitar um segundo despertar para a combinação personagem + noite, inclusive após troca de política.
- O despertar noturno é um Rouse Check específico e **não** consome a quota de cura agravada por noite.

### RF-013 — Auditoria e permissões de Narrador

- [x] Comandos de personagem usam idempotência, revisão e ledger no domínio existente.
- [ ] Aplicar modelo equivalente onde ainda houver ações avulsas de sessão, resistidos, combate, Disciplinas e Blood Bond.
- [ ] Não retornar informações privadas do Narrador nas respostas destinadas ao jogador.
- [ ] Impedir IDOR/BOLA, forjamento de pool, dados, Fome, dificuldade secreta e efeitos.
- [ ] Auditoria de alterações administrativas: autor, justificativa, antes/depois, referência à rolagem original.

## 4. Arquitetura e contratos efetivos

| Responsabilidade lógica | Implementação observada / estratégia |
|---|---|
| `DiceProvider` | `lib/vtm-v5/dice-provider.ts` |
| `DiceRollService` / geração de pool | `lib/vtm-v5/dice-roll-service.ts`, `lib/character-rolls.ts` |
| `V5RollEvaluator` | `lib/vtm-v5/dice-evaluator.ts` |
| Histórico, rerroll, visibilidade | `lib/character-roll-history.ts` |
| Serviço de comandos/idempotência | `lib/character-commands.ts` |
| Sessão e rolagem avulsa | `lib/session-rolls.ts`, `components/game-session/session-quick-roll.tsx` |
| Recursos e condições | `lib/character-resources.ts`, `lib/character-conditions.ts` |
| Potência, regras de alimentação/regeneração | `lib/vtm-v5/blood-potency.ts`, `lib/vtm-v5/blood-actions.ts`, `lib/character-blood-actions.ts` |
| Awake | `lib/chronicle-nights.ts`, `lib/vtm-v5/session-state.ts` |
| Ledger de XP | `lib/xp-transactions.ts` |

**Contrato de provedor observado:** `type DiceProvider = { rollD10(count: number): number[] }` (síncrono, máximo 50 D10). Uma abstração diferente só deve ser adotada se houver necessidade real e uma migração consistente.

**Sequência de uma rolagem mecânica:** autenticar → autorizar ficha/sessão/ator → carregar estado/versão → validar ação e calcular pool no servidor → registrar ou executar de forma idempotente → gerar dados → avaliar V5 → aplicar custo e efeitos na transação correta → persistir rolagem, recurso e ledger → projetar resposta conforme papel.

**RNG e falhas parciais:** a geração aleatória em memória não pode garantir reconstrução de um resultado nunca persistido. Para casos de falha após geração, documentar a fronteira transacional, persistir o que foi confirmado e evitar promessas de “exactly once” físico de dados não salvos.

## 5. Modelo lógico de persistência

Preservar como referências conceituais as entidades originais: `dice_rolls`, `dice_roll_results`, `roll_modifiers`, `game_sessions`, `scenes`, `conflicts`, `conflict_participants`, `conflict_turns`, `conflict_actions` e `damage_events`.

**Antes de criar tabelas novas:** comparar com `game_state`, `character_commands`, `character_ledger_events` e os modelos existentes de sessão. Não duplicar persistentemente histórico sem plano de consulta/transação.

Campos mínimos de rolagem: `roll_request_id`, `character_id`, `campaign_id?`, `session_id?`, `roll_type`, `reason`, `dice_provider`, `dice_provider_version`, `ruleset_version`, `regular_results`, `hunger_results`, `successes`, `margin`, `outcome`, `visibility`, `created_at`, `actor_id`, `expected_revision`, `idempotency_key`. Modificadores secretos devem ter projeção de acesso restrito.

## 6. Segurança

1. Somente o servidor determina sucesso, crítico, dificuldade efetiva, Fome, bônus, custo e consequências mecânicas.
2. Autorizar cada recurso: personagem, mesa, sessão, rolagem, vítima, e histórico; resultados secretos do Narrador nunca devem ser liberados por endpoints de jogador.
3. Exigir consistência de transação para gastos de Força de Vontade, Rouse, dano, XP, cura e Laço de Sangue.
4. Garantir idempotência por comando e compatibilidade com revisão otimista; ações concorrentes não podem aplicar duas vezes os mesmos efeitos.
5. Validar versão, licença, cadeia de dependências, lockfile, RNG e limite de dados do pacote instalado.
6. Respeitar os limites de uso de materiais de V5 e exibir referências à fonte quando permitido.

## 7. Testes obrigatórios

- **Unitários:** d10 1–10, pools 0–50, Hunger Dice, críticos, Messy Critical, Bestial Failure, Rouse, rerroll de Força de Vontade, dificuldade, margem e erros de esquema.
- **Integração:** rolagem/ficha sem campanha, personagem na campanha, autorização Narrador, sessão ativa, histórico, atualização de recursos, idempotência, revisão concorrente e PostgreSQL.
- **Disciplinas:** fórmula por poder, pré-requisitos, personagem que não adquiriu o poder, custo Rouse, bônus de Potência, visibilidade, poderes narrativos e reenvio.
- **Combate/Blood Bond:** dois participantes, empate, dano, custo e registro temporal.
- **Awake:** os dois modos de mesa, ficha independente, sono, torpor, Fome 5, tentativa duplicada por personagem/noite.
- **Segurança:** IDOR, pool forjado pelo jogador, dados de entrada maliciosos, segredo do Narrador, múltiplos envios e alteração concorrente.
- **Qualidade:** `tsc --noEmit`, `npm run lint`, `npm test` (ou gerenciador previsto no repositório), build e QA de navegação/acessibilidade. **Nenhuma dessas execuções foi realizada nesta revisão.**

## 8. Plano de trabalho revisado (tarefas e estados)

Status: `EVIDENCIADO_NO_CÓDIGO`, `PARCIAL`, `PENDENTE`. Só marcar `COMPLETED` quando execução/testes pertinentes forem comprovados.

| Tarefa da v2.0 | Atividade | Situação |
|---|---|---|
| TASK-001–004 | Conferir convenções, banco descartável e segurança da dependência | **Parcial**; instalação verificada, auditorias pendentes |
| TASK-005–009 | Instalação `5.5.0`, `DiceProvider`, testes e RNG | **Código existente**; segurança/validação pendentes |
| TASK-010–013 | Pool, avaliação, Hunger Dice, críticos | **Código existente**; testar precedência e exceções |
| TASK-014 | Rerroll de Força de Vontade | **Código existente**; validar regras/custos |
| TASK-015 | Rouse Check | **Parcial**, integração entre ações pendente |
| TASK-016–020 | Persistência, endpoints, idempotência, visibilidade, histórico | **Parcial**: personagem conta com ledger; sessão livre necessita validação |
| TASK-021–022 | Ficha e predação | **Parcial** |
| TASK-023 | Poderes de Disciplinas | **Pendente** (SG-010) |
| TASK-024–025 | Combate, dano e recuperação | **Parcial / pendente de fluxo completo** |
| TASK-026 | Blood Bond | **Pendente** à integração de resistências/temporalidade |
| TASK-027 | Progressão XP | **Parcial** |
| TASK-028–032 | Resumo visual, dados separados, histórico, visibilidade | **Parcial**, validar fluxo de jogador/Narrador |
| TASK-033 | Modo Sessão | **Iniciado/existente**; não recriar, expandir |
| TASK-034–038 | Testes, segurança, changelog, revisão pré-commit, aceite | **Pendente de execução comprovada** |

### 8.1 Próximas entregas recomendadas

**P0 — Estabilizar domínio e segurança**
- [ ] Validar build, lint, TypeScript e testes reais das implementações atuais.
- [ ] Resolver divergências do catálogo por Potência, Rouse, Fome 5 e persistência de eventos de sessão.
- [ ] Fixar contrato único de rolagem, resultado, visibilidade e idempotência.
- [ ] Alinhar Awake a `codex/specs/character/awake.md` e permitir ficha livre.

**P1 — Mecânicas para jogadores**
- [ ] Concluir SG-010 — rolagens de poderes de Disciplinas para jogador, ficha independente e sessão ativa.
- [ ] Completar ações de dano/regeneração e testes resistidos/prolongados.
- [ ] Integrar alimentação entre vampiros e evolução Blood Bond.
- [ ] Completar aquisição/progressão XP com limites geracionais, Sangue-Ralo e Diablerie mediada.

**P2 — Ampliação e homologação**
- [ ] Combate físico e social completo, cenas, condições e medidas de dano.
- [ ] Relatórios, histórico autorizado e referência por livro/página.
- [ ] QA completo e atualização do `CHANGELOG.md` após execução real.

### 8.2 Critérios de aceite da SPEC

A SPEC só será concluída quando o motor for reutilizável entre ficha, Disciplinas, combate e Blood Bond; dados normais/Fome forem separados; críticos e falhas obedecerem à V5; rerroll, Rouse, XP, dano e cura forem transacionais; ficha independente e sessão ativa estiverem suportadas; políticas da mesa e projeções de segurança forem respeitadas; resultados forem auditáveis e testes obrigatórios estiverem aprovados.

## 9. Decisão arquitetural DEC-005 (mantida e atualizada)

**Decisão:** usar `@dice-roller/rpg-dice-roller` **5.5.0** para gerar D10, isolada no `DiceProvider`, condicionado à auditoria da configuração de RNG, segurança e compatibilidade. A biblioteca nunca implementa as regras V5, autorização, persistência ou aplicação de efeitos.

**Justificativa:** reutilizar infraestrutura de dados sem acoplar as regras e a persistência a uma dependência genérica.

**Status da decisão:** adotada no código; homologação ainda pendente.

---
**Limite desta revisão:** auditoria estática dos caminhos citados na branch `docs/revisao-specs-v5` em 2026-11-02; não executados testes, migrações ou build. A transcrição original de versão 2.0 foi enviada pelo usuário e é a base de requisitos preservados; esta revisão normaliza os requisitos para o estado atual do projeto e explicita itens ainda não demonstrados.
