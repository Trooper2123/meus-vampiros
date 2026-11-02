# SPEC — Despertar individual (Awake) dirigido ao jogador — V5

**Status:** IMPLEMENTAÇÃO PARCIAL / NÃO CONFORME (auditoria de 2026-11-02)  
**Branch examinada:** `develop`  
**Escopo:** personagem jogável, com mesa registrada, mesa externa ao aplicativo e tela de sessão ativa.  
**Regra de produto:** o personagem é o centro da ação. A existência de uma campanha cadastrada no app não é pré-requisito para realizar o despertar.

> Este arquivo foi criado após auditoria porque `codex/specs/character/awake.md` não estava disponível nesse caminho na branch examinada. Ele documenta requisitos confirmados pelo solicitante e divergências observadas no código, **não declara a implementação como concluída**.

## 1. Resultado da auditoria de implementação atual

| Área | Evidência em `develop` | Estado |
|---|---|---|
| Rolagem d10 de Rouse e resultado de despertar | `lib/vtm-v5/session-state.ts` (`applyAwakening`); `lib/chronicle-nights.ts` (`drawD10`) | [x] Motor existente |
| Fome +1 em falha; torpor quando já em Fome 5 | `applyAwakening` | [x] Motor existente |
| Não rolar para torpor, conservar restrição de empalamento | `applyAwakening` e `awakening-explanation.ts` | [x] Motor existente |
| Iniciar noite em lote e gerar histórico | `startChronicleNight`, `chronicle_nights`, `night_awakenings` e ledger | [x] Existente **somente por campanha/Narrador** |
| Ação individual autorizada ao proprietário da ficha | `startChronicleNight` requer `campaign.master_user_id === actorId` | [ ] **Não atende** |
| Ficha sem mesa no app (`campaignId === null`) | serviço exige `campaignId` válido e vínculo de campanha | [ ] **Não atende** |
| Identificar uma mesa externa ao app | Não há seleção/declaração específica no fluxo Awake examinado | [ ] **Não atende** |
| Ação acessível na visão de sessão ativa do jogador | `components/game-session/session-workspace.tsx` mostra `CharacterRolls` ao jogador; não apresenta Awake | [ ] **Não atende** |
| Ação acessível diretamente na ficha independente | `app/characters/[id]/character-summary-client.tsx` mostra recursos e rolagens, sem ação Awake | [ ] **Não atende** |
| Componente Awake integrado às telas | `components/awake-panel.tsx` existe, mas não foi identificada referência de montagem em telas de aplicação na busca examinada | [ ] **Integração não confirmada** |
| Testes de rota | `tests/awake-route.test.ts` verifica a autorização restrita ao Narrador | [x] Testes existentes para **comportamento anterior** |

**Diagnóstico:** é necessário evoluir o contrato do domínio e da experiência do jogador, e não simplesmente expor o painel atual de Narrador para todos.

## 2. Comportamento esperado

### 2.1 Ficha sem campanha vinculada

- [ ] Disponibilizar o despertar no resumo/dossiê do **personagem jogável** sem `campaignId`.
- [ ] Exibir a identificação clara **“Mesa fora do aplicativo”** quando o jogador declarar que usa a ficha numa mesa externa.
- [ ] **Não presumir** que toda ficha sem campanha está em mesa externa: oferecer um campo/ação explícita para registrar esse contexto (por exemplo, `playContext: EXTERNAL_TABLE | SOLO_UNLINKED`), com interface legível e possibilidade de alteração pelo proprietário.
- [ ] O proprietário da ficha decide quando iniciar uma nova noite da crônica e informa, opcionalmente, a data ficcional; não exigir UUID de campanha, Narrador do app, sessão ativa ou tabela `chronicle_nights`.
- [ ] Registrar início de noite com identificação própria do personagem, autor, histórico e chave de idempotência.
- [ ] Permitir utilização em ficha em edição/transcrição somente após validar os recursos necessários; não bloquear exclusivamente por ausência de aprovação de campanha.
- [ ] Indicar que narrativas e decisões do Narrador da mesa externa devem ser resolvidas fora do aplicativo ou registradas explicitamente pelo jogador, sem fingir que houve validação por um Narrador cadastrado.

### 2.2 Personagem participante de mesa registrada

- [ ] Exibir ação **Despertar / Iniciar nova noite** na **visão de sessão ativa do jogador** em `components/game-session/session-workspace.tsx`, junto às rolagens e recursos de seu personagem.
- [ ] O jogador só controla **seu próprio personagem**, mesmo que seja participante de outras mesas ou veja outros personagens na interface.
- [ ] A ação deve enviar `sessionId` quando se originar da sessão ativa; o servidor verifica participação, propriedade da ficha e status da sessão.
- [ ] O jogador visualiza resultado, Fome antes/depois, estado de torpor, noite ficcional e histórico do próprio personagem.
- [ ] Coordenar com o atual início de noite coletivo do Narrador: **não executar dois despertares do mesmo personagem na mesma noite**. Preferir criar/ativar a noite da campanha pelo Narrador e oferecer a execução individual ao jogador; se o Narrador executar excepcionalmente, marcar como já resolvida.
- [ ] Manter visão gerencial do Narrador somente para acompanhamento e intervenções autorizadas, sem permitir que ela substitua automaticamente a ação do jogador.

### 2.3 Mecânica V5 comum aos dois contextos

- [ ] Reutilizar `readSessionState` e `applyAwakening`, com d10 gerado **somente pelo servidor**, sucesso com 6+, falha aumentando Fome em 1 e falha com Fome 5 levando a torpor conforme regra já implementada.
- [ ] Personagem em torpor não rola e exige resolução narrativa adequada; morte definitiva não é elegível.
- [ ] O estado de empalamento não é removido ao despertar.
- [ ] Atualizar `game_state` e campos de projeção de recursos, respeitando o contrato de persistência existente.
- [ ] Um mesmo despertar usa **uma** chave de idempotência: reenviar não pode gerar novo d10, novo aumento de Fome nem novo evento de ledger.
- [ ] Registrar `AWAKENING` ou evento equivalente com contexto `EXTERNAL_TABLE | CAMPAIGN_SESSION`, noite, autor, estado anterior/posterior, dado e resultado.
- [ ] Proteger operações concorrentes pela revisão da ficha e pela chave única de personagem/noite; mudanças de condição e Fome devem ser revalidadas no servidor.
- [ ] Não utilizar o relógio real para passar noites automaticamente. A data ficcional é orientação narrativa, não uma forma de liberar várias rolagens no mesmo momento.

## 3. Contratos sugeridos

### 3.1 Serviço individual

`awakenCharacter(actorId, characterId, { nightContextId, expectedRevision, idempotencyKey, confirmation, sessionId? })`

- Rejeitar identidades sem permissão; personagem deve ser vampiro jogável e pertencer ao jogador.
- Em mesa cadastrada, validar sessão/noite oficial e a não execução prévia naquele contexto.
- Fora do app, validar contexto de noite independente pertencente à própria ficha e sua não execução prévia.
- Aplicar a rolagem e a persistência no mesmo limite transacional, retornar somente dados autorizados.
- **Não aceitar `roll`, `hungerAfter`, `outcome` ou `condition` fornecidos pelo cliente**.

### 3.2 APIs propostas

- `GET /api/characters/[id]/awake`: contexto e histórico do personagem, indicação de elegibilidade e da próxima ação.
- `POST /api/characters/[id]/awake`: comando de despertar individual.
- Para contexto externo, comando separado para **iniciar noite** de personagem, se necessário, aproveitando o domínio de noites independentes proposto em SG-003; não reutilizar `chronicle_nights` como se existisse campanha.

A rota existente `/api/campaigns/[id]/nights/awake` pode permanecer **temporariamente** para funcionalidades administrativas legadas, mas a semântica e a proteção contra despertar duplo devem ser revistas.

## 4. Interface e experiência

### Ficha independente

- [ ] Mostrar cartão “Despertar” com contexto `Mesa fora do aplicativo` quando explicitamente declarado.
- [ ] Mostrar Fome atual, custo de Rouse, condição e possível risco de torpor; permitir confirmar.
- [ ] Exibir resultado da rolagem e Fome atualizada sem recarregar toda a página, com acesso ao histórico.
- [ ] Permitir registrar mudança de noite ficcional sem depender da criação de mesa no aplicativo.

### Sessão ativa

- [ ] Integrar cartão de despertar ao painel do **jogador** na tela de sessão, próximo aos recursos e rolagens; não esconder em painel exclusivo do Narrador.
- [ ] Não selecionar ou lançar testes para outros personagens a partir da visão de jogador.
- [ ] Estados claros: aguardando noite, disponível, processando, concluído, já despertou, torpor/impedido, conexão incerta.
- [ ] Revalidar SWR de recursos, histórico de rolagens e contexto da noite após confirmação.
- [ ] Preservar responsividade e navegação por teclado; comunicar resultados por `aria-live`.

## 5. Critérios de aceite

1. **Proprietário + sem campanha:** ficha marcada como “Mesa fora do aplicativo” consegue iniciar noite e executar despertar; resultado e Fome persistem.
2. **Sessão ativa:** jogador vinculado consegue despertar apenas o próprio personagem na sessão ativa, quando o contexto da noite estiver liberado.
3. **Autorização:** outro usuário, jogador de outra mesa e personagem não elegível recebem erro sem rolar dados nem alterar estado.
4. **Idempotência:** retry após timeout não gera outro teste; repetição com outra chave na mesma noite é rejeitada.
5. **Conflito coletivo/individual:** despertar efetuado pelo Narrador para a mesma noite impede novo despertar do jogador e vice-versa.
6. **Regras:** teste de 6+ não aumenta Fome; falha aumenta um ponto; falha com Fome 5 registra torpor; torpor preexistente não executa teste.
7. **Persistência:** histórico acessível ao dono, com estado antes/depois, rolagem e origem, sem expor dados de outros personagens.
8. **QA:** testes unitários, integração PostgreSQL, rotas, permissões, sessão ativa, ficha independente, concorrência, build e acessibilidade executados.

## 6. Atividades prioritárias propostas

| ID | Prioridade | Atividade | Estado |
|---|---|---|---|
| AWK-001 | P0 | Implementar contexto explícito de mesa externa e noites independentes por personagem | [ ] Pendente |
| AWK-002 | P0 | Criar serviço, rota e ledger de despertar individual com proteção antirrepetição | [ ] Pendente |
| AWK-003 | P0 | Integrar cartão de despertar na ficha independente e na visão de sessão ativa do jogador | [ ] Pendente |
| AWK-004 | P0 | Coordenar despertador coletivo legado e individual para impedir duplicidade por noite | [ ] Pendente |
| AWK-005 | P0 | Testes de autorização, regras, persistência, concorrência, idempotência e build | [ ] Pendente |
| AWK-006 | P1 | Melhorar histórico por personagem, estados da UI e revisão narrativa | [ ] Pendente |

**Dependências:** integrar AWK-001 ao backlog `docs/backlog/backlog-prioritario-mecanicas-sangue-vtm-v5.md`, especialmente SG-002/SG-003 (fichas independentes) e SG-004 (Fome 5). O despertar noturno é distinto de curar dano e não deve consumir o mesmo limite de regeneração agravada.

## 7. Arquivos auditados

- `lib/chronicle-nights.ts`
- `lib/vtm-v5/session-state.ts`
- `lib/vtm-v5/awakening-explanation.ts`
- `components/awake-panel.tsx`
- `app/api/campaigns/[id]/nights/awake/route.ts`
- `components/game-session/session-workspace.tsx`
- `app/characters/[id]/character-summary-client.tsx`
- `tests/awake-route.test.ts`

**Limites da validação:** leitura estática do código da branch `develop`; não foram executados testes, build ou acesso ao banco. O conteúdo original do caminho solicitado não estava disponível, portanto este arquivo é uma especificação de correção e relatório de lacunas, não uma reconstrução literal de documento anterior.
