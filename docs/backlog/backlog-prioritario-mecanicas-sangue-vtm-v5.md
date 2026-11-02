# Backlog prioritário — Mecânicas de Sangue V5

**Projeto:** Meus Vampiros  
**Branch de referência:** `develop`  
**Criado em:** 2026-11-02  
**Atualizado em:** 2026-11-02  
**Estado:** PLANEJADO — tarefas ainda não concluídas  
**Origem:** auditoria e evolução da [SPEC de autopreenchimento da Potência de Sangue](../regras/spec-autopreenchimento-potencia-sangue-vtm-v5.md).

> Este backlog não substitui a SPEC funcional: lista as atividades programadas em ordem de implementação. Os módulos atuais de alimentação/regeneração existem, mas ainda não foram homologados por testes e build. A ficha independente é uma ficha **sem vínculo com uma mesa cadastrada no aplicativo**; não significa ausência de Narrador na partida real.

## 1. Prioridades e dependências

| ID | Prioridade | Atividade | Estado | Dependências |
|---|---|---|---|---|
| SG-001 | **P0** | Homologar e corrigir ações de sangue já integradas | [ ] Pendente | Nenhuma |
| SG-002 | **P0** | Rouse Check e regeneração de dano superficial em ficha independente | [ ] Pendente | SG-001 |
| SG-003 | **P0** | Regeneração de dano agravado em ficha independente, sem UUID de noite de mesa | [ ] Pendente | SG-001, SG-002 |
| SG-004 | **P0** | Tratar Rouse em Fome 5 com resolução assistida | [ ] Pendente | SG-001, SG-002 |
| SG-005 | **P1** | Selecionar noite de crônica por interface, sem UUID manual | [ ] Pendente | SG-001 |
| SG-006 | **P1** | Alimentação entre vampiros com efeitos na vítima | [ ] Pendente | SG-001 |
| SG-007 | **P1** | Fluxo específico de Diablerie e transição Sangue-Ralo | [ ] Pendente | SG-006 |
| SG-008 | **P1** | Refinar regras de alimentação, vantagens/defeitos e política efetiva | [ ] Pendente | SG-001 |
| SG-009 | **P2** | QA ponta a ponta, acessibilidade e fontes clicáveis | [ ] Pendente | SG-001 a SG-008, SG-010, SG-011 |
| SG-010 | **P1** | Rolagens de poderes de Disciplinas para jogadores | [ ] Pendente | SG-001, integração com catálogo de Disciplinas e motor de dados |
| SG-011 | **P1** | Trilha sonora integrada ao Modo Sessão | [ ] Pendente | Modo Sessão existente, permissões de mesa; levantamento de provedores/licenças |

### Decisões arquiteturais comuns

- Reutilizar `runCharacterCommand` com revisão otimista, chave de idempotência, transação e `character_ledger_events`; não aceitar resultado de Rouse ou Fome calculado pelo cliente.
- Separar comandos mecânicos (`FEED`, `MEND_SUPERFICIAL`, `MEND_AGGRAVATED`, futura Diablerie) de ajustes manuais de recursos, preservando o histórico de ambos.
- Respeitar `campaignId === null`: **não depender de `chronicle_nights`, `night_awakenings` ou identidade de Narrador cadastrado** para usar recursos legítimos de ficha independente.
- Não assumir a passagem de dias/anoitecer pelo relógio do servidor como tempo ficcional. Toda mudança de noite precisa de evento de jogo explícito.
- Para fichas vinculadas, manter validações de participação e permissões da mesa. Para independentes, o proprietário autenticado controla a ficha, sujeito à validação das regras e ao registro de decisões que normalmente caberiam a um Narrador.
- Respostas de API privadas/`no-store`; validação de formato, acesso, restrições mecânicas e contexto no servidor.

## 2. P0 — Correções e suporte essencial

### SG-001 — Homologação das implementações existentes
**Objetivo:** estabilizar a API e o motor já escritos antes de expandir mecânicas.

**Atividades**
- [ ] Executar `tsc --noEmit`, lint, testes focados de Potência/recursos/rolagens e build; corrigir eventuais problemas.
- [ ] Executar testes de integração PostgreSQL das APIs `/resources` e `/blood-actions`, incluindo esquema de desenvolvimento.
- [ ] Cobrir autenticação, autorização, mesma origem/CSRF, validação estrita, idempotência, concorrência, revisão obsoleta, registro em ledger e ausência de efeitos colaterais em falhas.
- [ ] Rever alimentação segura/prejudicial/letal, custos Rouse, política de Perdição, transições de torpor e comportamento da Fome 5; conferir com Livro Básico e Companion antes de aprovar.
- [ ] Verificar que a configuração da campanha é aplicada à ficha e à prévia; não usar Core silenciosamente quando a mesa estiver em Companion.
- [ ] Cobrir Sangue-Ralo em geração 14–16 com Potência 0, limites oficiais 4–16 e tentativas indevidas de incremento; **não** tratar Diablerie como simples edição do campo.
- [ ] Separar/indicar claramente as operações mecânicas e os controles manuais no painel da ficha.

**Aceite:** conjunto focado de testes, TypeScript e build aprovados; segurança, consistência de estado e ledger confirmados. Sem alegação de aprovação antes da execução.

### SG-002 — Rouse e regeneração superficial em fichas livres
**Objetivo:** possibilitar que o dono de ficha independente execute Rouse e cure dano superficial sem criar uma mesa artificial.

**Atividades**
- [ ] Disponibilizar a ação a personagens vampiros independentes autorizados, inclusive `DRAFT` no modo de transcrição livre, quando seus atributos mecânicos forem válidos.
- [ ] Reutilizar o motor de Rouse e a Potência efetiva da ficha com perfil padrão explicitado (ou perfil escolhido para ficha independente, se configurado).
- [ ] Executar d10 no servidor, exibir resultado e eventual aumento de Fome, curar a quantidade permitida, sem alterar dados de outros recursos.
- [ ] Recusar cura sem dano superficial, condições incompatíveis e benefícios proibidos por Vantagens/Defeitos.
- [ ] Persistir ação, dados do teste, antes/depois, revisão e autor no ledger; a repetição com a mesma chave não pode rolar novamente.
- [ ] Apresentar ação e histórico no resumo da ficha independente (não somente na tela de sessão de uma mesa).

**Aceite:** proprietário sem campanha executa uma cura superficial válida; outro usuário não executa; o comando não depende de `campaignId`; dois envios idênticos têm um único efeito.

### SG-003 — Regeneração agravada sem mesa
**Objetivo:** permitir cura agravada com limite de 1 ponto por **noite ficcional**, mesmo sem campanha cadastrada.

**Atividades**
- [ ] Modelar `character_night_context` (ou equivalente em `game_state` + ledger) com identificador interno da noite, data ficcional opcional, origem `INDEPENDENT`, sequência/versionamento e autor.
- [ ] Criar ação explícita **Iniciar próxima noite** para o proprietário da ficha independente, sem despertar automático por relógio real.
- [ ] Reutilizar, sem misturar, a noite oficial de `chronicle_nights` para personagens vinculados e a noite própria para independentes.
- [ ] Substituir UUID digitado por um contexto selecionado/derivado no servidor. Não aceitar UUID arbitrário como autorização para cura.
- [ ] Garantir três Rouse Checks para a cura agravada, respeitar limites de Fome/torpor e **no máximo 1 ponto agravado por noite**, mesmo com concorrência/reenvio.
- [ ] Definir política segura para o primeiro registro de noite, mudança de vínculo com mesa e desfazer uma noite iniciada indevidamente; não apagar o histórico.

**Aceite:** a ficha sem mesa inicia uma noite, regenera um agravado e não consegue repetir na mesma noite; a noite seguinte libera nova ação. Histórico e estado persistem após recarregar.

### SG-004 — Rouse em Fome 5
**Objetivo:** substituir bloqueios genéricos por resolução assistida e auditável dos riscos previstos nas regras.

**Atividades**
- [ ] Definir estados de comando `PENDING_RESOLUTION`, `RESOLVED` ou equivalentes, sem conceder cura/efeito duplo.
- [ ] Executar Rouse no servidor e sinalizar consequências de falha na Fome 5; validar regras de frenesi, torpor e impedimentos de cura conforme o tipo de ação.
- [ ] Em mesa: apresentar escolha/decisão autorizada ao Narrador; na ficha independente: permitir registro explícito de decisão narrativa pelo proprietário, com indicação de que não equivale a aprovação de Narrador cadastrado.
- [ ] Proteger estados pendentes contra retries, cliques simultâneos e reenvios após decisões; armazenar resultado do dado e decisão.
- [ ] Cobrir sucesso/falha, chegada a Fome 5 durante múltiplos Rouse Checks, mudança de condições, sessão encerrada e perda de acesso.

**Aceite:** nenhuma ação é duplicada ou silenciosamente ignorada; decisão e consequência ficam auditáveis, tanto em mesa quanto em ficha independente.

## 3. P1 — Funcionalidades narrativas e experiência

### SG-005 — Seletor amigável da noite
- [ ] Remover input livre de UUID do painel de regeneração agravada.
- [ ] Em mesa, listar apenas noites oficiais elegíveis da crônica vinculada; validar seleção no servidor.
- [ ] Em ficha independente, mostrar noite ficcional atual e ação para avançar (SG-003).
- [ ] Apresentar se a cura agravada já foi utilizada e os requisitos de disponibilidade.
- [ ] Cobrir mudança de noite e recarregamento da UI.

**Aceite:** usuário nunca precisa localizar/digitar UUID de noite; não consegue forjar participação nem reutilizar noites.

### SG-006 — Alimentação entre vampiros
- [ ] Definir contrato para vampiro fonte/vítima (dois personagens existentes ou vítima narrativa externa) e vínculo de consentimento/validação pelo Narrador, se houver mesa.
- [ ] Conferir regras V5 sobre quantidade saciada, diferença de Potência de Sangue, Laço de Sangue, riscos e ferimentos na vítima; não inferir conversões a partir da alimentação humana.
- [ ] Quando dois personagens existentes forem afetados, gravar as mudanças de forma atômica ou rejeitar a operação integralmente; bloquear condições e vínculos inválidos.
- [ ] Para vítima não cadastrada, registrar evento narrativo sem inventar ou modificar uma ficha inexistente.
- [ ] Restringir acesso a informações privadas e preservar visibilidade do histórico segundo permissões de campanha.
- [ ] Integrar com o domínio temporal de Laço de Sangue, respeitando eventos anteriores e decisões narrativas.

**Aceite:** a ação produz efeitos consistentes para ator e vítima, com histórico auditável, sem duplo débito ou vazamento de ficha.

### SG-007 — Diablerie e transição de Sangue-Ralo
- [ ] Criar fluxo independente de edição comum da ficha: **declarar tentativa → resolver requisitos/rolagens e consequências → confirmar resultado → aplicar transição**.
- [ ] Conferir no Livro Básico V5 o procedimento de Diablerie, especialmente a regra de Sangue-Ralo que diableriza vampiro de sangue pleno, além de diferenças de geração, eventual clã, Humanidade, Manchas e consequências.
- [ ] Para Sangue-Ralo bem-sucedido, registrar transição para a 13ª geração, adquirir clã da vítima e Potência compatível **somente após resolução aprovada**; revalidar as regras exatas antes de codificar.
- [ ] Em mesa, exigir Narrador da própria campanha; para ficha independente, registrar explicitamente resolução conduzida fora do aplicativo pelo dono e suas consequências, sem alegar aprovação automática de Narrador.
- [ ] Preservar histórico da condição Sangue-Ralo, dados antes/depois e fonte da decisão, sem editar diretamente `potencia-de-sangue`, `geracao` ou `clanCode` por payload comum.
- [ ] Bloquear repetição idempotente, fraude de vítima, progressão fora dos limites e transição parcial após falha.

**Aceite:** Sangue-Ralo não adquire Potência maior que 0 por edição comum; somente comando de Diablerie resolvido com sucesso e registrado pode realizar a transição.

### SG-008 — Alimentação e variantes de regras
- [ ] Completar vantagens/defeitos relevantes, inclusive `Iron Gullet`, `Mortal Frailty`, e restrições de clã/predador, respeitando suplementos habilitados.
- [ ] Validar quantidade drenada e limites de cada fonte; registrar dano humano quando houver vítima representada no sistema sem alterar a vítima apenas por indicação textual.
- [ ] Expor consequências narrativas ao Narrador sem aplicar automaticamente perdas de Humanidade não determinadas pelas regras.
- [ ] Dar ao perfil de campanha precedência sobre defaults; para ficha independente adotar política explícita, documentada e estável.
- [ ] Separar eventos de alimentação, regeneração e ajustes manuais nos históricos/relatórios.

**Aceite:** o mesmo cenário no motor e na UI retorna valores idênticos, com rastreabilidade das opções aplicadas.

### SG-010 — Rolagem de poderes de Disciplinas para jogadores

**Objetivo:** permitir que jogadores executem testes relacionados aos poderes de suas Disciplinas diretamente da ficha ou do Modo Sessão, sem precisar compor manualmente a parada.

**Atividades**
- [ ] Integrar catálogo de Disciplinas e poderes já associados à ficha, mantendo o nome original em inglês e a tradução/explicação em português quando disponível.
- [ ] Exibir ação **Rolar poder** apenas para poderes efetivamente adquiridos e utilizáveis pelo personagem; validar a elegibilidade novamente no servidor, incluindo nível, pré-requisitos e condições.
- [ ] Exibir ao jogador um resumo da rolagem: poder, atributo + habilidade (ou outra fórmula prevista), quantidade de dados comuns e dados de Fome, dificuldade quando pública, custo em Rouse e modificadores conhecidos.
- [ ] Resolver a fórmula de cada poder com metadados verificáveis do catálogo; **não** aplicar uma fórmula genérica a poderes com testes diferentes, automáticos, resistidos ou que dependam de interpretação do Narrador.
- [ ] Aplicar o bônus de dados por Potência de Sangue somente às rolagens elegíveis; verificar a política Core/Companion da campanha e efeitos temporários vigentes.
- [ ] Integrar custo de Rouse, eventual rerrolagem de Rouse em Disciplinas permitidas, regras de Fome 5 e possíveis decisões assistidas, sem duplicar o custo em tentativas/reenvios.
- [ ] Respeitar sucesso, crítico, crítico bagunçado, falha bestial, teste resistido, testes secretos e custos mecânicos conforme o motor de dados vigente; separar rolagem do poder e consequências narrativas.
- [ ] Na mesa, respeitar visibilidade pública/secreta, revisão pelo Narrador quando exigida e integração ao histórico do Modo Sessão; na ficha independente, permitir execução pelo proprietário sem exigir campanha.
- [ ] Persistir pedido, resultado, dados rolados, fontes do cálculo, custo e efeito aplicado via comandos idempotentes e ledger.
- [ ] Adicionar testes unitários e de integração para poderes com fórmulas diferentes, Rouse, níveis proibidos, dados de Fome, segredo/visibilidade, autorização, concorrência e histórico.

**Aceite:** jogador pode escolher um poder adquirido e realizar a rolagem correta pelo servidor, com custos e dados de Fome calculados de forma consistente, histórico auditável e funcionamento tanto em mesa quanto em ficha independente. Poder sem fórmula mecânica verificável deve indicar uso narrativo/assistido, não inventar resultado.

### SG-011 — Trilha sonora integrada ao Modo Sessão

**Objetivo:** oferecer ambientação sonora na sessão já existente, sem recriar videoconferência, mesa ou sistema de personagens.

**Atividades**
- [ ] Avaliar fontes e licenciamento: biblioteca de áudio própria/licenciada e integrações com provedores que permitam reprodução e sincronização conforme seus termos; não presumir que um link de streaming autorize retransmissão de áudio.
- [ ] Definir opção inicial de trilhas/ambiências com permissões verificáveis, incluindo catálogo de faixas, categorias, duração, origem/licença e metadados.
- [ ] Implementar player no Modo Sessão com play/pausa, próxima faixa, fila/playlist, volume individual, mute e indicação da trilha atual; respeitar restrições de autoplay do navegador.
- [ ] Permitir ao Narrador selecionar faixas, playlists e ambientações por cena; jogadores acompanham o estado da sessão, podendo ajustar ou silenciar seu próprio volume.
- [ ] Sincronizar os comandos da trilha entre participantes da mesma sessão (incluindo quem entra atrasado e reconexão), com controle de ordem/versão e sem sincronizar volume pessoal.
- [ ] Integrar de forma compatível com o módulo de videochamada existente, evitando áudio duplicado, conflitos com voz e reproduções inesperadas após mudança de sessão.
- [ ] Usar armazenamento/streaming seguro e econômico, limites de tamanho/banda e controle de acesso; avaliar custo e impacto antes de escolher armazenamento ou provedor.
- [ ] Preservar privacidade: não expor URLs privadas ou credenciais de provedores, nem tornar playlists restritas acessíveis a outra mesa.
- [ ] Adicionar testes de autorização do Narrador, sincronização, reconexão, participante removido, restrição por sessão, autoplay, controle de volume local e fallback quando mídia/provedor estiver indisponível.
- [ ] Documentar o funcionamento em desktop/mobile, acessibilidade dos controles, fontes licenciadas e limites de integração.

**Aceite:** em uma sessão ativa, Narrador inicia/pausa uma trilha permitida e participantes autorizados recebem o estado sincronizado, com controle individual de volume e sem interferência na chamada de vídeo. Não implementar transmissão de conteúdo comercial sem autorização/licença.

## 4. P2 — Qualidade e documentação

### SG-009 — Homologação ponta a ponta
- [ ] Testar fichas de jogador em mesa, NPC vampiro e ficha independente, incluindo rascunho/transcrição.
- [ ] Testar limites de Potência 0–10, gerações 4–16, sangue-ralo e transição por Diablerie.
- [ ] Testar responsividade, acessibilidade, mensagens e estados pendentes da UI.
- [ ] Testar identidade/autorização, concorrência, transações, políticas de campanha e persistência PostgreSQL.
- [ ] Documentar referências com obra e página; usar link para página exata somente onde permitido e tecnicamente disponível.
- [ ] Validar rolagens de poderes de Disciplinas e trilha sonora com participantes reais, reconexão e permissões de sessão.
- [ ] Atualizar SPEC e CHANGELOG com resultados **efetivamente executados**.

## 5. Ordem de entrega proposta

**Entrega A — Estabilidade:** SG-001.  
**Entrega B — Ficha independente:** SG-002 + SG-003; SG-004 junto ao fluxo de Rouse.  
**Entrega C — Experiência da mesa:** SG-005.  
**Entrega D — Interações entre vampiros:** SG-006, seguida de SG-007.  
**Entrega E — Rolagens de Disciplinas:** SG-010 (integrando catálogo, Potência de Sangue e motor de dados).  
**Entrega F — Ambientação da mesa:** SG-011 (após avaliação de licenças e provedores).  
**Entrega G — Regras adicionais e homologação:** SG-008 + SG-009.

### Definição de pronto (DoD)
Cada tarefa só pode ser marcada como concluída após código integrado à `develop`, testes pertinentes executados e aprovados, controles de autorização revisados, histórico transacional verificado, documentação atualizada e eventuais limitações explicitamente registradas. Escrever um teste ou criar um componente não equivale a homologação.

## 6. Referências no código

- `lib/vtm-v5/blood-actions.ts`: motor de alimentação e regeneração.
- `lib/character-blood-actions.ts`: execução com `campaignId` e validação de noite.
- `lib/vtm-v5/blood-potency.ts`, `blood-potency-catalog.ts`: cálculo e limites.
- `components/character-summary/session-resources.tsx` e `blood-actions-panel.tsx`: ações na UI.
- `lib/character-resources.ts`: ajustes manuais, que devem continuar separados.
- `lib/chronicle-nights.ts`: noites de mesa, **não** substituir diretamente por noites independentes.
- `docs/regras/spec-autopreenchimento-potencia-sangue-vtm-v5.md`: SPEC de origem.
- Módulos existentes de catálogo de Disciplinas, motor de rolagem, Modo Sessão e videochamada: localizar contratos exatos antes de implementar SG-010 e SG-011; referências aqui são requisitos, não comprovação de funcionalidade já concluída.
