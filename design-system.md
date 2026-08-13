# Ledger Command — Guia de padronização visual

## 1. Objetivo

Este documento define as regras para implementar novas páginas, componentes e fluxos do Ledger Command com uma identidade consistente de horror gótico: escura, austera, legível e funcional.

A interface deve parecer um **arquivo de comando restrito**, não uma tela genérica de dashboard. O terror aparece na atmosfera, nos contrastes e nos detalhes editoriais; nunca deve prejudicar a compreensão ou a operação.

## 2. Princípios de produto

1. **Clareza antes da atmosfera** — cada ação deve ter rótulo e feedback compreensíveis.
2. **Tensão controlada** — vermelho é reservado para perigo, ações destrutivas e elementos prioritários.
3. **Densidade editorial** — usar divisórias, etiquetas técnicas e metadados para criar sensação de arquivo.
4. **Responsividade desde o início** — projetar primeiro para telas estreitas e expandir com Flexbox/Grid.
5. **Acessibilidade obrigatória** — foco visível, contraste adequado, labels e áreas de toque amplas.

## 3. Paleta oficial

Usar somente os tokens do tema. Evitar cores diretas como `text-white`, `bg-black` ou hexadecimais espalhados pelos componentes.

| Token | Uso | Valor de referência |
| --- | --- | --- |
| `background` | Fundo geral | `#0d0d0f` |
| `card` | Painéis e cartões | `#151519` |
| `foreground` | Texto principal | `#eee9e2` |
| `muted-foreground` | Metadados e descrições | `#9b9792` |
| `border` | Divisórias e contornos | `#343238` |
| `primary` | Ação principal / perigo | `#9f2024` |
| `primary-foreground` | Texto sobre ação principal | `#fff8f1` |
| `ring` | Foco de teclado | `#d7b49b` |

### Regras de cor

- Vermelho deve aparecer em botões primários, status de risco, alertas e elementos de atenção.
- Não usar vermelho como fundo de seções inteiras.
- Não introduzir novas cores sem atualizar a tabela e verificar o contraste.
- Para estados positivos, preferir tons verdes discretos apenas em etiquetas de status.

## 4. Tipografia

- **Títulos:** `font-serif`, usando Cormorant Garamond/Georgia.
- **Interface e corpo:** `font-sans`, usando Geist.
- **Dados técnicos:** `font-mono`, usando Geist Mono.
- Máximo de duas famílias tipográficas visíveis; a mono é tratada como variação técnica do sistema.

### Escala recomendada

- Eyebrow/etiqueta: `text-[10px]`, caixa alta, `tracking-[0.18em]` a `tracking-[0.3em]`.
- Corpo: `text-sm leading-6`.
- Título de página: `text-4xl sm:text-5xl`, serifado, caixa alta moderada.
- Título de card: `text-xl`, serifado.
- Valores de resumo: `text-2xl`, serifado.

Evitar títulos totalmente condensados, textos menores que 12px e parágrafos longos em caixa alta.

## 5. Estrutura de página

Toda página autenticada deve seguir, quando aplicável, esta sequência:

1. `<header>` com marca, contexto da seção e sessão do operador.
2. `<main>` com largura máxima `max-w-7xl`, padding lateral `px-5 sm:px-8 lg:px-10`.
3. Cabeçalho da página com eyebrow, título, descrição e ação principal.
4. Conteúdo principal em painel, tabela, lista ou grade.
5. Feedback contextual com toast, alerta inline ou estado vazio.

Exemplo de esqueleto:

```tsx
<main className="min-h-screen bg-background text-foreground">
  <div className="noise" aria-hidden="true" />
  <header className="border-b border-border bg-card/80">...</header>
  <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
    <section className="border-b border-border pb-8">...</section>
    <section className="mt-8">...</section>
  </div>
</main>
```

## 6. Componentes e estados

### Botões

- Ação principal: `.button-primary`.
- Ação secundária ou navegação discreta: `.button-ghost`.
- Edição: `.action-edit`.
- Exclusão: `.action-delete`.
- Sempre usar verbo no infinitivo: `Criar`, `Editar`, `Excluir`, `Salvar`.
- Garantir `min-height: 40px` para ações comuns e `34px` somente em ações compactas de card.
- Estados obrigatórios: normal, hover, focus-visible, disabled e loading quando aplicável.

### Campos e filtros

- Todo campo precisa de `<label>` visível ou `sr-only`.
- Usar `.input` e `.select` para manter bordas, fundo e foco consistentes.
- Em desktop, organizar filtros em linha; em mobile, empilhar com largura total.
- Placeholders orientam, mas nunca substituem labels.

### Cards

Usar `.character-card` como referência para entidades e registros:

- contorno de `border-border`;
- fundo `bg-card`;
- padding mínimo `p-4`;
- hover apenas alterando borda e fundo;
- ações separadas por uma divisória superior;
- metadados alinhados à direita no desktop e ocupando uma linha própria no mobile.

### Status

Usar `.status` com texto e ponto visual. O texto deve ser explícito: `Ativo`, `Em risco`, `Arquivado`, `Pendente`.

Não comunicar estado apenas pela cor. O status deve continuar compreensível em escala de cinza e para leitores de tela.

### Estados vazios

Usar `.empty-state` com:

- título curto;
- explicação de uma linha;
- ação recomendada, se houver.

Evitar deixar áreas vazias sem explicar se não há dados, se a busca não encontrou resultados ou se houve erro.

## 7. Responsividade

### Mobile: abaixo de 640px

- Uma coluna.
- Botões de ação com largura total quando estiverem em grupos.
- Metadados abaixo do conteúdo principal.
- Filtros empilhados e ocupando a largura disponível.
- Não depender de hover para revelar informação.

### Tablet: 640px a 1023px

- Permitir duas colunas quando o conteúdo comportar.
- Manter padding lateral intermediário.
- Preservar títulos com quebras naturais usando `text-balance` ou `text-pretty`.

### Desktop: 1024px ou mais

- Usar `max-w-7xl` para evitar linhas excessivamente largas.
- Preferir Flexbox para cabeçalhos e barras de filtros.
- Usar Grid apenas em resumos, coleções e layouts bidimensionais.

Não usar `space-*`; preferir `gap-*`. Evitar valores arbitrários quando houver uma classe Tailwind equivalente.

## 8. Iconografia e textura

- Usar ícones existentes no projeto ou uma biblioteca consistente.
- Nunca usar emoji como ícone de interface.
- Ícones decorativos devem ter `aria-hidden="true"`.
- A textura `.noise` deve ser sutil, fixa e não interativa.
- Não adicionar blobs, círculos luminosos, gradientes decorativos ou SVGs complexos sem função.

## 9. Acessibilidade e interação

- Usar HTML semântico: `header`, `main`, `section`, `article`, `nav` e `button`.
- Todo botão precisa comunicar sua finalidade pelo texto ou `aria-label`.
- Manter foco visível com `:focus-visible` e o token `ring`.
- Confirmar ações destrutivas antes de executá-las.
- Toasts devem usar `role="status"` ou `role="alert"` conforme a urgência.
- Respeitar `prefers-reduced-motion` para animações.
- O contraste deve ser verificado principalmente em texto mutado, bordas e status.

## 10. Conteúdo e nomenclatura

- Todo texto da interface deve estar em português do Brasil.
- Manter `Ledger Command` como nome da marca.
- Usar frases curtas e operacionais.
- Preferir `Última atualização`, `Estado`, `Registro`, `Operador` e `Acesso restrito` para metadados.
- Evitar misturar português e inglês em labels da mesma tela.

## 11. Checklist para novas páginas

- [ ] A página usa os tokens do tema, sem cores diretas desnecessárias.
- [ ] Existe hierarquia clara: eyebrow, título, descrição e ação.
- [ ] O layout funciona em 390px, 768px e desktop.
- [ ] Todos os campos possuem labels e estados de foco.
- [ ] Ações destrutivas são visualmente diferenciadas e confirmadas.
- [ ] Loading, erro e estado vazio foram considerados.
- [ ] Textos visíveis estão em português.
- [ ] Não há emoji, decoração sem função ou dependência nova sem necessidade.
- [ ] A página foi testada no navegador antes de ser considerada pronta.

## 12. Critério de pronto

Uma nova página está alinhada ao Ledger Command quando parece pertencer ao mesmo arquivo visual: fundo carvão, tipografia editorial, metadados técnicos, vermelho usado com intenção, componentes previsíveis e comportamento responsivo. A estética deve reforçar o contexto de horror sem competir com a tarefa principal do usuário.

## 13. Referência de classes existentes

As classes reutilizáveis atualmente definidas em `app/globals.css` são:

- `.noise`
- `.sigil`
- `.eyebrow`
- `.select-label`
- `.button-primary`
- `.button-ghost`
- `.input`
- `.select`
- `.character-card`
- `.portrait`
- `.status`
- `.meta`
- `.actions`
- `.action-edit`
- `.action-delete`
- `.empty-state`
- `.toast`

Antes de criar uma nova classe, verificar se uma dessas classes, um token semântico ou uma composição Tailwind resolve o caso.
