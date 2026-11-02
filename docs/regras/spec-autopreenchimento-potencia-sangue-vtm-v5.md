# SPEC — Autopreenchimento da Potência de Sangue (Vampiro: A Máscara V5)

**Projeto:** Meus Vampiros  
**Auditoria:** 2026-11-02  
**Branch analisada:** `develop`  
**Status:** PARCIALMENTE IMPLEMENTADA — pendências de integração, consistência e validação  
**Observação documental:** o arquivo com este nome não foi localizado nos caminhos convencionais da branch por meio das consultas disponíveis; este documento consolida a situação constatada no código, sem pressupor acesso à redação integral da SPEC original.

## 1. Objetivo
Derivar automaticamente os seis campos da ficha de Potência de Sangue V5, sem permitir que dados calculados sejam manipulados pelo cliente e sem alterar Fome, Vitalidade ou qualquer recurso apenas pela consulta. Preservar a distinção entre Potência permanente, Potência efetiva e configurações da crônica.

## 2. Evidências da implementação

| Requisito | Estado | Evidência | Observação |
|---|---|---|---|
| Catálogos Core V5 e Companion, níveis 0–10 | IMPLEMENTADO | `lib/vtm-v5/blood-potency-catalog.ts` | Arrays de 11 linhas para ambos os perfis e limites de geração. Conferir manualmente os números com os PDFs antes de homologar. |
| Surto de Sangue | IMPLEMENTADO — cálculo | `lib/vtm-v5/blood-potency.ts` | Campo `bloodSurgeDice`; consultar não faz Rouse Check. |
| Quantidade Recuperada | IMPLEMENTADO — cálculo | `lib/vtm-v5/blood-potency.ts` | Campo `superficialMendAmount`, com indicador `mendingAllowed`. |
| Bônus de Poder | IMPLEMENTADO — cálculo | `lib/vtm-v5/blood-potency.ts` | Campo `disciplinePowerBonusDice`; aplicação universal nos poderes não foi comprovada. |
| Rerrolagem de Sangue | IMPLEMENTADO — cálculo | `lib/vtm-v5/blood-potency.ts` | Campo `disciplineRouseRerollMaxLevel`; aplicação nos testes de ativação de disciplinas não comprovada. |
| Penalidade de Alimentação | IMPLEMENTADO — regra derivada | `lib/vtm-v5/blood-potency-catalog.ts` | `feedingRule` expõe parâmetros e texto; execução no fluxo de alimentação não comprovada. |
| Gravidade da Perdição | IMPLEMENTADO / INTEGRADO PARCIALMENTE | `lib/vtm-v5/blood-potency.ts`, `lib/character-rolls.ts` | A gravidade é consultada para modificadores mecânicos de clã em rolagens, sem comprovar cobertura de todos os clãs. |
| API protegida de consulta | IMPLEMENTADO | `app/api/characters/[id]/blood-potency-effects/route.ts`, `lib/character-blood-potency.ts` | Sessão, UUID, dono/narrador, tipo vampiro e `no-store`. |
| UI somente leitura | IMPLEMENTADO | `components/character-summary/blood-potency-summary.tsx` | Mostra seis campos em criação e resumo, com atualização periódica em ficha persistida. |
| Bloqueio de campos derivados forjados | IMPLEMENTADO | `lib/character-blood-potency.ts`, `app/characters/character-form-client.tsx` | Validação de entrada e remoção dos campos antes de enviar o formulário. |
| Política por campanha | IMPLEMENTADO — persistência/rota | `lib/blood-policy.ts`, `app/api/campaigns/[id]/blood-policy/route.ts` | GET/PATCH reservados ao administrador da campanha. Verificar se há acesso atual à configuração pela interface. |
| Interface de política da mesa | COMPONENTE EXISTENTE; ACESSIBILIDADE PENDENTE | `components/campaign-calendar/blood-policy-settings.tsx`, `CHANGELOG.md` | CHANGELOG registra remoção da configuração da página da campanha; verificar ponto de navegação efetivo. |
| Limite permanente 0–10, geração e sangue-ralo | IMPLEMENTADO — validação de domínio | `assertPermanentBloodPotency` | Confirmação de cobertura em todos os caminhos de criação/edição ainda pendente. |
| Efeitos temporários e expiração | PARCIAL | `BloodContext`, `activeBloodEffects`, `globalBloodLevel` | Implementadas categorias de duração; casos de empilhamento e certas fontes ainda lançam erro. |
| Regras comunitárias | PARCIAL / FEATURE FLAG | `BloodPolicy.communityEnabled`, `validateBloodEffectSources` | Dependem de perfil Companion; nem todas as fontes parecem possuir transformação calculada completa. |
| Testes de unidade e integração | PARCIAL / INCONSISTENTE | `tests/blood-potency.test.ts`, `tests/clan-rules-service.test.ts` | Existem testes, porém expectativas legadas contradizem código atual; nenhuma suíte foi executada nesta auditoria remota. |
| Fonte clicável na página exata | PENDENTE | `sourceRefs` e `sourceReference` | Referências textuais existem, sem navegação documentada/confirmada para página exata. |

## 3. Problemas identificados

### P0 — Alinhar testes e regras
- Em `tests/blood-potency.test.ts`, o caso de Potência 0 espera `bloodSurgeDice: null`, mas o catálogo Core retorna `0`.
- O mesmo teste espera que Potência 6–10 seja rejeitada por falta de tabela, mas o catálogo contém 0–10 e a função aceita esses níveis em condições permitidas pelo tipo de personagem/política.
- O teste espera `baneSeverity: 0` para sangue-ralo sem clã, enquanto o cálculo prevê `null` quando a Perdição não é aplicável. Decidir o contrato correto e alinhar UI/testes.
- O componente de criação calcula com `calculateBloodPotencyEffects(draft)`, usando o perfil padrão Core mesmo quando uma mesa pode estar configurada para Companion. A página persistida consulta a API com a política correta; **o preview de criação pode divergir da ficha salva**.
- Não tratar teste escrito como prova de aprovação: executar Vitest, typecheck e build em CI.

### P1 — Completar ações mecânicas
- Ligar o bônus de poder aos testes elegíveis de uso/resistência de Disciplinas, com rastreabilidade da fonte e sem adicionar dados a testes não elegíveis.
- Implementar a rerrolagem permitida de Rouse para Disciplinas de nível elegível, evitando confusão com Força de Vontade ou despertar.
- Integrar a quantidade recuperada ao comando efetivo de regeneração, com Rouse, restrições e registro em ledger.
- Integrar a política de alimentação ao fluxo de reduzir Fome (sangue animal/ensacado, penalidades por humano, mínimo sem matar), sem alterar Fome ao visualizar a ficha.
- Cobrir gravidade de Perdição de cada clã no motor apropriado; não aplicar modificador genérico que substitua a mecânica do clã.
- Rever fonte `CLAN_CURSE`: o cálculo de gravidade efetiva retorna 1 quando essa fonte está ativa, independentemente do valor do catálogo; validar se é intencional para cada efeito.

### P1 — Integridade de políticas e efeitos
- Confirmar que a UI de `BloodPolicySettings` está acessível ao narrador após as mudanças de layout registradas no CHANGELOG.
- Adotar a política efetiva da campanha também na prévia da ficha em edição/criação.
- Definir contratos explícitos de empilhamento e prioridades para múltiplos efeitos, sem fallback silencioso.
- Implementar ou recusar de modo documentado as fontes ainda sem semântica completa: `DILUTE_THE_LINE` explicitamente lança erro; `HEALERS_BANE`, `SLOW_BLOOD` e `FLUENT_*` precisam de avaliação da integração efetiva.
- Validar expiração `SCENE`, `NIGHT`, `DAWN`, `CONDITION` e relógio de jogo, inclusive revogação e mudança de cena.
- Testar limites de geração, permissão 6+ para jogador, Caitiff, sangue-ralo, NPC vampiro, mudanças de campanha e ficha independente.

### P2 — Qualidade da experiência e rastreabilidade
- Substituir nomes técnicos como `CORE_V5_ORIGINAL_V1` na UI por rótulos legíveis.
- Implementar referência clicável para edição, obra e página, respeitando a disponibilidade/licença do material.
- Adicionar testes de UI, autorização, respostas de erro, revisão concorrente e histórico/ledger.
- Executar revisão de acessibilidade/responsividade e homologação manual dos resultados contra as tabelas dos livros.

## 4. Critérios de aceite atualizados
- [x] Catálogo de dois perfis e derivados definidos.
- [x] API de leitura autenticada, com autorização e cache privado desabilitado.
- [x] Componente dos seis derivados somente leitura.
- [x] Validação básica de campos derivados e Potência permanente.
- [x] Política persistida por campanha, com rota de gerenciamento.
- [ ] Prévia e ficha persistida usam sempre a política efetiva da mesa.
- [ ] Toda ação mecânica elegível utiliza os derivados corretos no servidor.
- [ ] Efeitos temporários suportados têm duração, combinação e auditoria verificadas.
- [ ] Sangue-ralo/Caitiff/geração/NPC têm cobertura consistente de ponta a ponta.
- [ ] Testes defasados corrigidos, com suíte focada e typecheck aprovados.
- [ ] UI de política disponível ao narrador no layout atual.
- [ ] Referências das fontes acessíveis e verificadas.
- [ ] Validação de tabela e fórmulas contra PDFs concluída.
- [ ] QA manual + build/CI concluídos.

## 5. Próximos passos recomendados
1. **P0:** corrigir divergências entre catálogo, testes e fluxo de prévia, e rodar suíte focada.
2. **P1:** finalizar integração transacional de alimentação, regeneração, bônus e rerrolagens, com testes.
3. **P1:** revisar stack de efeitos temporários e o acesso à política por campanha.
4. **P2:** rastreabilidade de fontes, documentação e QA.

## 6. Limitações desta auditoria
Inspeção estática de arquivos da branch `develop` pelo conector GitHub em 2026-11-02. Não houve checkout local, execução de testes, acesso a banco ou deploy. Ausência de evidência de integração não significa necessariamente ausência de implementação. O texto integral da SPEC anterior não foi recuperado: esta consolidação não deve ser usada para excluir requisitos preexistentes que não estejam aqui.


## 7. Implementação incremental — alimentação, regeneração e limites (2026-11-02)

**Estado:** código integrado à branch `develop`, não homologado (sem execução de testes/build nesta auditoria por falta de checkout e runtime do repositório). Regras conferidas no Livro Básico V5, pp. 211–216 e 218–219. 

### 7.1 Limites geracionais e Sangue-Ralo

| Geração | Potência mínima | Potência máxima |
|---|---:|---:|
| 2ª–3ª | Não catalogada | Não catalogada |
| 4ª | 5 | 10 |
| 5ª | 4 | 9 |
| 6ª | 3 | 8 |
| 7ª | 3 | 7 |
| 8ª | 2 | 6 |
| 9ª | 2 | 5 |
| 10ª–11ª | 1 | 4 |
| 12ª–13ª | 1 | 3 |
| 14ª–16ª | 0 | 0 |

O catálogo `GENERATION_POTENCY_LIMITS` já possui estas linhas da 4ª à 16ª geração. O servidor passou a validar limites na entrada de dados em `lib/character-blood-potency.ts` quando a Potência é informada. A Potência de Sangue de Sangue-Ralo é 0: aumento direto foi bloqueado. A **transição por Diablerie ainda requer comando específico, resolução do Narrador e testes** (não foi implementada por simples edição). Não inventar limites da 2ª–3ª geração. 

### 7.2 Ações de alimentação implementadas

- Motor: `lib/vtm-v5/blood-actions.ts` (fontes: pequenos/médios/grandes animais, bolsas processadas/não processadas, humano em pequenos goles, seguro, prejudicial, drenagem letal).
- A Potência 2 reduz a eficiência de animais e bolsas à metade; a partir da Potência 3 não saciam Fome. A penalidade humana e os pisos de Fome por Potência são calculados a partir de `feedingPenalty`.
- Bolsa processada sem `Iron Gullet` é rejeitada; fontes humanas não letais não reduzem Fome a 0. Alimentação letal ou de Ventrue exige Narrador no comando, e a restrição de Ventrue exige confirmação da preferência. A morte humana gera indicação de consequências narrativas, **não** perda automática de Humanidade.
- Casos complexos NÃO AUTOMATIZADOS: alimentação diretamente de outro vampiro (laços e escalas de Potência), caça/resistência da vítima, afinidade alimentar especial fora da política implementada, frenesi e outros efeitos narrativos. Manter na resolução do Narrador.
- `HUMAN_HARMFUL` registra no resultado a necessidade de aplicar dano agravado à vítima e testar sobrevivência; o módulo não altera outra ficha automaticamente.

### 7.3 Regeneração implementada

- Dano superficial: 1 Rouse Check por comando, cura segundo `superficialMendAmount`, ao menos um dano superficial pré-existente e restrições `mendingAllowed`.
- Dano agravado: 3 Rouse Checks, cura 1 ponto apenas após comprovar via `chronicle_nights` e `night_awakenings` que a ficha participou da noite informada. Limite de uma regeneração agravada por noite gravado no estado. Se a sequência levar a Fome além de 5, entra em torpor sem conceder cura parcial.
- Fome 5 no início de regeneração é bloqueada para resolução assistida, evitando automatizar frenesi sem regras de mesa. Não aceitar dados de rolagens do cliente; os d10 são gerados no servidor.

### 7.4 Integração, segurança e progresso

- `lib/character-blood-actions.ts`: serviço de comando auditável/transacional `BLOOD_ACTION`, com revisão otimista, idempotência e ledger já presentes em `runCharacterCommand`.
- `app/api/characters/[id]/blood-actions/route.ts`: POST autenticado, mesma origem, JSON estrito, limite de payload, UUID e validação no domínio.
- `components/character-summary/blood-actions-panel.tsx`: controles de alimentação, cura superficial e agravada; integração em `session-resources.tsx` com atualização após comando e reenvio idempotente.
- `tests/blood-actions.test.ts`: cobertura unitária adicionada para limites, fontes, penalidades, Rouse e cura. `tests/blood-potency.test.ts`: expectativas obsoletas dos níveis 0 e 6–10 atualizadas.

### 7.5 Pendências de homologação e evolução

- [x] Motor e API de alimentação e cura superficial/agravada com auditoria via command ledger.
- [x] Integração dos comandos à UI do painel de recursos.
- [x] Validação de limites 4ª–16ª e bloqueio de subida direta de Sangue-Ralo no formulário.
- [x] Testes de domínio escritos / atualização de testes antigos.
- [ ] **P0:** executar typecheck, lint, testes (inclusive PostgreSQL) e build; corrigir falhas encontradas. Nenhum desses foi executado remotamente.
- [ ] **P0:** testes de autorização, idempotência, corrida/concorrência e origem em API, inclusive múltiplos comandos numa noite.
- [ ] **P1:** integrar escolha da noite ao calendário, evitando pedir UUID manual no painel.
- [ ] **P1:** implementar Diablerie como workflow narrativo separado, com transição de Sangue-Ralo à 13ª geração somente após validação de regra e consequências.
- [ ] **P1:** operacionalizar alimentação de outro vampiro, geração de laços e danos sobre vítima com consentimento narrativo.
- [ ] **P1:** revisar outros defeitos/vantagens alimentares e variantes Companion, e uso da política correta na prévia de criação.
- [ ] **P1:** permitir decisão assistida em Fome 5, incluindo frenesi e consequências da falha de Rouse.
- [ ] **P2:** testes E2E e QA visual/mobile; referências clicáveis de livros e páginas.

**Nota de escopo:** revisão documental e commits foram feitos sem execução local das rotas; este módulo não deve ser considerado pronto para produção até completar a homologação. As ações manuais anteriores da ficha continuam disponíveis e não devem ser confundidas com a automação de regras.
