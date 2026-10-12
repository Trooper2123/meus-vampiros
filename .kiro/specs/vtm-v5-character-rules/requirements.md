# Requisitos: Regras de criação de fichas VtM V5

## 1. Contexto

O fluxo atual armazena a ficha como JSON flexível, mas não diferencia personagens jogáveis, NPCs e lacaios nem valida as distribuições mecânicas de VtM V5. A referência funcional completa está em `.kiro/specs/spec-regras-criacao-fichas-vtm-v5.md`.

## 2. Objetivos

- Validar fichas de vampiros jogáveis antes da submissão ao Mestre.
- Suportar NPC humano, NPC vampiro e retentor/carniçal no mesmo domínio.
- Separar erros bloqueantes de avisos que permitem override narrativo do Mestre.
- Persistir tipo, status, visibilidade e origem de valores calculados sem invalidar fichas existentes.
- Disponibilizar presets de predadores, NPCs e retentores em código versionado.

## 3. Fora do escopo

- Rolagem e combate completos.
- Progressão detalhada após a criação inicial.
- Reprodução da ficha PDF oficial.
- Conteúdo proprietário integral dos livros; presets conterão somente dados necessários às regras implementadas.
- Automação temporal de Blood Bond nesta entrega inicial; o domínio deve ficar preparado para evolução.

## 4. Histórias de usuário

### US-001 — Validar vampiro jogável

**Como** jogador, **quero** receber um relatório objetivo antes de enviar minha ficha, **para** corrigir distribuições inválidas.

**Critérios de aceitação:**
1. A distribuição padrão de atributos deve ser `4,3,3,3,2,2,2,2,1`.
2. A ficha deve possuir de 1 a 3 convicções, cada uma com touchstone próprio.
3. Cada ponto de disciplina deve possuir um poder escolhido.
4. Erros bloqueiam submissão; avisos permanecem visíveis.

### US-002 — Aplicar perfil de criação

**Como** jogador, **quero** escolher fledgling, neonate, ancilla ou thin-blood, **para** receber ajustes iniciais rastreáveis.

**Critérios de aceitação:**
1. Neonate recebe 15 XP inicial e ancilla recebe 35 XP.
2. Ancilla recebe +1 Blood Potency e -1 humanidade como ajustes sugeridos.
3. Thin-blood recebe restrições específicas de vantagens e predator type.

### US-003 — Criar personagens do Mestre

**Como** Mestre, **quero** criar NPC humano, NPC vampiro e retentor por presets, **para** reduzir o tempo de preparação.

**Critérios de aceitação:**
1. NPC humano simples aceita dificuldade entre 1 e 5 e calcula pool sugerido.
2. NPC vampiro aceita modo simplificado com pools e dados vampíricos mínimos.
3. Retentor/carniçal exige método de controle e, quando ghoul, domitor ou justificativa de vitae.

### US-004 — Revisar ficha

**Como** Mestre, **quero** aprovar, arquivar ou solicitar correções, **para** controlar o estado mecânico da campanha.

**Critérios de aceitação:**
1. Estados válidos: `DRAFT`, `PENDING_REVIEW`, `APPROVED`, `ARCHIVED`, `DISABLED`.
2. Jogadores só submetem fichas próprias válidas.
3. Apenas o Mestre da campanha aprova, arquiva ou desabilita.

## 5. Regras de negócio

- RB-001: tipos válidos são `PLAYER_VAMPIRE`, `HUMAN_NPC`, `VAMPIRE_NPC` e `RETAINER`.
- RB-002: atributos completos variam de 1 a 5; habilidades variam de 0 a 5.
- RB-003: saúde calculada é vigor + 3; força de vontade é determinação + compostura.
- RB-004: humanidade padrão é 7 e nunca pode ser 0 para personagem jogável.
- RB-005: Caitiff não pode coexistir com clã definido.
- RB-006: Blood Potency deve ser compatível com geração, salvo override do Mestre.
- RB-007: Bagger é proibido para Ventrue; Farmer é proibido para Ventrue ou BP 3+.
- RB-008: thin-blood não compra Bonding, Mawla, Retainers ou Status diretamente sem override.
- RB-009: um thrall possui no máximo um regente ativo e Bond Strength varia de 1 a 6.
- RB-010: campos secretos nunca são retornados a jogador sem permissão.

## 6. Requisitos não funcionais

- Segurança: autenticação e autorização no servidor; payloads limitados e validados.
- Compatibilidade: fichas existentes assumem `PLAYER_VAMPIRE`, `DRAFT` e `PLAYER_VISIBLE`.
- Auditoria: validações e mudanças de status devem poder ser registradas.
- Acessibilidade: mensagens associadas ao formulário, foco e `role="alert"`/`status`.
- Interface em português do Brasil e aderente ao `UI-GUIDE.md`.

## 7. Dúvidas e decisões

- Presets extensos de livros adicionais serão cadastrados progressivamente, sem bloquear o motor base.
- Overrides do Mestre serão persistidos em fase posterior; nesta entrega, regras passíveis de override são avisos quando seguro.
