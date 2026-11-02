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
