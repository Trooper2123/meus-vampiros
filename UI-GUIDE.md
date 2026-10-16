# UI-GUIDE — Direcionamento de Layout e Tema

> Este arquivo é a referência de consulta obrigatória do agente ao construir novas páginas ou implementar atualizações visuais no projeto **Arquivos da Noite**.
> O arquivo `design-system.md` contém o detalhamento completo; este documento é o resumo operacional de acesso rápido.

---

## 1. Identidade visual

**Arquivos da Noite** é uma interface de horror gótico: escura, austera, editorial e funcional.
A atmosfera é de um **arquivo de comando restrito**. Tensão sem ruído; funcionalidade sem frivolidade.

### Princípio-chave
> Clareza antes de atmosfera. Vermelho só quando tem intenção.

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
- Cards de personagem: nome e status textual, conceito, clã/geração, mesa, XP, ações com divisória. Preservar agrupamentos e ações já existentes.
- Ficha: identidade, recursos autorizados do servidor, atributos, habilidades, especialidades e demais seções. Recursos têm botões compactos − / + com nomes acessíveis; Humanidade oferece somente + ao Narrador. Vitalidade/Vontade apresentam contadores separados por dano superficial e agravado, com os botões ao lado. Cada clique salva automaticamente com motivo contextual, revisão e idempotência, respeitando permissões. O resumo só muda após confirmação do servidor; falhas preservam os valores confirmados e permitem reenvio seguro. Fome 1→0 usa dialog com Cancelar como foco inicial, sem penalidades automáticas. Manchas ficam em disclosure. Recursos usam 1/2/4 colunas em celular/tablet/desktop para acomodar os controles.
- Gestão: notas → ferramentas/calendários → início da noite → revisões → NPC/participantes. Não esconder informação privada apenas com CSS.
- Formulários usam dados reais, labels e estados existentes; exemplos e observações do PDF não são conteúdo do produto.
- O PDF não autoriza criar mecânicas novas de bônus, ignorar permissões ou reduzir os catálogos aos exemplos demonstrativos.

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
