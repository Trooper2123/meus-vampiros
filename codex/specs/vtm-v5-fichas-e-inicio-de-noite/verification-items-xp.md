# Verificação — Criar/atribuir itens e atribuir XP

**Data:** 12/10/2026, BRT.
**Status:** Falhas funcionais e de autorização identificadas; fluxos não aprovados.
**Escopo:** Verificação em paralelo à autoria da spec, sem editar código de aplicação ou banco externo.

Métodos: revisão estática de UI/API/persistência, reproduções em processo descartável do provider de memória, handler real com dependências de autenticação/infraestrutura substituídas por doubles locais e testes adjacentes existentes. Não houve validação visual no navegador, sessão Auth0 real ou execução contra PostgreSQL externo. Reprodução local não é prova de exploração de um ambiente publicado.

## 1. Resultado de itens

### Regra esclarecida pelo usuário — itens antes de entrar em uma mesa

Itens criados pelo usuário para uma ficha sem vínculo com mesa podem permanecer em memória como rascunhos próprios. Não precisam aparecer no painel de um Narrador enquanto não houver mesa associada. `campaignId: null` nesse estado é válido e não constitui falha por si só.

Quando a ficha ingressar efetivamente em uma mesa, os rascunhos deverão ser encaminhados à aprovação do Narrador dessa mesa, preservando conteúdo e autoria. O backend valida propriedade e vínculo, define origem jogador e estado pendente, e registra os itens/solicitações antes de confirmar o encaminhamento. Repetir o vínculo ou reenviar a solicitação não poderá duplicar itens ou aprovações. O jogador não escolhe arbitrariamente outra campanha nem força aprovação.

A interface distingue rascunho em memória, envio em andamento, pendente de aprovação, aprovado e falha de envio. Uma falha mantém o rascunho para tentativa posterior; não se apresenta como envio concluído. Memória temporária não implica persistência entre recargas/reinícios; qualquer promessa de recuperação entre sessões exige armazenamento definido na implementação.

| ID | Severidade | Resultado | Evidência |
|---|---|---|---|
| ITEM-001 | Alta | Jogador proprietário pode enviar `origin: master` e criar item automaticamente aprovado. Origem/autoridade precisam ser derivadas no servidor. | `app/api/possessions/route.ts:65`, `lib/possessions.ts:122`, `lib/dev-db.ts:494` |
| ITEM-002 | Alta | POST aceita campanha arbitrária sem validar vínculo/autoridade, permitindo vincular item próprio ao inventário de outra campanha. | `app/api/possessions/route.ts:73` |
| ITEM-003 | Bloqueio funcional | Narrador distinto do proprietário não consegue conceder item a personagem de jogador: POST/GET por personagem exigem propriedade. | `lib/auth/authorization.ts:9`, `lib/characters.ts:158` |
| ITEM-004 | Bloqueio funcional | Aprovação/reprovação consulta `possessions`, mas o schema usa `character_possessions`; autorização acessa `db.execute` sem fallback memória, onde `db` é null. PUT falha por esses caminhos. | `lib/auth/authorization.ts:29`, `lib/db.ts:101`, `lib/db.ts:261` |
| ITEM-005 | Média | campaignId null e ausência no painel são válidos antes do vínculo. A lacuna é não haver encaminhamento dos rascunhos à aprovação quando a ficha entra na mesa. | `app/characters/character-form-client.tsx:258`, `lib/dev-db.ts:490` |
| ITEM-006 | Média | Manter itens em memória antes do vínculo é permitido. O risco continua sendo descartar os rascunhos ao substituir o estado por uma consulta vazia após salvar, antes de encaminhá-los à aprovação. | `app/characters/character-form-client.tsx:395`, `app/characters/character-form-client.tsx:512`, `app/characters/character-form-client.tsx:538` |
| ITEM-007 | Média | Painel do Narrador não verifica response.ok/limpa inputs em falhas; formulário do jogador inclui fallback local que pode mascarar POST rejeitado. | `components/master-panel.tsx:227`, `components/master-panel.tsx:236`, `app/characters/character-form-client.tsx:255` |
| ITEM-008 | Baixa | UUID/limites de texto e JSON malformado não são tratados adequadamente; PUT usa status não padrão 444. | `app/api/possessions/route.ts:108` |

### Reprodução local de persistência

Importar `lib/dev-db.ts` com Node v24 em processo isolado sem DATABASE_URL; criar um item player sem campaignId e outro com origin master/campanha. Resultado observado:

```json
{"playerCampaignId":null,"playerStatus":"pendente","playerVisibleInCampaign":false,"forgedMasterStatus":"aprovado","characterCount":2}
```

A aceitação de origin/campaignId pela API e a falha de autorização/schema na aprovação foram revisadas estaticamente. Não foram chamadas APIs externas. A reprodução do provider confirma estados persistidos, mas não substitui teste end-to-end das rotas de itens.

### Correções propostas, ainda não implementadas

- Separar intenção do jogador de concessão do Narrador; origin/status/autor sempre definidos pelo servidor.
- Narrador concede/aprova apenas itens de fichas de sua campanha; jogador cria propostas próprias; não permitir usar UUID de outra mesa.
- Usar tabela/repositório único e autorização equivalente nos providers memória/PostgreSQL; inferir campanha autorizada pela ficha.
- Permitir rascunhos próprios em memória enquanto não houver mesa. No vínculo efetivo, encaminhar os itens de forma idempotente à aprovação da mesa autorizada; conservar rascunhos até confirmação do envio e evitar divergências entre `data.pertences`, memória e tabela.
- Mostrar erro real, preservar campos em falha e atualizar listas somente após confirmação do backend.

## 2. Resultado de XP

| ID | Severidade | Resultado | Evidência |
|---|---|---|---|
| XP-001 | Alta | Concessão usa propriedade: Narrador distinto recebe 403 e jogador pode definir XP próprio arbitrariamente dentro do teto da rota. | `app/api/characters/route.ts:131`, `lib/auth/authorization.ts:10` |
| XP-002 | Alta | Save geral da ficha aceita `experiencia-total`/`experiencia-gasta` sem proteção econômica, inclusive valores negativos/inconsistentes. | `app/api/characters/route.ts:33`, `app/api/characters/route.ts:93`, `app/characters/character-form-client.tsx:614` |
| XP-003 | Média | Lista/painel usam total_xp/spent_xp, mas formulário usa os campos experiencia-* do JSON; concessão não sincroniza a ficha. | `lib/characters.ts:153`, `lib/characters.ts:162`, `lib/dev-db.ts:276`, `app/characters/character-form-client.tsx:372` |
| XP-004 | Média | Cliente calcula novo total a partir de snapshot e servidor sobrescreve; concorrência perde concessões. Lote sequencial pode concluir parcialmente, sem idempotência/recuperação definida. | `components/master-panel.tsx:190`, `components/master-panel.tsx:211` |
| XP-005 | Média | Concessão não gera ledger, não impede reduzir total abaixo do gasto e falhas aparecem apenas no console, sem resultado explícito por personagem. | `lib/characters.ts:153`, `components/master-panel.tsx:199`, `components/master-panel.tsx:220` |

### Reprodução local de autorização e persistência

Handler real PATCH com autenticação/infraestrutura isoladas por doubles e provider em memória:

| Caso | Resultado observado |
|---|---|
| Narrador distinto do proprietário | 403 |
| Proprietário define total 999999 | 200 |
| Terceiro | 403 |
| Não autenticado | 401 |
| XP negativo pela rota PATCH | 400 |

Provider descartável também aceitou save geral com `experiencia-total: "999999"` e `experiencia-gasta: "-20"`. Após concessão de total 12 em outra ficha, a fonte de resumo/lista passou a 12/gasto 0 enquanto JSON lido pelo formulário permaneceu total 10/gasto 3. Esses testes não passaram por sessão Auth0 real ou navegador.

Concorrência foi identificada pelo contrato de sobrescrita: dois clientes que leem 10 e concedem +2 podem enviar ambos 12, perdendo uma concessão. Esse cenário foi revisado estaticamente, sem teste concorrente de PostgreSQL nesta solicitação.

### Correções propostas, ainda não implementadas

- Concessão pelo Narrador da campanha, com política explícita para independentes; propriedade não basta para conceder XP narrativo.
- Backend recebe quantidade/motivo/chave, calcula incremento atomicamente e registra ator/evento; não recebe novo total do cliente como concessão.
- Fonte única para total, gasto e disponível; proteger campos econômicos contra PUT do formulário geral.
- Validar inteiros, saldo, gasto <= total, reduções autorizadas e duplicidade; definir lote atômico ou resultados parciais recuperáveis.
- Exibir sucesso/erro por personagem; testar Narrador, jogador, terceiros, outras campanhas, concorrência, duplicidade e integridade.

## 3. Testes executados e limites

- Itens: `npm test -- tests/character-independent-routes.test.ts tests/character-type-access-route.test.ts` → 2 arquivos/21 testes aprovados, exit 0.
- XP: `npm test -- tests/character-independent-routes.test.ts tests/character-ledger.test.ts` → 2 arquivos/16 testes aprovados.
- As duas execuções possuem sobreposição; não somar 21 + 16 como testes únicos.
- Não existem testes específicos suficientes de criação/concessão/aprovação de itens nem de concessão de XP. Aprovação dos testes adjacentes não aprova esses fluxos.
- Vitest avisou sobre demora de fechamento de servidores Vite na execução de itens; resultado dos testes permaneceu aprovado.
- Nenhum reset de banco externo, schema, seed de servidor aberto ou correção de código realizada. Processos isolados usaram fixtures descartáveis próprias.

## 4. Gate de segurança

Os achados altos de autorização permanecem abertos. Corrigi-los e incluir testes negativos específicos é pré-requisito de aprovação dos fluxos e de sua reutilização por compras de especialidades/progressão. Não marcar a futura task-004 completed com base apenas neste diagnóstico.
