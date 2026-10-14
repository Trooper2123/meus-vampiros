# UI-GUIDE — Direcionamento de Layout e Tema

> Este arquivo é a referência de consulta obrigatória do agente ao construir novas páginas ou implementar atualizações visuais no projeto **Ledger Command**.
> O arquivo `design-system.md` contém o detalhamento completo; este documento é o resumo operacional de acesso rápido.

---

## 1. Identidade visual

**Ledger Command** é uma interface de horror gótico: escura, austera, editorial e funcional.
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
- ✅ Verde discreto apenas em: etiquetas de status `Ativo`
- ❌ Não criar novas cores sem atualizar `design-system.md`

---

## 3. Tipografia

| Papel | Família | Classe Tailwind |
|-------|---------|-----------------|
| Títulos editoriais | Cormorant Garamond / Georgia | `font-serif` |
| Interface e corpo | Geist | `font-sans` (padrão) |
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

Toda página autenticada segue esta hierarquia:

```tsx
<main className="min-h-screen bg-background text-foreground">
  <div className="noise" aria-hidden="true" />          {/* textura fixa */}
  <header className="border-b border-border bg-card/80">  {/* marca + sessão */}
    ...
  </header>
  <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
    {/* Cabeçalho da página */}
    <section className="border-b border-border pb-8">
      <p className="eyebrow">SEÇÃO / CONTEXTO</p>
      <h1 className="font-serif text-4xl">Título da Página</h1>
      <p className="text-muted-foreground text-sm">Descrição curta.</p>
    </section>
    {/* Conteúdo principal */}
    <section className="mt-8">
      ...
    </section>
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
| `≥ 1024px` (desktop) | `max-w-7xl`, flex para cabeçalhos, grid para coleções |

- ✅ Usar `gap-*` para espaçamento
- ❌ Nunca usar `space-*`
- ❌ Nunca depender de hover para revelar informação em mobile

---

## 7. Componentes — regras rápidas

### Botões
- Texto sempre no infinitivo: `Criar`, `Editar`, `Salvar`, `Excluir`
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
- Nome da marca: **Ledger Command** (invariável)
- Frases curtas e operacionais
- Não misturar PT-BR e EN em labels da mesma tela

---

## 10. Checklist para novas páginas

Antes de considerar uma página pronta, verificar:

- [ ] Usa tokens de cor — sem hexadecimais avulsos
- [ ] Hierarquia: eyebrow → título → descrição → ação
- [ ] Layout testado em 390px, 768px e 1280px
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
