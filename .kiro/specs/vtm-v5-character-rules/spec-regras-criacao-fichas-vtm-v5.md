# Spec - Regras de Criacao de Fichas VtM V5

## 1. Objetivo

Implementar no app de RPG um conjunto de regras para criacao, validacao e manutencao de fichas baseadas em Vampiro: A Mascara V5, cobrindo:

- personagens vampiros jogaveis;
- NPCs humanos;
- NPCs vampiros;
- lacaios/carniçais.

O sistema deve separar regras mecanicas de narrativa, permitindo que o Mestre aprove excecoes, presets de cronica e conteudo opcional.

## 2. Fontes e Escopo de Regras

Fontes usadas como base:

- Corebook V5: criacao de personagens, atributos, habilidades, vantagens, falhas, predadores, humanidade, potencia de sangue, retentores, carniçais e antagonistas.
- Players Guide: opcoes adicionais para meritos, falhas, poderes e suporte a carniçais.
- Storytellers Toolkit: apoio a NPCs, papeis narrativos e cenas.
- Quickstart: referencia simplificada de regras e estrutura de ficha.

Fora do escopo desta spec:

- rolagem completa de dados em jogo;
- combate completo;
- progressao por XP detalhada alem da criacao inicial;
- regras de clãs/livros nao presentes nas fontes carregadas;
- ficha visual PDF oficial.

## 3. Glossario de Dominio

| Termo | Uso no sistema |
| --- | --- |
| Personagem | Entidade principal controlavel ou nao controlavel. |
| Vampiro jogavel | Personagem criado por jogador, com criacao completa. |
| NPC | Personagem nao controlado por jogador, criado pelo Mestre. |
| NPC humano | Mortal comum, mortal competente, antagonista ou aliado. |
| NPC vampiro | Vampiro simplificado ou completo controlado pelo Mestre. |
| Lacaio | Mortal servido/controlado por vampiro, podendo ser carniçal/ghoul. |
| Carniçal/Ghoul | Mortal que bebeu vitae vampirica e ganhou efeitos sobrenaturais temporarios. |
| Retentor | Servo, assistente, guarda ou seguidor associado a uma ficha. Pode ser humano comum ou carniçal. |
| Domitor/Regente | Vampiro ao qual o carniçal esta vinculado. |
| Mascara | Identidade mortal/cobertura social do vampiro. |
| Touchstone | Mortal vinculado a uma Conviccao do vampiro. |
| Predator Type | Metodo habitual de caca do vampiro, com ajustes mecanicos. |

## 4. Modelo de Dados Comum

### 4.1 Entidade `Character`

Campos obrigatorios:

| Campo | Tipo | Regra |
| --- | --- | --- |
| `id` | UUID | Gerado pelo sistema. |
| `campaign_id` | UUID | Obrigatorio. |
| `owner_user_id` | UUID nullable | Obrigatorio para personagem jogavel; opcional para NPC. |
| `created_by_user_id` | UUID | Usuario que criou. |
| `character_type` | enum | `PLAYER_VAMPIRE`, `HUMAN_NPC`, `VAMPIRE_NPC`, `RETAINER`. |
| `name` | string | Obrigatorio. |
| `status` | enum | `DRAFT`, `PENDING_REVIEW`, `APPROVED`, `ARCHIVED`, `DISABLED`. |
| `visibility` | enum | `PLAYER_VISIBLE`, `ST_ONLY`, `PARTIAL`. |
| `created_at` | timestamp | Automatico. |
| `updated_at` | timestamp | Automatico. |

Campos narrativos comuns:

| Campo | Tipo |
| --- | --- |
| `concept` | string |
| `chronicle_role` | string |
| `description` | text |
| `public_notes` | text |
| `private_notes` | text |
| `relationship_map_notes` | text |

### 4.2 Traits Comuns

#### Atributos

| Grupo | Atributos |
| --- | --- |
| Fisicos | `strength`, `dexterity`, `stamina` |
| Sociais | `charisma`, `manipulation`, `composure` |
| Mentais | `intelligence`, `wits`, `resolve` |

Valores:

- minimo padrao: 1;
- maximo humano padrao: 5;
- NPCs simplificados podem usar pools em vez de atributos individuais.

#### Habilidades

Categorias:

- Fisicas: Athletics, Brawl, Craft, Drive, Firearms, Larceny, Melee, Stealth, Survival.
- Sociais: Animal Ken, Etiquette, Insight, Intimidation, Leadership, Performance, Persuasion, Streetwise, Subterfuge.
- Mentais: Academics, Awareness, Finance, Investigation, Medicine, Occult, Politics, Science, Technology.

Valores:

- minimo: 0;
- maximo padrao: 5;
- especialidades podem existir em habilidades com pelo menos 1 ponto, exceto especialidades concedidas por regra especifica.

### 4.3 Atributos Secundarios

| Campo | Formula base |
| --- | --- |
| `health` | `stamina + 3` para vampiros e humanos completos. |
| `willpower` | `resolve + composure`. |
| `humanity` | Vampiros iniciam normalmente em 7; excecoes dependem de idade, predador e decisao do Mestre. |
| `hunger` | Vampiros usam trilha de fome; humanos comuns nao usam. |
| `blood_potency` | Depende de geracao/idade; thin-blood normalmente 0. |

O backend deve armazenar o valor calculado e a origem:

```json
{
  "health": {
    "value": 6,
    "formula": "stamina + 3",
    "overridden": false
  }
}
```

## 5. Spec A - Criacao de Ficha de Vampiro Jogavel

### 5.1 Objetivo

Permitir criacao guiada de vampiros jogaveis V5 com validacoes mecanicas e espaco para aprovacao narrativa do Mestre.

### 5.2 Fluxo de Criacao

1. Selecionar campanha.
2. Definir conceito, nome, ambicao, desejo inicial e vida mortal.
3. Selecionar tipo de criacao:
   - childe/fledgling;
   - neonate;
   - ancilla;
   - thin-blood.
4. Selecionar clã ou Caitiff/thin-blood.
5. Distribuir atributos.
6. Distribuir habilidades.
7. Definir conviccoes e touchstones.
8. Definir abraco, sire, mascara e relacoes.
9. Calcular humanidade inicial.
10. Selecionar disciplinas iniciais.
11. Selecionar tipo de predador, quando aplicavel.
12. Selecionar vantagens e falhas.
13. Selecionar loresheet, se permitido pela cronica.
14. Aplicar ajustes de idade/experiencia inicial.
15. Validar ficha.
16. Enviar para aprovacao do Mestre.

### 5.3 Regras de Atributos

Distribuicao padrao:

| Faixa | Quantidade |
| --- | ---: |
| Melhor atributo | 1 atributo com 4 pontos |
| Bons atributos | 3 atributos com 3 pontos |
| Medios atributos | 4 atributos com 2 pontos |
| Pior atributo | 1 atributo com 1 ponto |

Validacoes:

- Deve haver exatamente 9 atributos preenchidos.
- Nenhum atributo pode ser 0 na criacao completa.
- A distribuicao deve bater exatamente com `4, 3, 3, 3, 2, 2, 2, 2, 1`, salvo override do Mestre.

### 5.4 Regras de Habilidades

O sistema deve suportar dois modos.

#### Modo detalhado

- Profissao: 2 habilidades com 3 pontos e 2 habilidades com 2 pontos.
- Eventos de vida: 1 habilidade com 3 pontos e 1 habilidade com 2 pontos.
- Lazer: 3 habilidades com 1 ponto.
- Extras:
  - especialista: 1 habilidade adicional com 4 pontos; ou
  - generalista: 2 habilidades adicionais com 2 pontos e 4 habilidades adicionais com 1 ponto.

#### Modo rapido

| Perfil | Distribuicao |
| --- | --- |
| Jack of all trades | 1 habilidade 3, 8 habilidades 2, 10 habilidades 1 |
| Balanced | 3 habilidades 3, 5 habilidades 2, 7 habilidades 1 |
| Specialist | 1 habilidade 4, 3 habilidades 3, 3 habilidades 2, 3 habilidades 1 |

Validacoes:

- Habilidades nao podem ultrapassar 5 na criacao.
- Especialidades gratuitas devem ser concedidas ao adquirir primeiro ponto em Academics, Craft, Performance ou Science.
- Especialidades de predador seguem regra propria.

### 5.5 Conviccoes e Touchstones

Regras:

- O personagem deve ter de 1 a 3 conviccoes.
- Cada conviccao deve ter exatamente 1 touchstone mortal associado.
- Touchstone deve ser entidade relacional com nome, descricao, tipo de vinculo, status e visibilidade.

Campos de `Conviction`:

| Campo | Tipo |
| --- | --- |
| `id` | UUID |
| `character_id` | UUID |
| `text` | string |
| `touchstone_id` | UUID |

Campos de `Touchstone`:

| Campo | Tipo |
| --- | --- |
| `name` | string |
| `relationship` | string |
| `description` | text |
| `status` | `ALIVE`, `MISSING`, `DEAD`, `UNKNOWN` |

### 5.6 Clã, Caitiff e Thin-Blood

Campos:

| Campo | Tipo |
| --- | --- |
| `clan` | enum nullable |
| `is_caitiff` | boolean |
| `is_thin_blood` | boolean |
| `generation` | integer nullable |
| `sire_name` | string nullable |
| `clan_bane_notes` | text |

Validacoes:

- `is_caitiff` e `clan` nao podem coexistir.
- `is_thin_blood = true` deve aplicar regras proprias de thin-blood.
- Thin-blood nao deve selecionar predator type automaticamente se a campanha tratar o personagem como recem-criado.
- Thin-blood nao deve comprar Bonding, Mawla, Retainers ou Status na criacao, exceto como background compartilhado de coterie aprovado.

### 5.7 Potencia de Sangue

Regra inicial sugerida:

| Geracao | Blood Potency inicial |
| --- | ---: |
| 14a, 15a, 16a | 0 |
| 12a, 13a | 1 |
| 10a, 11a | 2 |

Validacoes:

- Blood Potency deve ser compativel com geracao.
- Ancilla recebe ajuste adicional conforme regra de idade.

### 5.8 Humanidade

Regra padrao:

- humanidade inicial: 7.
- cronica de fledglings pode permitir humanidade 8.
- predador e idade podem modificar o valor.
- humanidade 0 torna personagem nao jogavel.

### 5.9 Disciplinas Iniciais

Regra padrao para vampiro de clã:

- escolher 2 disciplinas associadas ao clã;
- uma recebe 2 pontos;
- outra recebe 1 ponto;
- escolher 1 poder para cada ponto.

Regra Caitiff:

- escolher quaisquer 2 disciplinas;
- uma recebe 2 pontos;
- outra recebe 1 ponto.

Regra Thin-Blood:

- nao usa disciplinas normais de forma confiavel;
- deve suportar Thin-Blood Alchemy e meritos/falhas proprios.

Validacoes:

- Cada ponto de disciplina deve ter um poder escolhido.
- Poder de nivel N exige disciplina com pelo menos N pontos.
- Amalgamas devem validar pre-requisitos quando implementadas.

### 5.10 Tipo de Predador

Aplicar somente quando o personagem ja possui um metodo estabelecido de caca.

Campos:

| Campo | Tipo |
| --- | --- |
| `predator_type` | enum |
| `specialty_granted` | string |
| `discipline_dot_granted` | string |
| `advantages_granted` | json |
| `flaws_granted` | json |
| `humanity_modifier` | integer |
| `blood_potency_modifier` | integer |

Predadores base a suportar:

- Alleycat;
- Bagger;
- Blood Leech;
- Cleaver;
- Consensualist;
- Farmer;
- Osiris;
- Sandman;
- Scene Queen;
- Siren.

Validacoes de exemplo:

- Bagger nao permitido para Ventrue.
- Farmer nao permitido para Ventrue e nao permitido se Blood Potency for 3 ou maior.
- Se o predador concede especialidade em habilidade sem pontos, conceder 1 ponto na habilidade em vez da especialidade.
- Ajustes de humanidade, vantagens e falhas devem ser aplicados automaticamente.

### 5.11 Vantagens e Falhas

Regra padrao:

- ate 7 pontos de vantagens;
- minimo 2 pontos de falhas ao final da criacao;
- vantagens/falhas concedidas por predator type contam conforme configuracao da campanha.

Categorias:

- Merits;
- Backgrounds;
- Flaws;
- Thin-Blood Merits;
- Thin-Blood Flaws;
- Loresheets.

Validacoes:

- O sistema deve permitir que o Mestre marque uma vantagem como `restricted`.
- Loresheets devem ser habilitadas por campanha.
- Falhas obrigatorias de clã/tipo devem ser aplicadas automaticamente.

### 5.12 Idade e Experiencia Inicial

| Tipo | Regra |
| --- | --- |
| Fledgling/childe | Sem XP adicional padrao. |
| Neonate | Recebe 15 XP iniciais. |
| Ancilla | Recebe 35 XP iniciais, +1 Blood Potency, +2 pontos de vantagens, +2 pontos de falhas e -1 humanidade. |

Validacoes:

- XP inicial deve ser rastreado em ledger.
- Ajustes automáticos devem gerar registros auditaveis.

### 5.13 Estados da Ficha

| Status | Quem pode editar | Regra |
| --- | --- | --- |
| `DRAFT` | Jogador e Mestre | Livre. |
| `PENDING_REVIEW` | Mestre | Jogador nao altera mecanica sem retirar submissao. |
| `APPROVED` | Mestre; jogador em campos permitidos | Alteracoes mecanicas criam revisao. |
| `ARCHIVED` | Mestre | Somente leitura. |
| `DISABLED` | Mestre/admin | Oculta de jogo ativo. |

### 5.14 Criterios de Aceite

- Dado um vampiro padrao, quando distribuir atributos fora do padrao, o sistema bloqueia envio para aprovacao.
- Dado um predator type com falha obrigatoria, quando selecionado, a falha aparece automaticamente.
- Dado um personagem com 2 conviccoes e 1 touchstone, quando validar, o sistema informa que cada conviccao exige touchstone proprio.
- Dado um thin-blood, quando tentar comprar Retainers diretamente, o sistema bloqueia salvo override do Mestre.
- Dado um ancilla, quando criado, o sistema aplica XP, Blood Potency, vantagens, falhas e humanidade conforme regra.

## 6. Spec B - Criacao de NPCs Humanos

### 6.1 Objetivo

Permitir que o Mestre crie humanos rapidamente, variando entre ficha simplificada, ficha por template e ficha completa.

### 6.2 Modos de Criacao

| Modo | Uso |
| --- | --- |
| Simples por dificuldade | Figurantes e ameacas rapidas. |
| Template mortal | Policiais, gangsters, clero, inquisidores, especialistas. |
| Completo | Aliados importantes, antagonistas recorrentes e touchstones. |

### 6.3 NPC Humano Simples

Campos:

| Campo | Tipo |
| --- | --- |
| `name` | string |
| `role` | string |
| `difficulty` | integer 1-5 |
| `damage_modifier` | integer |
| `notes` | text |

Regra:

- Para conflitos simples, o NPC pode ser representado por dificuldade.
- Se for necessario rolar pool, pool sugerido = `difficulty * 2`.
- Opcional: rolar 1 dado para chance de critico narrativo; em 10, adicionar +2 na dificuldade do teste.

### 6.4 PNC Humano por Pools

Campos:

| Campo | Tipo |
| --- | --- |
| `physical_pool` | integer |
| `social_pool` | integer |
| `mental_pool` | integer |
| `health` | integer |
| `willpower` | integer |
| `exceptional_pools` | json |
| `special_rules` | json |

Templates iniciais sugeridos:

| Template | Physical | Social | Mental | Health | Willpower | Excecoes |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Policial investigativo | 4 | 3 | 4 | 6 | 5 | Firearms 5, Investigation 6, Streetwise 5 |
| Gangster | 4 | 3 | 3 | 6 | 4 | Brawl 5, Firearms 5, Intimidation 5, Larceny 5, Streetwise 7 |
| Clero | 3 | 5 | 4 | 5 | 7 | Academics 6, Insight 7, Occult 5, Leadership 6 |
| Cacador de fe | 4 | 4 | 5 | 6 | 8 | Awareness 7, Investigation 7, Occult 8 |
| Inquisidor investigador | 5 | 4 | 5 | 7 | 7 | Awareness 7, Investigation 7, Firearms 6 |
| Inquisidor Delta | 6 | 4 | 4 | 8 | 7 | Firearms 9, Brawl 8, Melee 8, uma pericia 9 |

### 6.5 PNC Humano Completo

Usar os mesmos atributos e habilidades de personagem completo, mas sem:

- clã;
- fome;
- disciplinas vampiricas;
- humanidade como trilha vampirica, salvo se usada como marcador narrativo;
- predator type.

Campos adicionais:

| Campo | Tipo |
| --- | --- |
| `mortal_status` | `UNAWARE`, `SUSPICIOUS`, `AWARE_OF_SUPERNATURAL`, `HUNTER`, `CULTIST`, `SERVANT` |
| `resonance` | enum nullable |
| `knows_masquerade` | boolean |
| `true_faith_rating` | integer nullable |
| `organization` | string nullable |

### 6.6 Criterios de Aceite

- O Mestre consegue criar um PNC humano em menos de 1 minuto usando template.
- Um PNC simples pode ser usado em rolagem sem atributos detalhados.
- Um PNC recorrente pode ser promovido de simples para completo mantendo `id`.
- PNCs com `true_faith_rating` exibem aviso de regra especial.

## 7. Spec C - Criacao de PNCs Vampiros

### 7.1 Objetivo

Permitir que o Mestre crie vampiros nao jogaveis com nivel de detalhe adequado ao papel narrativo.

### 7.2 Modos de Criacao

| Modo | Uso |
| --- | --- |
| Vampiro simples | Aparicao rapida, inimigo menor, contato. |
| Vampiro por arquétipo | Neonate rival, ancilla, sheriff, primogen, sire. |
| Vampiro completo | Antagonista central ou aliado recorrente. |

### 7.3 Vampiro Simples

Campos:

| Campo | Tipo |
| --- | --- |
| `name` | string |
| `clan` | enum nullable |
| `sect` | enum nullable |
| `generation` | integer nullable |
| `blood_potency` | integer |
| `humanity` | integer |
| `physical_pool` | integer |
| `social_pool` | integer |
| `mental_pool` | integer |
| `discipline_summary` | json |
| `bane_notes` | text |
| `compulsion_notes` | text |

### 7.4 Arquetipos Iniciais

| Arquetipo | Uso | Sugestao mecanica |
| --- | --- | --- |
| Fledgling | Recem-abraçado | BP 1 ou 0 se thin-blood, poucas disciplinas, humanidade alta. |
| Neonate | Vampiro comum de jogo | BP 1, 3 pontos iniciais de disciplinas ou mais por XP narrativo. |
| Ancilla | Vampiro experiente | BP 2+, disciplinas mais fortes, status e contatos. |
| Elder | Ameaça rara | BP alto, disciplinas amplas, uso restrito por campanha. |
| Sheriff/Scourge | Enforcer | Pools fisicos altos, combate e intimidação. |
| Harpy | Poder social | Pools sociais altos, status, contatos e etiqueta. |
| Sire | Vínculo narrativo | Configuravel por relação com personagem. |

### 7.5 Regras

- PNC vampiro pode usar criacao completa ou pools simplificados.
- Se completo, seguir spec de vampiro jogavel, mas sem obrigatoriedade de predator type, touchstones ou distribuicao exata, caso o Mestre use override.
- Todo PNC vampiro deve ter pelo menos:
  - clã, Caitiff ou thin-blood;
  - humanidade ou trilha equivalente definida pela mesa;
  - Blood Potency;
  - notas de bane/compulsion;
  - relacao com campanha.

### 7.6 Segredos e Visibilidade

Campos com controle de visibilidade:

| Campo | Visibilidade padrao |
| --- | --- |
| Clã | Mestre apenas, salvo conhecido pelos jogadores. |
| Geração | Mestre apenas. |
| Blood Potency | Mestre apenas. |
| Disciplinas | Mestre apenas. |
| Status publico | Jogadores podem ver. |
| Boons/dividas | Mestre apenas ou parcial. |

### 7.7 Criterios de Aceite

- O Mestre consegue criar um vampiro rival por arquétipo sem preencher ficha completa.
- O sistema permite transformar PNC vampiro simples em completo.
- Campos secretos nao aparecem para jogadores.
- PNC vampiro com clã definido carrega bane/disciplinas sugeridas.

## 8. Spec D - Criacao de Lacaios e Carniçais

### 8.1 Objetivo

Modelar servos, retentores, lacaios e carniçais vinculados a vampiros ou faccoes.

### 8.2 Tipos

| Tipo | Descricao |
| --- | --- |
| Lacaio comum | Humano servo sem vitae ativa. |
| Retentor | Servo mecanicamente comprado como vantagem. |
| Carniçal/Ghoul | Mortal que bebe vitae vampirica e ganha efeitos sobrenaturais. |
| Thrall vinculado | Servo sob Blood Bond. |
| Lacaio organizacional | Grupo ou ativo, nao individuo unico. |

### 8.3 Campos

| Campo | Tipo |
| --- | --- |
| `retainer_type` | enum |
| `domitor_character_id` | UUID nullable |
| `bond_strength` | integer nullable |
| `last_vitae_date` | date nullable |
| `is_ghoul` | boolean |
| `discipline_id` | UUID nullable |
| `discipline_level` | integer nullable |
| `loyalty_model` | enum |
| `control_method` | enum |
| `maintenance_notes` | text |

Enums:

```text
retainer_type = COMMON_SERVANT | RETAINER | GHOUL | BLOOD_BOUND_THRALL | ORGANIZATIONAL_ASSET
loyalty_model = PAID | BLOOD_BOUND | DOMINATED | PRESENCE_SWAYED | IDEOLOGICAL | BLACKMAILED | PERSONAL_LOYALTY
control_method = SALARY | VITAE | DISCIPLINE | BOON | FEAR | LOVE | CULT | OTHER
```

### 8.4 Regras de Retentor

Quando comprado como vantagem:

| Pontos | Resultado sugerido |
| ---: | --- |
| 1 | Retentor fraco, construir como mortal fraco. |
| 2 | Ghoul, servo familiar, amante humano ou thrall dominado; construir como mortal medio ou ghoul sem vantagens. |
| 3 | Retentor competente e independente; normalmente ghoul com traits equivalentes a mortal talentoso. |

Validacoes:

- Todo retentor precisa de metodo de controle.
- Retentor deve agir como personagem, nao como item.
- Retentor pode trair se controle for fraco, abuso for alto ou recompensa externa for maior.

### 8.5 Regras de Carniçal/Ghoul

Regras de base:

- Um mortal que bebe vitae vampirica torna-se ghoul temporariamente.
- A vitae suspende envelhecimento enquanto o efeito for mantido.
- Se a vitae deixar de ser fornecida, o ghoul deteriora conforme o tempo represado retorna.
- Ghoul pode possuir 1 disciplina em nivel 1 por padrao.
- Usar poderes acima de nivel 1 deve causar custo/risco especial, quando permitido por poderes ou efeitos externos.

Template inicial de Ghoul:

| Campo | Valor sugerido |
| --- | ---: |
| Physical | 4 |
| Social | 4 |
| Mental | 4 |
| Health | 6 |
| Willpower | 5 |
| Exceptional Pools | Awareness 6, Intimidation 5, Occult 6, Stealth 5 |
| Disciplines | 1 disciplina em nivel 1 |

### 8.6 Blood Bond

Campos:

| Campo | Tipo |
| --- | --- |
| `regnant_id` | UUID |
| `thrall_id` | UUID |
| `bond_strength` | integer 1-6 |
| `last_drink_at` | date |
| `monthly_decay_enabled` | boolean |
| `notes` | text |

Regras:

- Bond Strength equivale ao numero de vezes que o thrall consumiu sangue do regente, maximo 6.
- Bond Strength reduz 1 por mes sem consumo.
- Para agir contra o regente, o thrall deve passar em disputa apropriada contra Bond Strength.
- Um thrall vinculado deve ter apenas um regente ativo.

### 8.7 Manutencao

O sistema deve ter alertas:

- ghoul sem vitae recente;
- Blood Bond prestes a reduzir;
- domitor morto/inativo;
- retentor ferido;
- risco de Mascara por lacaio exposto.

### 8.8 Criterios de Aceite

- Um lacaio comum pode ser convertido em ghoul sem perder historico.
- Um ghoul exige domitor ou justificativa de vitae armazenada.
- O sistema impede dois regentes ativos para o mesmo thrall.
- O sistema reduz Bond Strength mensalmente quando configurado.
- O Mestre pode marcar lacaio como ativo organizacional em vez de individuo.

## 9. APIs Sugeridas

### 9.1 Criacao

```http
POST /api/campaigns/{campaignId}/characters
POST /api/characters/{characterId}/submit-review
POST /api/characters/{characterId}/approve
POST /api/characters/{characterId}/archive
```

### 9.2 Validacao

```http
POST /api/characters/{characterId}/validate
GET /api/characters/{characterId}/validation-report
```

Resposta:

```json
{
  "valid": false,
  "errors": [
    {
      "code": "ATTRIBUTES_INVALID_DISTRIBUTION",
      "field": "attributes",
      "message": "A distribuicao deve ser 4,3,3,3,2,2,2,2,1."
    }
  ],
  "warnings": [
    {
      "code": "ST_APPROVAL_REQUIRED",
      "message": "Loresheet requer aprovacao do Mestre."
    }
  ]
}
```

### 9.3 Presets

```http
GET /api/rules/vtm-v5/clans
GET /api/rules/vtm-v5/predator-types
GET /api/rules/vtm-v5/npc-templates
GET /api/rules/vtm-v5/retainer-templates
```

## 10. Banco de Dados - Tabelas Sugeridas

```sql
characters
character_attributes
character_skills
character_specialties
character_disciplines
character_discipline_powers
character_advantages
character_flaws
character_convictions
character_touchstones
character_relationships
character_validation_events
character_xp_ledger
retainer_details
blood_bonds
rule_presets
```

## 11. Permissoes

| Acao | Jogador | Mestre |
| --- | --- | --- |
| Criar vampiro jogavel | Sim | Sim |
| Criar PNC humano | Nao | Sim |
| Criar PNC vampiro | Nao | Sim |
| Criar lacaio proprio | Sim, se vantagem permitir | Sim |
| Aprovar ficha | Nao | Sim |
| Ver campos secretos | Nao | Sim |
| Editar ficha aprovada | Parcial | Sim |

## 12. Testes Automatizados Minimos

- Validar distribuicao de atributos.
- Validar distribuicao de habilidades nos dois modos.
- Validar vinculo 1:1 entre conviccao e touchstone.
- Validar predator type com restricoes por clã/Blood Potency.
- Validar thin-blood com restricoes de vantagens.
- Validar criacao de PNC simples por dificuldade.
- Validar template de ghoul.
- Validar Blood Bond com limite de um regente ativo.
- Validar permissao de campos secretos.
- Validar mudanca de status da ficha.

## 13. Roadmap de Implementacao

### Fase 1 - Fundacao

- Criar entidades comuns.
- Criar enums de atributos, habilidades, tipos de personagem e status.
- Criar validacao de vampiro jogavel basica.
- Criar UI de ficha em modo draft.

### Fase 2 - Regras V5

- Implementar clãs, disciplinas iniciais, humanidade, Blood Potency.
- Implementar predator types.
- Implementar vantagens/falhas.
- Implementar validacao e relatorio.

### Fase 3 - PNCs

- Implementar PNC humano simples e por template.
- Implementar PNC vampiro simples e por arquetipo.
- Implementar visibilidade Mestre/jogador.

### Fase 4 - Lacaios

- Implementar retentores.
- Implementar ghoul.
- Implementar Blood Bond e manutencao.
- Implementar alertas narrativos.

### Fase 5 - Revisao e Automacao

- Workflow de aprovacao.
- XP ledger.
- Auditoria de alteracoes.
- Exportacao de ficha.

