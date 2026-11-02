# SPEC-SESSION-011 — Projetos dos Jogadores e Coterie

## 1. Objetivo

Adicionar à Gestão da Mesa dois módulos integrados, porém conceitualmente distintos:

- **Projetos (Projects):** planos de médio/longo prazo iniciados pelos personagens, individualmente ou em grupo, seguindo o sistema de *Projects* do Appendix II do Corebook V5.
- **Coterie:** representação persistente do grupo vampírico da campanha, incluindo membros, tipo, domínio, recursos compartilhados, objetivos e características coletivas.

Projetos não são Missões do Narrador.

| Conceito | Origem | Controle | Função |
|---|---|---|---|
| Projeto | Jogador/Coterie | Jogador + Narrador | Alterar o mundo ou conquistar algo a longo prazo |
| Coterie | Grupo | Grupo + Narrador | Representar a estrutura coletiva dos personagens |
| Missão | Narrador | Narrador | Objetivo narrativo proposto pela crônica |

## 2. Projetos

Projects representam esquemas/subtramas de longo prazo. O objetivo narrativo deve ser convertido em consequência mecânica, normalmente pontos em Background ou outro Trait.

### 2.1 Tipos

```text
PERSONAL
COTERIE
```

- **PERSONAL:** pertence a um personagem.
- **COTERIE:** pertence ao grupo e pode utilizar recursos compartilhados.

O sistema deve admitir cooperação no Launch Roll, inclusive via Coterie Background/Teamwork, compartilhando riscos entre participantes.

## 3. Criação de Projeto

Fluxo:

```text
Novo Projeto
  → Objetivo narrativo
  → Resultado mecânico
  → Scope
  → Increment
  → Launch Roll
  → Stake
  → Projeto ativo
```

Dados iniciais:

- nome;
- descrição;
- objetivo narrativo;
- pessoal ou Coterie;
- participantes;
- resultado pretendido.

O Narrador valida a representação mecânica antes do lançamento.

## 4. Scope

O número de pontos que o projeto pretende adicionar ao ser concluído corresponde ao **Scope**.

Exemplo: Influence atual •, objetivo Influence ••• → Scope 2.

Persistir:

```text
scope
target_trait
target_current_dots
target_final_dots
```

O Narrador pode ajustar o Scope antes de aprovar o lançamento.

## 5. Increment

Jogador e Narrador definem a unidade temporal. Um incremento deve representar aproximadamente um décimo da duração provável do projeto.

Projetos com duração inferior a dez dias devem normalmente ser tratados como testes estendidos, não Projects.

```text
increment_unit
increment_value
```

Exemplos: 1 WEEK, 1 MONTH, 6 MONTHS, 1 YEAR.

## 6. Launch Roll

O Narrador determina o pool, normalmente **Skill + Background**.

Dificuldade:

```text
Scope + 2
```

Normalmente não são permitidos Willpower ou Blood Surge. Disciplinas podem ser autorizadas pelo Narrador quando apropriado.

### Resultado

- **Critical Win:** inicia sem necessidade de comprometer pontos atuais.
- **Win:** Stake = Scope + 1 - margem de sucesso, mínimo normal de 1 dot.
- **Failure:** nova tentativa com dificuldade +1.
- **Total Failure:** pode criar/fortalecer inimigos e causar perdas de Backgrounds, a critério do Narrador.

## 7. Stake

Dots comprometidos ficam indisponíveis até o projeto terminar.

Projetos coletivos podem comprometer recursos de vários participantes ou Backgrounds da Coterie.

```text
project_stakes
- id
- project_id
- character_id nullable
- coterie_id nullable
- trait
- dots
- created_at
```

## 8. Project Die

Após lançamento bem-sucedido:

```text
Project Die = 10
```

A cada Increment:

```text
10 → 9 → 8 → ... → 1
```

O valor deve ser persistido como regra mecânica real, não apenas porcentagem visual.

## 9. Goal Roll

O jogador pode tentar concluir antecipadamente.

O Narrador determina o pool. O teste é um conflito contra o valor atual do Project Die.

Normalmente não são permitidos Willpower, Blood Surge ou Disciplines. Os 10 do jogador não formam críticos no Goal Roll; críticos da oposição continuam relevantes.

Vitória reduz o Project Die pela margem. Se cair abaixo de 1, o projeto termina com sucesso.

Derrota pode causar perda de Background dots, começando pelo Stake. Se o Stake chegar a zero, o projeto normalmente colapsa, ressalvadas exceções previstas pelas regras.

## 10. Projetos adversários

Arquitetura preparada para proprietários:

```text
PLAYER
COTERIE
NPC
FACTION
```

Primeira entrega:

```text
PLAYER
COTERIE
```

Evolução futura deve permitir detectar, interferir, atrasar, saquear ou sequestrar projetos adversários.

## 11. Status

```text
DRAFT
AWAITING_APPROVAL
ACTIVE
SUCCESS
FAILED
ABANDONED
```

Jogador pode criar, editar DRAFT, submeter, acompanhar, solicitar Goal Roll e abandonar.

Narrador pode aprovar, ajustar Scope, definir Increment/pools, resolver rolls, registrar consequências e encerrar.

## 12. Modelo de dados — Projects

```text
character_projects
- id
- campaign_id
- owner_character_id nullable
- coterie_id nullable
- name
- description
- project_type
- status
- goal_description
- target_trait
- target_current_dots
- target_final_dots
- scope
- increment_unit
- increment_value
- project_die
- launch_pool
- launch_difficulty
- launch_result
- created_at
- launched_at
- completed_at
- updated_at
```

Histórico:

```text
project_events
- id
- project_id
- type
- previous_project_die
- new_project_die
- description
- actor_id
- created_at
```

Eventos: CREATED, SUBMITTED, APPROVED, LAUNCHED, INCREMENT, GOAL_ROLL, INTERFERENCE, STAKE_LOST, COMPLETED, FAILED, ABANDONED.

## 13. Coterie

A Coterie é entidade própria da campanha.

A ficha deve suportar:

- Coterie Name;
- Coterie Type;
- Chronicle;
- City;
- Members;
- Domain;
- Chasse;
- Lien;
- Portillon;
- Domain Merits;
- Domain Resonance;
- Coterie Advantages & Flaws;
- Coterie Boons & Debts;
- Haven or Hangout;
- Haven Merits & Flaws;
- Chronicle Tenets;
- Coterie Goals.

## 14. Relação com Campaign

```text
Campaign
  ↓
Coterie
  ↓
Characters
```

Na UI inicial, trabalhar com uma Coterie principal, mas o banco deve permitir **1 Campaign → N Coteries**.

## 15. Membros

```text
coterie_members
- id
- coterie_id
- character_id
- role nullable
- joined_at
- left_at nullable
```

Somente personagens pertencentes à campanha podem integrar sua Coterie. O Narrador administra a associação.

## 16. Tipo de Coterie

Não usar enum rígido. Os livros possuem múltiplos tipos e suplementos podem adicionar outros.

```text
coterie_type_catalog
- id
- code
- name
- source
- description
- active
```

O catálogo deve suportar tipos do Corebook e suplementos, incluindo configurações mecânicas recomendadas.

## 17. Domain

Domain é opcional.

```text
has_domain BOOLEAN
description
chasse
lien
portillon
domain_resonance
```

### Chasse

Representa qualidade do território de caça e, abstratamente, sua dimensão. Um ponto fornece dificuldade padrão de caça 6; cada ponto adicional reduz a dificuldade em 1.

### Lien

Representa integração com o domínio. Adiciona dados a ações apropriadas de interação, busca de informações/investigação no Domain. Não modifica hunting rolls.

### Portillon

Representa segurança contra intrusão/investigação. Seus pontos funcionam principalmente como resistência contra invasores.

Coteries sem Domain devem ser suportadas, inclusive modelos itinerantes.

## 18. Backgrounds compartilhados

Suportar Backgrounds coletivos como:

- Adversary;
- Ally;
- Contacts;
- Enemy;
- Haven;
- Herd;
- Influence;
- Mask;
- Mawla;
- Resources;
- Retainers;
- Status.

```text
coterie_backgrounds
- id
- coterie_id
- background_code
- dots
- description
- source
```

O Background pertence à Coterie. Um personagem que deixa a Coterie não o leva consigo.

## 19. Advantages e Flaws

Integrar ao catálogo existente, mantendo catálogo + customização.

```text
coterie_advantages
- id
- coterie_id
- catalog_item_id nullable
- custom_name nullable
- dots
- kind
- notes
```

## 20. Haven / Hangout

```text
coterie_havens
- id
- coterie_id
- name
- description
- location
- is_primary
```

Criar associação própria para Haven Merits/Flaws.

## 21. Boons & Debts

```text
coterie_boonds_debts
- id
- coterie_id
- type
- counterparty
- level
- description
- status
```

Tipos iniciais:

```text
BOON_OWED_TO_COTERIE
BOON_OWED_BY_COTERIE
DEBT
```

## 22. Coterie Goals

Goals da Coterie são objetivos narrativos e **não são automaticamente Projects**.

A UI deve oferecer:

```text
Transformar em Projeto
```

que cria um Project com:

```text
project_type = COTERIE
coterie_id = ...
```

## 23. Integração Coterie → Projects

```text
Coterie
  ├── Goals
  └── Projects
       ├── Scope
       ├── Stake
       ├── Project Die
       └── Goal Rolls
```

Backgrounds compartilhados podem participar de Projects quando as regras permitirem.

## 24. Permissões

### Jogador

- visualizar Coterie, membros e recursos compartilhados;
- criar projetos próprios;
- propor projetos coletivos;
- acompanhar Projects;
- solicitar Goal Roll.

### Narrador

- editar Coterie, Domain e recursos;
- aprovar Projects;
- definir Scope, Increment e pools;
- resolver consequências;
- administrar Stake;
- manter notas privadas.

Informações privadas do Narrador nunca devem ser enviadas no payload do jogador.

## 25. UI — Gestão da Mesa

Adicionar ao menu lateral:

```text
Projetos
Cotterie
```

### Projetos

Exibir contadores de Ativos, Aguardando e Concluídos e cards contendo proprietário, Scope, Project Die e próximo Increment.

### Cotterie

Exibir nome, tipo, membros, Domain (Chasse/Lien/Portillon), Backgrounds, Haven, Goals e Boons/Debts.

**Regra do projeto:** antes da implementação de novo layout dessas páginas, apresentar mockup/imagem da UI para aprovação.

## 26. Critérios de aceite

- [ ] Projetos pessoais e coletivos são distintos.
- [ ] Projects não são confundidos com Missões.
- [ ] Scope segue a mecânica V5.
- [ ] Launch Difficulty = Scope + 2.
- [ ] Stake bloqueia dots comprometidos.
- [ ] Project Die inicia em 10 após lançamento bem-sucedido.
- [ ] Increment reduz Project Die.
- [ ] Goal Roll usa Project Die como oposição.
- [ ] Histórico preserva alterações mecânicas.
- [ ] Coterie possui membros próprios.
- [ ] Tipo vem de catálogo expansível.
- [ ] Domain é opcional.
- [ ] Chasse, Lien e Portillon são persistidos separadamente.
- [ ] Backgrounds são coletivos.
- [ ] Coterie possui Advantages/Flaws.
- [ ] Haven/Hangout é representável.
- [ ] Boons/Debts são representáveis.
- [ ] Coterie Goals são distintos de Projects.
- [ ] Goal pode originar Project coletivo.
- [ ] Narrador controla aprovação e resolução mecânica.
- [ ] Dados privados do Narrador não chegam ao jogador.
- [ ] Novo layout só é implementado após aprovação visual.

## 27. Referências de regras

- *Vampire: The Masquerade V5 Corebook*, Appendix II: Projects, pp. 417–419.
- *Vampire: The Masquerade V5 Corebook*, regras de Coterie/Domain, Chasse, Lien, Portillon e Backgrounds compartilhados.
- *In Memoriam*, Coterie Sheet.
- *Live from the Succubus Club*, regras para Coteries itinerantes e substituição de Domain Traits por Backgrounds compartilhados.
- *Cults of the Blood Gods*, tipos adicionais de Coterie.

A implementação deve preservar a terminologia mecânica original em inglês quando ela identifica elementos de regra (Projects, Scope, Increment, Launch Roll, Stake, Project Die, Goal Roll, Chasse, Lien e Portillon), oferecendo tradução/explicação em PT-BR na interface quando útil.
