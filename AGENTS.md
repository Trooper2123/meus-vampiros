<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

# Ledger Command — Regras do Agente

## UI e Layout

- **Sempre** ler [`UI-GUIDE.md`](./UI-GUIDE.md) antes de criar uma nova página ou componente visual.
- Para o detalhamento completo de tokens, classes e padrões, consultar [`design-system.md`](./design-system.md).
- Nunca usar hexadecimais avulsos ou classes Tailwind de cor direta (`text-white`, `bg-black`). Usar os tokens CSS definidos em `globals.css`.
- Todo texto de interface deve estar em **português do Brasil**.

## Changelog

- Após cada commit (ou conjunto de mudanças), atualizar [`CHANGELOG.md`](./CHANGELOG.md) com:
  - Data e horário (BRT)
  - Tipo: `feat | fix | refactor | style | chore | docs`
  - Arquivos principais alterados
  - Resumo em bullets do que foi implementado

## Planejamento de funcionalidades

- Para toda nova funcionalidade relevante, seguir o roteiro de [`.kiro/specs/README.md`](./.kiro/specs/README.md).
- Criar a spec em `.kiro/specs/<nome-da-funcionalidade>/` a partir de [`.kiro/specs/_template/`](./.kiro/specs/_template/).
- Manter `requirements.md`, `design.md` e `tasks.md` sincronizados com as decisões e o estado real da implementação.
- Atualizar o status da tarefa para `in_progress` antes de editar código e para `completed` somente após as validações previstas.

## Revisão pré-commit

- Antes de sugerir um commit, usar a skill `pre-commit-review` para revisar as mudanças.
- Nunca aprovar commit com segredos expostos, rotas sem validação ou erros TypeScript.
