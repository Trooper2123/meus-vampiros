# SPEC-RPG-023 — Antecedentes específicos de clã e Loresheets

**Status:** proposed | **Versão:** 1.0 | **Branch:** develop
**Escopo:** catálogo + seleção + evolução + aprovação do Narrador; sem implementação de código nesta entrega.

## 1. Objetivo

Ampliar o catálogo de Vantagens/Defeitos e a ficha V5 para permitir a pesquisa e aplicação de **Backgrounds/Advantages condicionados a clã/linhagem**, **Loresheets individuais** e **Loresheets coletivas** previstas em publicações específicas. A interface seguirá o padrão de seleção **Adicionar habilidade/poder**, com busca, prévia de requisito, custo, fonte e botão **Adicionar à ficha**. A escolha nunca substitui os Antecedentes comuns; integrar tudo ao fluxo existente.

## 2. Referências verificadas nos livros do projeto

| Fonte | Referência | Regra ou conteúdo evidenciado |
|---|---|---|
| *Vampire: The Masquerade V5*, Corebook | seção Loresheet, em Backgrounds; Loresheets no apêndice a partir da p. 382 | Loresheets vinculam personagem à história; algumas `Descendant of...` exigem clã específico; cada nível é **autônomo** e deve ser comprado separadamente; Narrador decide quais são apropriadas na crônica. |
| *Anarch* | seção `Lore Sheets` (índice p. 190) | Expansão de Loresheets, sujeitos ao contexto da crônica. |
| *Camarilla* | Loresheets incluídas (ex. *Victoria Ash* indicada por referências cruzadas em material posterior) | Amplia opções e contexto de facções; conferir requisito em cada entrada. |
| *Forbidden Religions* | `Optional Advantages` | Merits, Flaws e Loresheets opcionais; após criação, justificativa narrativa e acordo com Narrador; seção cita 3 XP por ponto para aquisições previstas. |
| *Live from the Succubus Club* | Appendix II: `Loresheets`, tabela de referências p. 157 | Loresheets podem ser adaptadas à crônica; tabela aponta para fontes como *The Blue Velvet*, *The Circulatory System*, *Descendant of Helena*, *Veins of the Earth*. |
| *Sabbat: The Black Hand* | `Sabbat Packs and Loresheets` | Distingue Loresheet individual de **Pack Loresheet**, adquirida coletivamente e cujos benefícios abrangem o grupo. Não assumir que todas são próprias para qualquer crônica. |

As demais publicações anexadas (incluindo *Chicago by Night*, *Cults of the Blood Gods*, *Gehenna War*, *In Memoriam* etc.) são **candidatas a inventário**, não registros validados nesta SPEC. Catalogação só após confirmação de cada página, requisito e efeito. Não presumir que todos os conteúdos são opções de clã nem que toda Loresheet concede Background.

## 3. Terminologia e categorias

- `BACKGROUND`: Antecedente regular do V5, como Resources, Contacts, Influence, Mawla etc.
- `CLAN_RESTRICTED_ADVANTAGE`: Vantagem/Antecedente com elegibilidade documentada vinculada a clã, linhagem, descendência, seita, facção ou contexto (não é um novo tipo de regra oficial; classificação de catálogo).
- `LORESHEET`: conjunto temático de **benefícios por nível** (`LORESHEET_PERK`), não uma disciplina nem árvore de poder sequencial.
- `GROUP_LORESHEET`: variante coletiva onde o material de origem explicita propriedade do grupo (ex. Pack Loresheet); não presumir que toda Loresheet é compartilhável.
- `CUSTOM`: registro personalizado pelo Narrador, marcado como adaptação/homebrew sem atribuir origem oficial.
- `sourceRule` e `houseRule` devem ser distinguidos; mecânicas não documentadas não são fabricadas pelo sistema.

## 4. Requisitos funcionais

| ID | Prioridade | Requisito |
|---|---|---|
| RF-01 | P0 | Página/aba adicional **Antecedentes e Loresheets** na pesquisa da ficha e na biblioteca do Narrador, integrando os catálogos de Merits/Flaws já existentes. |
| RF-02 | P0 | Busca por nome canônico em inglês, tradução PT-BR, categoria, clã, linhagem, facção, livro, pontos, disponibilidade e texto curto. |
| RF-03 | P0 | Apresentar Loresheet como **grupo com opções de 1–5 pontos independentes**, quando assim for publicado; não conceder níveis inferiores por seleção de um nível alto. |
| RF-04 | P0 | Mostrar pré-requisitos específicos do item (clã, linhagem, facção, época, geração, eventos, aprovação, pré-requisitos particulares), avaliados **no servidor**. |
| RF-05 | P0 | Narrador controla fontes habilitadas pela campanha, exceções/adaptações e restrições; jogadores veem somente itens liberados e elegíveis, com motivo legível para indisponibilidade. |
| RF-06 | P0 | Botão **Adicionar à ficha** abre confirmação de nível/pontos, custo e mudança mecânica; no fluxo de jogador, respeitar permissões/necessidade de aprovação da mesa. |
| RF-07 | P0 | Em criação, consumir pontos disponíveis do orçamento de vantagens conforme regra da mesa e fonte; em evolução, usar o motor de XP existente e custos **por fonte/categoria**, sem duplicar débito. |
| RF-08 | P0 | Loresheet não sobrescreve disciplinas, antecedentes comuns ou defeitos. Benefícios que concedam outro traço devem ter efeito tipado e rastreável, sem aplicar texto livre como regra. |
| RF-09 | P0 | Preservar nome inglês canônico, rótulo PT-BR quando revisado, livro, edição, número da página impressa, página PDF quando conhecida, elegibilidade, efeito por nível e status da revisão. |
| RF-10 | P0 | As escolhas persistem com identificador estável de catálogo, nível adquirido, origem, custo aplicado, status e justificativa de exceção; alterações da fonte não modificam silenciosamente fichas existentes. |
| RF-11 | P0 | Não permitir aquisições duplicadas do mesmo benefício independente sem regra explícita de repetibilidade; permitir benefícios de níveis diferentes quando a fonte/regras da campanha autorizarem. |
| RF-12 | P1 | Suporte a Loresheets coletivas somente quando a publicação permitir, com concordância/controle do Narrador e efeito sobre a coterie, sem bônus duplicado por personagem. |
| RF-13 | P1 | Permitir cadastrar item personalizado e opcionalmente vincular a uma campanha, com revisão do Narrador e sinalização `CUSTOM`. |
| RF-14 | P1 | Disponibilizar fonte clicável somente se existir arquivo autorizado e visualizador com permissão; caso contrário citar título, edição e página. |
| RF-15 | P1 | Atualizações da Mesa indicam concessão, aprovação/rejeição, compra e revogação autorizada de benefícios, sem vazar informações secretas. |
| RF-16 | P1 | Se o traço concedido estiver temporariamente indisponível, integrar com SPEC-RPG-021 de bloqueio de recursos sem retirar a aquisição ou provocar cobrança de XP. |

## 5. Regras de negócio

### RN-01 — Níveis independentes
Cada opção de Loresheet é benefício independente. Ex.: `level=3` comprado não habilita `level=1` ou `level=2`. O catálogo pode possuir regras específicas de exclusão, dependência ou repetição, se explicitadas pela publicação.

### RN-02 — Elegibilidade por item
Não equiparar automaticamente “específico de clã” a “obrigatório para todo membro do clã”. Requisitos vêm da fonte; o Narrador pode conceder exceção com justificativa auditável se a mesa permitir. Separar `sourceEligible` de `storytellerOverride` e não modificar o catálogo global.

### RN-03 — Quantidade de Loresheets por personagem
Usar a limitação definida pelo livro/edição aplicável e configurações do Narrador; não codificar uma regra global presumida sem sua referência confirmada. Modelar `maxDistinctLoresheets` como configuração da campanha e validar exceções. Benefícios múltiplos da mesma Loresheet contam como uma Loresheet distinta.

### RN-04 — XP / pontos de criação
Custo das vantagens e Loresheets segue a fonte e o contexto da aquisição. O material *Forbidden Religions* descreve a possibilidade de compra posterior por 3 XP por ponto em sua seção de vantagens opcionais; implementar custo configurado pelo catálogo/regras da campanha, não extrapolar automaticamente a qualquer publicação. O motor de evolução existente controla autorização, XP disponível, auditoria e transação.

### RN-05 — Efeitos tipados
Para bônus que criem `Contacts`, `Mawla`, `Influence`, `Retainer` ou outro traço, registrar concessão vinculada ao benefício; evitar dois créditos pelo mesmo efeito e desfazer somente concessão rastreada. Efeitos de interpretação/contexto ficam como `NARRATIVE_ONLY` até validação de regra mecânica.

### RN-06 — Origem e visibilidade
Itens globais aprovados têm fonte bibliográfica precisa. Itens homebrew têm autor e origem distinta. O Narrador controla quais alternativas são visíveis; informações secretas relacionadas a personagem e campanha nunca vão para payload público.

### RN-07 — Mudança de clã/facção
Ao perder requisito, não remover automaticamente XP ou benefício adquirido. Sinalizar conflito de elegibilidade para revisão narrativa do Narrador; decidir manutenção/suspensão/revogação de acordo com texto da fonte e política da mesa.

## 6. Fluxos

1. **Criar/evoluir personagem** → `Vantagens & Antecedentes` → `Pesquisar Loresheets` → filtrar por clã/livro → ver detalhes e fonte → **Adicionar à ficha** → validar custo/requisitos → confirmar → registrar aquisição.
2. **Narrador** → `Catálogo da Mesa` → habilita fontes/itens, determina exceções e aprova solicitações; pode criar itens personalizados.
3. **Coterie/Pack** → selecionar Loresheet coletiva quando elegível → registrar consentimento e atribuir ao grupo → benefícios sem duplicação pessoal.

## 7. Aceite

- [ ] Um nível alto da Loresheet é comprado sem conceder os inferiores.
- [ ] Ficha incompatível com restrição explícita de clã recebe bloqueio server-side, salvo override autorizado e auditado.
- [ ] Fonte desabilitada na mesa não aparece como opção selecionável para jogadores.
- [ ] XP e pontos de criação são cobrados uma vez, sem saldo negativo nem efeito duplicado em requisições concorrentes.
- [ ] A seleção persiste em edição e evolução, incluindo origem, página e versão do catálogo.
- [ ] Loresheet com benefício coletivo não replica créditos individuais.
- [ ] Efeito narrativo sem mecânica verificável não concede ponto automaticamente.
- [ ] Fonte em inglês e tradução PT-BR aparecem sem alterar nomes canônicos.
- [ ] 401/403, IDOR/BOLA, revisão de privacidade e parâmetros maliciosos são cobertos por testes.
- [ ] Cadastro personalizado não substitui nem contamina entradas oficiais.
- [ ] Integração com bloqueios temporários não remove aquisição nem duplica custos.

## 8. Fora de escopo

Extração automática integral do texto/arte dos livros; distribuição pública de PDFs; invenção de efeitos não descritos; implementação de nova árvore de disciplinas; criação de sistema novo de XP ou de campanhas; migração de dados legados, já que o projeto está em fase de testes.

## 9. Direitos de conteúdo

Catálogo público de metadados e resumos originais curtos, quando permitido. Textos extensos, ilustrações e reproduções das Loresheets dos livros exigem verificação de autorização/licença; PDFs privados não devem ser expostos por URL pública. A importação/curadoria deve incluir revisão humana e marcador de fonte, sem tratar tradução como licença de redistribuição.
