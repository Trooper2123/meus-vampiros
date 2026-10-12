# Referencia - Tipos de Predacao VtM V5

## Objetivo

Este arquivo serve como modelo de referencia para listar os tipos de predacao usados na criacao de fichas de vampiros em VtM V5. No app, ele pode alimentar:

- lista de selecao na tela de criacao de personagem;
- tooltips explicativos;
- seed de banco para `predator_types`;
- regras de validacao automatica.

## Modelo Sugerido

Cada tipo de predacao pode ser representado no sistema com os campos:

```json
{
  "code": "ALLEYCAT",
  "name": "Alleycat",
  "summary": "Vampiro que se alimenta por ataque direto e violencia.",
  "feeding_style": "Assalto, emboscada ou coerção fisica.",
  "predator_roll": "Strength + Brawl",
  "specialty_options": ["Intimidation (Stickups)", "Brawl (Grappling)"],
  "discipline_options": ["Celerity", "Potence"],
  "bonus_options": ["Contacts (criminal) 3"],
  "flaws_or_costs": ["Humanity -1"],
  "common_risks": ["Violencia", "Risco de Mascara", "Baixa Humanidade"],
  "validation_notes": "Aplicar modificadores e restricoes conforme regra da campanha."
}
```

## Tipos de Predacao

### Tipos Base do Corebook

| Codigo | Nome | Breve explicacao | Uso narrativo |
| --- | --- | --- | --- |
| `ALLEYCAT` | Alleycat | Alimenta-se por ataque direto, emboscada, intimidação ou violencia. | Bom para personagens agressivos, criminosos, sobreviventes de rua ou predadores fisicos. |
| `BAGGER` | Bagger | Obtem sangue frio por roubo, compra, mercado ilegal, hospitais ou bolsas de sangue. | Funciona para vampiros discretos, ladroes, funcionarios de hospital ou personagens que evitam caca direta. |
| `BLOOD_LEECH` | Blood Leech | Alimenta-se de outros vampiros, por caca, coerção, acordo ou pagamento em sangue. | Perfil perigoso e politicamente explosivo; excelente para antagonistas, diableristas ou personagens de alto risco. |
| `CLEAVER` | Cleaver | Alimenta-se secretamente de familiares, amigos ou pessoas proximas da vida mortal. | Ideal para drama pessoal, conflito com a Mascara e tensao entre humanidade e monstruosidade. |
| `CONSENSUALIST` | Consensualist | Alimenta-se apenas com consentimento da vitima, usando acordos, subculturas ou justificativas sociais. | Bom para personagens que tentam preservar moralidade, mas ainda geram risco de exposicao. |
| `FARMER` | Farmer | Alimenta-se de animais e evita beber de humanos. | Perfil etico ou penitente, mas mecanicamente dificil pela fome e por limitacoes de potencia. |
| `OSIRIS` | Osiris | Alimenta-se de seguidores, fas, fieis, culto, igreja, comunidade ou celebridade pessoal. | Excelente para lideres, artistas, influenciadores, cultistas e personagens com poder social. |
| `SANDMAN` | Sandman | Alimenta-se de vitimas adormecidas, geralmente usando furtividade ou disciplinas. | Perfil furtivo, invasivo e silencioso; combina com Obfuscate, Auspex e personagens anti-sociais. |
| `SCENE_QUEEN` | Scene Queen | Alimenta-se dentro de uma subcultura especifica onde tem status ou pertencimento. | Bom para personagens ligados a cenas musicais, politicas, artisticas, criminosas ou alternativas. |
| `SIREN` | Siren | Alimenta-se em contexto sexual ou de seducao, usando desejo, aparencia ou manipulacao. | Perfil socialmente perigoso, intenso e dramatico; exige cuidado narrativo em mesa. |

### Tipos Expandidos do Players Guide

| Codigo | Nome | Breve explicacao | Uso narrativo |
| --- | --- | --- | --- |
| `BUSINESS_OWNER` | Business Owner | Usa um negocio proprio ou controlado indiretamente como fonte de vitimas entre funcionarios e clientes. | Bom para vampiros empresarios, donos de fachada, chefes locais ou predadores socialmente estabelecidos. |
| `CORPORATE_LEECH` | Corporate Leech | Caca em predios corporativos, misturando-se a funcionarios, seguranca e rotinas empresariais. | Funciona para personagens ligados a escritorio, vigilancia, burocracia, espionagem ou capitalismo predatorio. |
| `CONFIDANT` | Confidant | Alimenta-se de pessoas que procuram conselho, acolhimento, terapia ou escuta emocional. | Ideal para personagens manipuladores, terapeutas, mentores, gurus ou vampiros que exploram vulnerabilidade emocional. |
| `EAT_THE_RICH` | Eat the Rich | Mira pessoas ricas, poderosas ou de alta sociedade como presas preferenciais. | Bom para personagens vingativos, revolucionarios, infiltrados na elite ou predadores com odio de classe. |
| `HIDE_AND_EAT` | Hide and Eat | Espera a presa se aproximar, alimenta-se furtivamente e desaparece antes que percebam. | Combina com emboscada, vigilancia, paciencia, furtividade e personagens que evitam confronto direto. |
| `KIDNAPPER` | Kidnapper | Captura vitimas e as mantem como fonte de alimentacao ate soltá-las ou descartá-las. | Perfil sombrio e de alto risco moral; melhor para cronicas pesadas, antagonistas ou personagens com queda de Humanidade. |
| `HOSPITAL_HUNTER` | Hospital Hunter | Usa hospitais, pacientes, visitantes e equipe medica como ambiente de caca. | Bom para medicos, enfermeiros, funcionarios de hospital ou vampiros que rondam vulnerabilidade fisica. |
| `LAB_RAT` | Lab Rat | Usa clinicas, experimentos, medicina alternativa ou testes para obter sangue de pessoas voluntarias ou vulneraveis. | Ideal para Tremere, cientistas, medicos antiéticos, ocultistas clinicos ou vampiros experimentadores. |
| `LOCAL_HAUNT` | Local Haunt | Explora uma lenda local, casa assombrada, esgoto, mata ou lugar temido para atrair curiosos. | Excelente para personagens ligados a horror urbano, folclore local, Protean, Auspex ou territorios assustadores. |
| `MANIC_PIXIE_PREDATOR` | Manic Pixie Predator | Cria relacoes breves, intensas e romantizadas, alimentando-se de pretendentes antes de desaparecer. | Bom para drama romantico, manipulacao emocional, Presence e historico de coracoes partidos. |
| `LURKER_IN_THE_CROWD` | Lurker in the Crowd | Escolhe presas em multidoes, alimenta-se rapido e se perde no fluxo de pessoas. | Funciona para vampiros apagados, urbanos, discretos, furtivos ou acostumados a anonimato. |
| `ONLINE_PREDATOR` | Online Predator | Usa internet, comunidades online, doxing, encontros e engenharia social para localizar vitimas. | Essencial para cronicas modernas com redes sociais, tecnologia, Mask, hacking social e risco digital. |
| `OPPORTUNIST` | Opportunist | Atrai vitimas por golpes, promessas, esquemas, vendas falsas ou oportunidades boas demais. | Bom para con artists, influenciadores, vendedores, golpistas e vampiros carismaticos. |
| `PAY_FOR_BLOOD` | Pay for Blood | Trata a alimentacao como transacao, pagando ou usando recursos para que o sangue chegue ate ele. | Perfil privilegiado, elitista ou pragmatico; cria riscos por intermediarios, fornecedores e chantagem. |
| `PACK_HUNTER` | Pack Hunter | Caca com animais, matilhas ou criaturas predadoras que aceitam sua lideranca. | Ideal para Animalism, Gangrel, caçadores, personagens selvagens e cenas de perseguição. |
| `STREET_FEEDER` | Street Feeder | Conhece as ruas e atrai presas para locais vulneraveis sem depender de status social. | Bom para sobreviventes urbanos, sem-teto, criminosos pequenos, buskers e vampiros fora do sistema. |
| `WATCHER_FROM_THE_WATER` | Watcher from the Water | Caca em rios, lagos, mares, canais ou outros corpos d'agua, usando acidentes e isolamento. | Combina com personagens aquaticos, marginais, portuarios, pescadores, marinheiros ou monstros de lenda local. |
| `WOLF_IN_SHEEPS_CLOTHING` | Wolf in Sheep's Clothing | Finge ser presa facil para atrair predadores humanos e inverter a situacao. | Bom para justiceiros sombrios, personagens com isca social, caçadores de abusadores e conflitos morais. |

## Resumo Mecanico

### Tipos Base do Corebook

| Codigo | Rolagem de predador | Especialidade possivel | Disciplina possivel | Bonus, vantagens e custos principais |
| --- | --- | --- | --- | --- |
| `ALLEYCAT` | Strength + Brawl; opcionalmente Wits + Streetwise quando caca criminosos como justiceiro sombrio | Intimidation (Stickups) ou Brawl (Grappling) | Celerity ou Potence | Contacts criminais 3; Humanidade -1 |
| `BAGGER` | Intelligence + Streetwise | Larceny (Lockpicking) ou Streetwise (Black Market) | Blood Sorcery, apenas Tremere, ou Obfuscate | Iron Gullet 3; Enemy 2; Ventrue nao pode escolher |
| `BLOOD_LEECH` | Sem rolagem abstrata recomendada; deve ser cena planejada pelo Mestre | Brawl (Kindred) ou Stealth (against Kindred) | Celerity ou Protean | Blood Potency +1; Humanidade -1; Dark Secret Diablerist 2 ou Shunned 2; Prey Exclusion mortals 2 |
| `CLEAVER` | Manipulation + Subterfuge | Persuasion (Gaslighting) ou Subterfuge (Coverups) | Dominate ou Animalism | Herd 2; Dark Secret Cleaver 1; adicionar familia ao mapa de relacionamento |
| `CONSENSUALIST` | Manipulation + Persuasion | Medicine (Phlebotomy) ou Persuasion (Victims) | Auspex ou Fortitude | Humanidade +1; Dark Secret Masquerade Breacher 1; Prey Exclusion non-consenting 1 |
| `FARMER` | Composure + Animal Ken | Animal Ken (animal especifico) ou Survival (Hunting) | Animalism ou Protean | Humanidade +1; Vegan 2; Ventrue nao pode escolher; Blood Potency deve ser menor que 3 |
| `OSIRIS` | Manipulation + Subterfuge ou Intimidation + Fame | Occult (tradicao especifica) ou Performance (campo especifico) | Blood Sorcery, apenas Tremere, ou Presence | Distribuir 3 pontos entre Fame e Herd; distribuir 2 pontos entre Enemies e Mythic Flaws |
| `SANDMAN` | Dexterity + Stealth | Medicine (Anesthetics) ou Stealth (Break-in) | Auspex ou Obfuscate | Resources 1; foco em invadir, alimentar-se em silencio e sair |
| `SCENE_QUEEN` | Manipulation + Persuasion | Etiquette, Leadership ou Streetwise ligados a uma cena especifica | Dominate ou Potence | Fame 1; Contact 1; Influence Flaw Disliked 1 ou Prey Exclusion de outra subcultura 1 |
| `SIREN` | Charisma + Subterfuge | Persuasion (Seduction) ou Subterfuge (Seduction) | Fortitude ou Presence | Looks Merit Beautiful 2; Enemy 1 ligado a amante rejeitado ou parceiro ciumento |

### Tipos Expandidos do Players Guide

| Codigo | Rolagem de predador | Especialidade possivel | Disciplina possivel | Bonus, vantagens e custos principais |
| --- | --- | --- | --- | --- |
| `BUSINESS_OWNER` | Charisma + Persuasion | Persuasion (Deals) ou Finance (Money Laundering) | Dominate ou Presence | Business Owner Background 3; Routine Flaw 2 |
| `CORPORATE_LEECH` | Manipulation + Etiquette | Finance (Corporate) ou Etiquette (Corporate) | Dominate ou Obfuscate | Power Behind the Throne 3; Dull 1; Dark Secret 1 |
| `CONFIDANT` | Composure + Insight | Insight (Empathy) ou Academics (Psychology) | Oblivion ou Presence | Supportive Presence 1; Remorseful 1; Memoriam Dweller 1; Conflicting Loyalties 2 |
| `EAT_THE_RICH` | Strength + Intimidation | Intimidation (Extortion) ou Politics (Media) | Fortitude ou Potence | Clan Infiltrator 3; Angry Beast 2 |
| `HIDE_AND_EAT` | Wits + Stealth | Stealth (Stalking) ou Awareness (Ambushes) | Celerity ou Obfuscate | Efficient Eater 2; Slippery 1; Obvious Predator 2 |
| `KIDNAPPER` | Resolve + Investigation | Craft (Security) ou Investigation (Stalking) | Dominate ou Potence | Base Haven 2 com Cell 1; Humanidade -1; Sadistic 2 |
| `HOSPITAL_HUNTER` | Intelligence + Medicine | Medicine (Diagnosis) ou Persuasion (Condolence) | Fortitude ou Oblivion | Blood Healer 3; Frigid Aura 2 |
| `LAB_RAT` | Intelligence + Science | Medicine (Experiments) ou Science (Experiments) | Blood Sorcery ou Fortitude | Improved Ghouls 3; Blunted Fangs 1; Addiction 1 |
| `LOCAL_HAUNT` | Stamina + Athletics | Intimidation (Frighten) ou Athletics (Chasing) | Auspex ou Protean | Loremaster 3; Eerie Presence 2 |
| `MANIC_PIXIE_PREDATOR` | Manipulation + Insight | Persuasion (Risk Taking) ou Insight (Insecurities) | Celerity ou Presence | Social Engineer 3; Cannot Embrace 2 |
| `LURKER_IN_THE_CROWD` | Wits + Stealth | Stealth (Blending In) ou Athletics (Escaping) | Auspex ou Obfuscate | Obscure 3; Outsider 2 |
| `ONLINE_PREDATOR` | Resolve + Technology | Technology (Doxing) ou Etiquette (subcultura online) | Obfuscate ou Presence | Mask 2 mais Zeroed 1 ou Cobbler 1; Paranoia 2 |
| `OPPORTUNIST` | Charisma + Insight | Persuasion (Selling) ou Insight (Desire) | Dominate ou Presence | Delay Destruction 3; Overconfident 2 |
| `PAY_FOR_BLOOD` | Charisma + Finance | Politics (Feeding Habits) ou Finance (Follow the Money) | Dominate ou Blood Sorcery | Distribuir 3 pontos entre Resources ou Influence; Despised 2 |
| `PACK_HUNTER` | Dexterity + Brawl | Animal Ken (Carnivores) ou Brawl (Pack Tactics) | Animalism ou Protean | Apex Predator 3; Brash 1; Deep Sleeper 1 |
| `STREET_FEEDER` | Stamina + Brawl | Streetwise (High Crime Areas) ou Brawl (Ambush) | Obfuscate ou Potence | Danger Sense 3; Destitute 1 |
| `WATCHER_FROM_THE_WATER` | Dexterity + Survival | Athletics (Swimming) ou Survival (Water) | Oblivion ou Protean | Sharp Senses 2; Slippery 1; No Haven 1 |
| `WOLF_IN_SHEEPS_CLOTHING` | Fortitude + Melee | Subterfuge (Feigning Weakness) ou Melee (Hidden Weapon) | Auspex ou Fortitude | Daredevil 3; Underestimated 1; Death's Kiss 2 |

## Regras de Implementacao

### Selecao

- Personagens recém-abraçados ou thin-bloods podem nao escolher tipo de predacao, conforme decisao da campanha.
- O tipo de predacao representa habito ou reflexo de caca, nao uma obrigacao absoluta.
- O Mestre deve poder sobrescrever restricoes quando a cronica justificar.

### Validacao

O backend deve validar:

- restricoes por clã, quando existirem;
- restricoes por Blood Potency, quando existirem;
- modificadores automaticos de Humanidade;
- disciplinas, vantagens, falhas e especialidades concedidas;
- necessidade de registrar NPCs, contatos, inimigos, familia, rebanho ou relacoes no mapa de relacionamento.

### Interface

Na tela de criacao, cada tipo deve exibir para jogadores:

- nome;
- explicacao curta;
- estilo de caca;
- resumo da rolagem a ser realizada;
- aviso de restricao bloqueante, quando houver.

Apenas o Narrador deve visualizar:

- riscos narrativos;
- ajustes mecanicos completos;
- vantagens, falhas, custos e alteracoes automaticas;
- observacoes de uso em cena;
- ganchos de consequencia, Mascara, Humanidade, inimigos, contatos ou mapa de relacionamento.

O resumo da rolagem deve ser visivel na ficha e na tela de criacao, mesmo quando os ajustes completos forem ocultos. Exemplo:

```text
Rolagem: Charisma + Persuasion
Uso: convencer, isolar ou conduzir a vitima dentro do metodo de predacao escolhido.
```

### Visibilidade por Perfil

| Informacao | Jogador | Narrador |
| --- | --- | --- |
| Nome do tipo de predacao | Sim | Sim |
| Explicacao curta | Sim | Sim |
| Estilo de caca | Sim | Sim |
| Resumo da rolagem | Sim | Sim |
| Riscos narrativos | Nao | Sim |
| Ajustes mecanicos completos | Nao | Sim |
| Vantagens e falhas concedidas | Parcial, apos aplicacao na ficha | Sim |
| Custos de Humanidade, Blood Potency ou restricoes ocultas | Parcial, quando impactar validacao | Sim |

## Observacoes por Tipo

### Tipos base

### Alleycat

Predador fisico e direto. A interface deve deixar claro que esse estilo tende a envolver violencia, perseguicao, ameaca ou assalto. Pode gerar risco frequente de cenas de combate, policia, testemunhas e perda de Humanidade.

### Bagger

Predador indireto. O personagem depende de acesso a sangue armazenado, hospitais, ambulancias, bancos de sangue, mercado ilegal ou contatos. Deve gerar possiveis ganchos de divida, fornecedor, inimigo ou vigilancia.

### Blood Leech

Predador de vampiros. Deve ser tratado como escolha de alto risco, pois envolve politica vampirica, violencia entre Kindred, possivel segredo sombrio e exclusao de mortais como presa.

### Cleaver

Predador familiar. O app deve sugerir registrar a familia ou pessoas proximas no mapa de relacionamento. Esse tipo cria drama forte por depender de relacoes mortais ainda ativas.

### Consensualist

Predador por consentimento. Deve destacar que consentimento reduz um tipo de violencia, mas pode aumentar risco de Mascara se a vitima souber ou suspeitar da verdade.

### Farmer

Predador de animais. Deve exibir alerta para restricoes de clã e Blood Potency. E uma escolha boa para personagens que tentam preservar humanidade, mas dificil de sustentar.

### Osiris

Predador de seguidores. Deve sugerir vinculos com Fame, Herd, culto, igreja, fanbase ou comunidade. Tambem pode gerar inimigos, exposicao publica e investigacao.

### Sandman

Predador furtivo. Deve sugerir Stealth, Medicine, Auspex ou Obfuscate. E bom para cenas de invasao, vigilancia e alimentacao sem contato social direto.

### Scene Queen

Predador de subcultura. Deve registrar qual cena ou comunidade e usada como area de caca. Pode envolver status local, fama pequena, contatos e exclusao de outras subculturas.

### Siren

Predador por seducao. Deve exibir aviso de conteudo sensivel e permitir configuracao de limites de mesa. Pode envolver beleza, Presence, relacoes passadas, inimigos romanticos e touchstones complicados.

### Tipos expandidos

Os tipos expandidos do Players Guide seguem a mesma estrutura geral de implementacao dos tipos base: especialidade, disciplina, vantagens, falhas e rolagem de predador. Para o app, eles devem ser marcados como conteudo opcional por fonte, permitindo que cada campanha habilite ou desabilite a lista expandida.

Campos sugeridos para controle:

```json
{
  "source": "PLAYERS_GUIDE",
  "optional": true,
  "enabled_by_default": false
}
```

## Seed Inicial Sugerida

```json
[
  {"code": "ALLEYCAT", "name": "Alleycat"},
  {"code": "BAGGER", "name": "Bagger"},
  {"code": "BLOOD_LEECH", "name": "Blood Leech"},
  {"code": "CLEAVER", "name": "Cleaver"},
  {"code": "CONSENSUALIST", "name": "Consensualist"},
  {"code": "FARMER", "name": "Farmer"},
  {"code": "OSIRIS", "name": "Osiris"},
  {"code": "SANDMAN", "name": "Sandman"},
  {"code": "SCENE_QUEEN", "name": "Scene Queen"},
  {"code": "SIREN", "name": "Siren"},
  {"code": "BUSINESS_OWNER", "name": "Business Owner"},
  {"code": "CORPORATE_LEECH", "name": "Corporate Leech"},
  {"code": "CONFIDANT", "name": "Confidant"},
  {"code": "EAT_THE_RICH", "name": "Eat the Rich"},
  {"code": "HIDE_AND_EAT", "name": "Hide and Eat"},
  {"code": "KIDNAPPER", "name": "Kidnapper"},
  {"code": "HOSPITAL_HUNTER", "name": "Hospital Hunter"},
  {"code": "LAB_RAT", "name": "Lab Rat"},
  {"code": "LOCAL_HAUNT", "name": "Local Haunt"},
  {"code": "MANIC_PIXIE_PREDATOR", "name": "Manic Pixie Predator"},
  {"code": "LURKER_IN_THE_CROWD", "name": "Lurker in the Crowd"},
  {"code": "ONLINE_PREDATOR", "name": "Online Predator"},
  {"code": "OPPORTUNIST", "name": "Opportunist"},
  {"code": "PAY_FOR_BLOOD", "name": "Pay for Blood"},
  {"code": "PACK_HUNTER", "name": "Pack Hunter"},
  {"code": "STREET_FEEDER", "name": "Street Feeder"},
  {"code": "WATCHER_FROM_THE_WATER", "name": "Watcher from the Water"},
  {"code": "WOLF_IN_SHEEPS_CLOTHING", "name": "Wolf in Sheep's Clothing"}
]
```

## Verificacao dos Arquivos

| Arquivo | Resultado |
| --- | --- |
| Corebook V5 | Contem os 10 tipos base. |
| Players Guide | Contem 18 tipos expandidos e orientacao para criar tipos customizados. |
| Storytellers Toolkit | Nao adiciona novos tipos formais; traz ambientes e notas de caca, incluindo referencia situacional a Scene Queen. |
| Quickstart | Nao adiciona novos tipos formais; traz fichas e regras resumidas. |
