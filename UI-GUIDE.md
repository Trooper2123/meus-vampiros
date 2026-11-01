# UI-GUIDE — Direcionamento de Layout e Tema

> Este arquivo é a referência de consulta obrigatória do agente ao construir novas páginas ou implementar atualizações visuais no projeto **Arquivos da Noite**.
> O arquivo `design-system.md` contém o detalhamento completo; este documento é o resumo operacional de acesso rápido. As SPECs 008 (dossiê e rolagens) e 009 (padronização visual) complementam as regras existentes, sem autorizar remoção de funcionalidades.

---

## 1. Identidade visual

**Arquivos da Noite** é uma interface de horror gótico: escura, austera, editorial e funcional.
A atmosfera é de um **arquivo de comando restrito**. Tensão sem ruído; funcionalidade sem frivolidade.

### Princípio-chave
> Clareza antes de atmosfera. Vermelho só quando tem intenção.

### Perfil de acesso

Todo usuário autenticado tem acesso às funcionalidades de jogador e Narrador, sem depender de roles no Auth0. Narrador é o proprietário da mesa naquele contexto. Mesas, personagens, NPCs e informações privadas continuam protegidos no servidor por ID do usuário e vínculos autorizados.

---

## 2. Cores — tokens obrigatórios

Nunca usar hexadecimais ou cores diretas no markup. Usar sempre os tokens:

| Token CSS | Valor | Uso |
|-----------|-------|-----|
| `var(--background)` | `#0d0d0f` | Fundo geral da página |
| `var(--card)` | `#151519` | Painéis, cards, formulários |
| `var(--foreground)` | `#eee9e2` | Texto principal |
| `var(--muted-foreground)` | `#9b9792` | Metadados, labels, descrições |
| `var(--border)` | `#343238` | Bordas e divisórias |
| `var(--primary)` | `#9f2024` | Botão principal, alertas, perigo |
| `var(--primary-foreground)` | `#fff8f1` | Texto sobre vermelho |
| `var(--ring)` | `#d7b49b` | Foco de teclado |

**Vermelho derivado usado no CSS:** `#c74343` (hover/borda ativa), `#d47776` (texto sobre escuro).

### Regras de cor
- Azul (`--grant-origin`) identifica exclusivamente concessões automáticas de clã/predação, acompanhado de indicação textual de origem.
- ✅ Vermelho em: botões primários, status de risco, bordas de foco, ações de atenção
- ❌ Vermelho como: fundo de seção, decoração, estado positivo
- ✅ Verde discreto em etiquetas de status positivo, como `Ativo` e `Aprovada`
- ❌ Não criar novas cores sem atualizar `design-system.md`

---

### Tokens complementares

| Token | Uso |
|---|---|
| `--surface-input` / `--surface-hover` | Campo e superfície em hover |
| `--accent` / `--accent-text` | Eyebrow/borda e texto de atenção |
| `--primary-hover` | Hover da ação principal |
| `--border-accent` | Contorno de trilhas e retratos |
| `--positive` / `--border-positive` | Status positivo |

Valores são centralizados em `globals.css`; não repetir literais nos componentes. O legado ainda contém cores diretas e deve ser corrigido ao ser alterado.

## 3. Tipografia

| Papel | Família | Classe Tailwind |
|-------|---------|-----------------|
| Títulos editoriais | Cormorant Garamond / Georgia (fallback disponível) | `font-serif` |
| Interface e corpo | Geist | `font-sans` (padrão; fallback sans-serif) |
| Dados técnicos, labels | Geist Mono | `font-mono` |

### Escala

| Elemento | Tamanho | Observação |
|----------|---------|------------|
| Eyebrow / label | `10px` | `uppercase tracking-[0.18em]` via `.eyebrow` |
| Corpo | `text-sm leading-6` | |
| Título de card | `text-xl font-serif` | |
| Título de página | `text-4xl sm:text-5xl font-serif` | |
| Valores em resumo | `text-2xl font-serif` | |

---

## 4. Estrutura de página

Referência visual vigente: `codex/Meus Vampiros — Arquivos da Noite.pdf` (16 páginas). A primeira página é biblioteca de componentes; as demais mostram acesso, criação de ficha, anotações, convite, personagens desktop/mobile, ficha, gestão de mesa desktop/mobile, listagem e criação de mesas, modal de notas e NPC.

- Usar `ArchiveHeader` nas páginas internas: marca fixa, contexto da tela e navegação. O título principal fica no conteúdo. Não duplicar o controle de autenticação no layout raiz.
- Em celular, navegação em `<details>` com rótulo “Menu”; funciona por clique e teclado. “Mesas” só aparece para quem tem mesas próprias; isso não substitui autorização no servidor. Anotações permanece acessível pelo menu.
- `.archive-content`: largura máxima de 1440px, padding desktop 64px, tablet 32px e mobile 20px. Em 1440px, área útil de 1312px.
- `.archive-page-heading`: eyebrow, título editorial, descrição e divisória. Ações da listagem ficam abaixo da divisória; em celular ocupam a largura disponível.
- Cards de personagem: preservar obrigatoriamente nome, status textual, conceito, clã, geração, nome e descrição da mesa, XP gasto/total e as ações Resumo, Duplicar, Editar e Excluir ficha (quando autorizadas). Manter agrupamentos, divisória de ações e dados reais. Retrato opcional não pode ocultar metadados.
- Resumo: botão “Anotações” junto ao nome abre /notes em nova guia com filtro da ficha, sem modal nem card de anotações relacionadas; detalhes de clã após o cabeçalho. Rolagens sem campo de motivo, com contexto automático no histórico.
- Evolução: página /characters/[id]/evolution reúne especialidades e Disciplinas. Botão Evolução junto ao nome abre nova guia no resumo do jogador; gestão da mesa apresenta o resumo sem esse acesso. A página exige proprietário ou Narrador da mesa no servidor.
- Criação geral oferece apenas fichas jogáveis. NPC humano/vampiro é criado em `/campaigns/[id]/npcs/new`, com API própria e autorização do Narrador da mesa. Tipo de ficha fica fixo após salvar. Vínculo por convite aparece no início do editor somente para ficha independente de jogador; criação com convite não apresenta campo adicional de vínculo.
- Resumo usa habilidades canônicas com pontos, vantagens/defeitos preenchidos e pilares/convicções antes dos atributos. Notas do Narrador na gestão abrem `/notes` em nova guia com filtro da mesa. Nomes de apresentação: Proteanismo e sangue-ralo.
- Disciplinas: opções iniciais vêm do clã/Caitiff; predação e XP têm origens separadas. Destacar incompatibilidades e permitir correção. Evolução mostra custo calculado no servidor; somente o Narrador da mesa autoriza requisitos específicos.
- Clãs: criação, resumo e campanha usam o catálogo central. Os sete clãs de suplementos exibem nome original, descrição, Perdição, Compulsão, mecânicas e fontes autenticadas em nova guia, com páginas impressa/PDF. O Narrador da própria mesa confirma/remove condições aplicáveis às rolagens; nenhuma compulsão ou dano surge por consultar a ficha. Alimentação, sol e repouso exigem condução narrativa nos recursos existentes. Seletores de clã/predação restauram escolhas salvas após carregamento, preservando edição local durante revalidação.
- Poderes: qualquer célula da linha abre a seleção em modal com disciplina fixa ao contexto e filtro de nível até o permitido pela linha. Selecionar preenche nome, efeito, custo, pré-requisito, amálgama, duração, paradas, notas e fonte; cancelar preserva os valores. Catálogo de seleção oferece poderes publicados, com requisitos e fonte visíveis; não concede níveis, XP, rituais ou dispensa requisitos.
- Ficha: identidade, recursos autorizados do servidor, atributos, habilidades, especialidades e demais seções. Recursos têm botões compactos − / + com nomes acessíveis; Humanidade oferece − / + ao proprietário ou Narrador; ambos podem aumentar e reduzir Manchas. Vitalidade/Vontade apresentam contadores separados por dano superficial e agravado, com os botões ao lado. Cada clique salva automaticamente com motivo contextual, revisão e idempotência, respeitando permissões. O resumo só muda após confirmação do servidor; falhas preservam os valores confirmados e permitem reenvio seguro. Fome 1→0 usa dialog com Cancelar como foco inicial, sem penalidades automáticas. Manchas ficam junto dos demais marcadores, com títulos, valores e controles centralizados. Recursos usam 1/2/4/5 colunas conforme a largura disponível, com cinco colunas a partir de 1280px.
- Gestão: ações de sessão/notas/pesquisas → calendários → NPCs → visualização de personagens → histórico de evolução → itens restritos. NPCs, participantes, histórico e itens usam seções expansíveis. Despertar e concessão de XP ficam no modo sessão. Não esconder informação privada apenas com CSS.
- Modo sessão: organizar as áreas em seções expansíveis (`details`/`summary`). Ordem: Início da noite (Narrador) → Anotações da mesa → Videochamada → NPCs → Pesquisas (Narrador) → Ficha e rolagens → XP e pertences (Narrador) → Revelações. Preservar disponibilidade por sessão ativa e autorização de cada área.
- Arquivamento: gestão da mesa oferece arquivar/restaurar com confirmação do nome; preservar todo o histórico e bloquear novas sessões arquivadas. Listagens separam mesas atuais de arquivadas, inclusive após revalidação. Não oferecer exclusão definitiva.
- Anotações aceitam imagens após salvar, com acesso herdado da nota e upload privado. Revelações são notas vinculadas à sessão, ocultas por padrão quando criadas livremente; Narrador prepara texto/imagens e controla revelar/ocultar. Seleção de sessão permite consultar notas e revelações após encerramento. Jogador mantém vídeo, resumo próprio e rolagens oficiais no painel; ações do Narrador continuam protegidas no servidor.
- Aprovação autoriza a participação uma vez por personagem/campanha e permanece após edições e compras válidas. Separar pendentes de aprovados, com correções/rejeição apenas antes da aprovação. Histórico de XP é informativo, com contador de novas compras, filtros, leitura persistente e resumo individual de saldo e últimas compras; não criar nova fila de aprovação de evolução.
- Pesquisa do Narrador: `/master/catalogo` exibe o acervo pesquisável de Disciplinas, poderes, rituais, cerimônias, fórmulas e habilidades; autorização de Narrador é validada no servidor. Os registros mantêm situação, fonte, página e identificadores estáveis.
- Predação: integrar tipos ao seletor existente, com nomes em português, filtro por fonte e referência/página na revisão. Distinguir guia comunitário de Bully, pré-publicação e Sabbat alternativo. Consulta independente exibe o catálogo completo; suplementos exigem habilitação do Narrador. Opções com regras incompletas permitem consulta, mas bloqueiam confirmação com motivo público.
- Formulários usam dados reais, labels e estados existentes; exemplos e observações do PDF não são conteúdo do produto.
- O PDF não autoriza criar mecânicas novas de bônus, ignorar permissões ou reduzir os catálogos aos exemplos demonstrativos.

### Fichas independentes e Aparência

- “Criar personagem” e “Abrir criação” abrem um modal para escolher criação assistida V5 ou transcrição. Confirmar leva ao fluxo de mesa/convite com o modo definido; cancelar ou Escape não cria rascunho. Acesso direto sem escolha válida também exige o modal. O editor mostra o modo escolhido sem seletor inline; edição restaura o modo salvo. Transcrição independente libera valores atuais dentro dos limites, sem calcular XP histórico; o vínculo mantém as regras da mesa.
- Retratos compactos de personagens e NPCs oferecem enviar/substituir, editar título/enquadramento e remover com confirmação para usuários autorizados. Durante carregamento, distinguir consulta de retrato ausente. Falhas de confirmação preservam a reserva para repetir sem novo upload; falhas ao atualizar a lista após sucesso confirmado orientam recarregar. Galeria mantém ações e permissões por item.
- Sem mesa, fichas de jogador permitem distribuição livre de atributos (1–5), habilidades (0–5) e Disciplinas conhecidas (0–5). Requisitos de criação aparecem como avisos na validação, sem impedir a conclusão. Selecionar clã não exige pacote 2+1 nem apaga Disciplinas existentes. Fichas vinculadas mantêm regras e aprovação do Narrador.
- Nosferatu apresenta Aparência sempre −2. Vantagens positivas de Aparência ficam preservadas no cadastro e identificadas como ignoradas no resumo, inclusive concessões de predação; Siren não impede a seleção de Nosferatu.
- O acesso ao catálogo na listagem de mesas se chama “Pesquisa de habilidades” e abre em nova guia.
- Quando a fonte não fixa a pontuação de Exclusão de Presa de Assassino de Estrada, o jogador escolhe de 1 a 5 pontos no seletor de predação. O valor é validado no servidor e aplicado ao defeito com origem rastreável; a habilitação do suplemento pela mesa continua obrigatória.
- “Pesquisa de vantagens e defeitos” abre `/master/vantagens-defeitos` em nova guia, com autorização de Narrador no servidor. Exibe nomes PT/EN, graduações, restrições, elegibilidade, XP a partir de zero e fontes; filtros e paginação servem somente à consulta, sem conceder traços nem pontos.

### Dados e decisões narrativas

- Rolagens são geradas no servidor. O seletor distingue atributo + habilidade, check, Força de Vontade e Humanidade; os três últimos não recebem Fome. Taking Half e vitória automática são operações distintas conduzidas pelo Narrador, sem sorteio.
- O histórico preserva dados originais e revisões. Selecionar de um a três dados comuns permite uma única rerrolagem por Vontade, com 1 dano superficial; dados de Fome ficam indisponíveis. Reenvio conserva a operação para evitar nova cobrança. Dificuldade reservada mantém alvo e resolução fora do DTO do jogador; nesse caso o Narrador conduz a rerrolagem.
- Complicações e falha narrativa são decisões separadas do total rolado. Ofertas de vitória a custo exigem falha com sucesso parcial e aceitação explícita do proprietário. Notas privadas e rolagens secretas não aparecem ao jogador nem ao Narrador de outra mesa.
- Fontes de dados abrem em nova guia com livro, edição e páginas impressa/física. PDFs são servidos por rota autenticada e IDs permitidos, sem expor caminhos locais.
- Durante a chamada, reutilizar a rolagem da ficha por `CallRolls`; a lista é autorizada no servidor e oferece ao jogador somente suas fichas aprovadas. A extensão a NPCs/carniçais e ao perfil ampliado é objetivo da SPEC-008, condicionada à implementação e aos testes; não presumir que já esteja disponível.

### Esqueleto atualizado

```tsx
<main className="min-h-screen bg-background text-foreground">
  <div className="noise" aria-hidden="true" />
  <ArchiveHeader title="Contexto da tela" showCampaigns={temMesasProprias} />
  <div className="archive-content">
    <section className="archive-page-heading">
      <p className="eyebrow">Seção / contexto</p>
      <h1 className="font-serif text-4xl uppercase sm:text-6xl">Título</h1>
      <p className="text-sm text-muted-foreground">Descrição curta.</p>
    </section>
    <section>...</section>
  </div>
</main>
```

---

## 5. Classes CSS reutilizáveis (definidas em `globals.css`)

Sempre verificar se uma classe existente resolve antes de criar uma nova:

| Classe | Finalidade |
|--------|------------|
| `.noise` | Textura de ruído sobreposta (fixada, não interativa) |
| `.sigil` | Logo/ícone quadrado com borda vermelha |
| `.eyebrow` | Label de seção: mono, vermelho, uppercase, rastreado |
| `.button-primary` | Botão de ação principal (vermelho) |
| `.button-ghost` | Botão secundário / navegação discreta |
| `.input` | Campo de texto padronizado |
| `.select` | Select padronizado |
| `.character-card` | Card de entidade/registro |
| `.portrait` | Avatar de personagem (52×52) |
| `.status` | Badge de status com ponto visual |
| `.meta` | Bloco de metadados alinhado à direita |
| `.actions` | Grupo de ações no rodapé do card |
| `.action-edit` | Botão de edição compacto |
| `.action-delete` | Botão de exclusão compacto (vermelho) |
| `.empty-state` | Estado vazio com borda tracejada |
| `.toast` | Modal de alerta/feedback central |

---

## 6. Responsividade

| Breakpoint | Comportamento |
|------------|---------------|
| `< 640px` (mobile) | 1 coluna, botões full-width, filtros empilhados |
| `640px–1023px` (tablet) | Até 2 colunas quando o conteúdo comportar |
| `≥ 1024px` (desktop) | `.archive-content`, flex para cabeçalhos, grid para coleções |

- ✅ Usar `gap-*` para espaçamento
- ❌ Nunca usar `space-*`
- ❌ Nunca depender de hover para revelar informação em mobile

---

## 7. Componentes — regras rápidas

### Botões
- Textos dos botões usam a família serifada `--font-serif`, preservando os tamanhos de cada variante.
- Ações no infinitivo: `Criar`, `Editar`, `Salvar`, `Excluir`. CTAs editoriais já presentes na referência, como “Conte sua história” e “Verifique seus contratos”, mantêm sua redação.
- `min-height: 40px` (34px só em ações compactas de card)
- Estados obrigatórios: normal, hover, focus-visible, disabled

### Campos
- Todo campo com `<label>` visível ou `sr-only` — nunca omitir
- Placeholder orienta, nunca substitui label

### Cards
- Fundo `bg-card` (`#151519`), borda `border-border`
- Hover: borda `#6b3436`, fundo `#19191d`
- Ações separadas por divisória superior

### Status
- `.status.active` → verde `#9ac59b`
- `.status.risk` → laranja `#df9d85`
- Nunca comunicar estado só pela cor (usar texto explícito)

### Estados vazios
- Usar `.empty-state`
- Sempre explicar: sem dados, sem resultados ou erro — nunca deixar vazio sem contexto

---

## 8. Acessibilidade obrigatória

- [ ] HTML semântico: `header`, `main`, `section`, `nav`, `button`, `article`
- [ ] Foco visível com `:focus-visible` usando token `--ring`
- [ ] `aria-hidden="true"` em ícones decorativos
- [ ] `role="status"` ou `role="alert"` em toasts
- [ ] Confirmação antes de ações destrutivas
- [ ] Respeitar `prefers-reduced-motion`

---

## 9. Conteúdo e idioma

- Todo texto da interface em **português do Brasil**
- Nome da marca: **Arquivos da Noite** na interface; **Meus Vampiros** é o nome do projeto
- Frases curtas e operacionais
- Não misturar PT-BR e EN em labels da mesma tela

---

## 10. Checklist para novas páginas

Antes de considerar uma página pronta, verificar:

- [ ] Usa tokens de cor — sem hexadecimais avulsos
- [ ] Hierarquia: eyebrow → título → descrição → ação
- [ ] Layout verificado em 390px, 768px e 1440px; registrar pendência quando QA manual não for executado
- [ ] Todos os campos têm label e estados de foco
- [ ] Ações destrutivas diferenciadas e com confirmação
- [ ] Estados de loading, erro e vazio implementados
- [ ] Textos em português
- [ ] Sem emojis em elementos de interface
- [ ] Nenhuma dependência nova sem necessidade

---

## 11. Referências

- Detalhamento completo: [`design-system.md`](./design-system.md)
- Estilos globais: [`app/globals.css`](./app/globals.css)
- Histórico de alterações: [`CHANGELOG.md`](./CHANGELOG.md)

---

## 12. Evolução de interface — SPEC-008 e SPEC-009

### 12.1 Regra de precedência e preservação

- Este guia e `design-system.md` são a base visual vigente. As propostas de protótipo com tons grafite/vinho devem ser mapeadas para tokens existentes, **não** substituí-los por hexadecimais diretamente nos componentes.
- Não renomear a marca visível **Arquivos da Noite**, nem remover `ArchiveHeader`, rotas, autorizações, validações ou ações existentes por razões puramente visuais.
- Quando um comportamento planejado nas SPECs conflitar com uma regra operacional já implementada, preservar o comportamento existente até decisão explícita e teste de regressão. Distinguir **proposta**, **em implementação** e **implementado**.
- A identidade de dossiê é uma composição de componentes compartilhados, não uma licença para reproduzir o mesmo layout indiscriminadamente em todas as páginas.

### 12.2 Dossiê unificado — SPEC-008

- Aplicar a mesma linguagem visual a jogador, NPC vampiro, NPC humano e carniçal. Adaptar os campos mecânicos conforme a natureza do personagem; não exibir Fome ou Potência de Sangue como recursos de humanos e carniçais.
- Cabeçalho: retrato opcional, nome, conceito, tipo, status, clã/seita/geração quando aplicáveis, campanha e indicadores de recursos autorizados. Usar placeholder quando não houver retrato.
- Navegação contextual agrupada: **Visão geral / Perfil / História**, **Atributos / Habilidades / Disciplinas / Vantagens e defeitos**, **Relações / Organizações / Pilares**, **Inventário / Propriedades**, **Rolagens / Combate / Evolução / Histórico**. Ocultar itens inaplicáveis; não criar páginas vazias para funcionalidades ainda não implementadas.
- Informações exclusivas do Narrador (segredos, ganchos, ajustes narrativos e rolagens secretas) só devem ser retornadas por endpoints autorizados; nunca apenas escondidas com CSS.
- NPCs podem ter ficha completa ou simplificada. A visualização é compartilhada, mas as regras de criação, edição, propriedade e autorização continuam específicas. Carniçais devem expor vínculo com regente vampiro existente quando cadastrado.
- Ações de edição contextual podem complementar o editor completo, nunca substituí-lo. Reutilizar componentes, validação e persistência; indicar carregamento, sucesso e erro sem alterar valores confirmados antes da resposta do servidor.
- No desktop, menu contextual lateral e painel principal; em mobile, menu recolhível ou abas acessíveis e drawer para ações densas. Evitar menus que ocupem largura fixa e comprimam o conteúdo.

### 12.3 Rolagens integradas — SPEC-008

- Disponibilizar ação **Rolar** junto a atributos, habilidades, disciplinas e testes de combate quando o fluxo estiver implementado. O painel deve exibir composição da parada, dados comuns/de Fome, modificadores, dificuldade visível quando autorizada, resultado e acesso ao histórico.
- Reutilizar o motor V5 e `CallRolls` existentes, com resolução e validação no servidor. Não criar sorteio concorrente no cliente nem duplicar regras mecânicas.
- Respeitar as distinções vigentes entre teste comum, checks sem Fome, Força de Vontade, Humanidade, Taking Half, vitória automática e rerrolagens. Complicações narrativas e consequências dependem das decisões autorizadas do Narrador.
- Rolagens de NPCs podem ser públicas ou secretas conforme autorização. Nunca expor alvo reservado, detalhes privados ou rolagens secretas em DTOs, eventos, histórico ou telas de jogadores.
- O Modo Sessão existente mantém videochamada e seções atuais; o painel de rolagens é integrado progressivamente, sem reconstruir o módulo de campanha/sessão.

### 12.4 Listagens e cards — SPEC-009

- Usar a mesma base de card/lista para personagens, NPCs e carniçais, com adaptações semânticas por tipo. Filtros por tipo, status, clã e mesa, pesquisa e alternância cards/lista são melhorias progressivas, não requisitos para remover listagens atuais.
- **Contrato visual obrigatório do card de jogador:** nome, status (inclusive Rascunho), conceito, clã, geração, nome da mesa, descrição da mesa e **XP (gasto/total)**. Dados ausentes devem ter tratamento explícito e não ser inventados.
- **Ações obrigatórias quando autorizadas:** Resumo, Duplicar, Editar e Excluir ficha. Preservar destinos e fluxos existentes, confirmação de exclusão e feedback de falhas. Ações não autorizadas não devem ser expostas como funcionais.
- Retrato é opcional; sem imagem, exibir placeholder temático e manter todos os campos legíveis. Nunca substituir campos existentes por fotografia, ícones ou tooltip exclusivo.
- Nos cards de NPC humano e carniçal, omitir clã/geração quando inaplicáveis, sem inventar valores; exibir tipo, regente e outros metadados relevantes somente quando disponíveis.
- Títulos, badges, metadados, separadores e botões devem usar tokens/classes existentes. As quatro ações precisam permanecer acessíveis no mobile, sem depender de hover.

### 12.5 Padrões por área — SPEC-009

| Área | Padrão de composição | Preservação obrigatória |
|---|---|---|
| Dashboard | Resumos e atalhos de continuidade | Acessos autorizados e estados reais |
| Personagens / NPCs / Carniçais | Cards ou lista com filtros contextuais | Campos, ações e permissões existentes |
| Criação / edição | Etapas ou seções de formulário, revisão e feedback | Modos de criação, regras V5 e dados salvos |
| Dossiê / resumo | Cabeçalho, indicadores, navegação contextual e conteúdo | Informações da ficha e links existentes |
| Campanhas / mesas | Cabeçalho da crônica, participantes, sessões e gestão | Convites, aprovação, arquivamento e privacidade |
| Modo Sessão | Videochamada e painéis expansíveis de jogo | Fluxos e ordem funcional existentes |
| Catálogos | Busca, filtros, detalhes, fontes e graduações | IDs, nomes oficiais, traduções e regras de elegibilidade |
| Inventário / XP / histórico | Listas e linha do tempo, ações contextualizadas | Auditoria, saldo e histórico persistidos |
| Configurações / notas | Formulários e painéis de leitura/edição | Controle de acesso e anexos privados |

### 12.6 Componentização sugerida

- `AppShell` ou composição equivalente deve **reutilizar** `ArchiveHeader` e `.archive-content`, não criar um segundo cabeçalho global.
- Extrair conforme necessidade: `PageHeader`, `ContextNavigation`, `EntityCard`, `CharacterDossier`, `CharacterHeader`, `CharacterStats`, `CharacterRelations`, `DicePanel`, `CatalogBrowser`, `EmptyState` e `ConfirmDialog`.
- Componentes de apresentação recebem props tipadas; consultas, autorização, cálculo de XP e rolagens ficam no servidor ou serviços de domínio existentes.
- Reutilizar `.character-card`, `.portrait`, `.status`, `.actions`, `.button-primary`, `.button-ghost` e tokens antes de criar variantes.

### 12.7 Critérios de aceite adicionais

- [ ] Nenhum campo ou ação do card atual de jogador desaparece após o redesenho.
- [ ] NPCs e carniçais compartilham o padrão visual sem receber mecânicas inaplicáveis.
- [ ] Navegação global e contextual são distintas, acessíveis e responsivas.
- [ ] As rolagens visíveis reutilizam a lógica e as autorizações existentes no servidor.
- [ ] Informações privadas não são enviadas ao cliente sem autorização.
- [ ] Não há cores literais novas em JSX/TSX; mudanças de paleta exigem revisão de `design-system.md` e `globals.css`.
- [ ] Funcionalidades ainda planejadas não são apresentadas como operacionais.
- [ ] Testar fluxos críticos em 390px, 768px e 1440px e registrar regressões.

### Referências das mudanças

- **SPEC-CHAR-008:** Dossiê Unificado de Personagens, NPCs e Sistema de Rolagens V5.
- **SPEC-UI-009:** Padronização Visual do Meus Vampiros e preservação dos cards de personagem.
