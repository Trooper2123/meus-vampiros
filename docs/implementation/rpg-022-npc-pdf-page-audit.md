# RPG-022 — Primeira conferência de páginas de NPCs nos PDFs

**Data:** 2026-11-05. **Escopo:** amostra das dez referências de `seeds/reference/npcs-v5.json`, verificada diretamente nos PDFs anexados ao projeto. **Não é extração de ficha nem autorização para publicar conteúdo mecânico.**

A página é **ordinal do PDF** (primeira página = 1), não a página impressa. A presença de um bloco de estatísticas na página **não prova que o bloco pertença ao personagem procurado**, pois verbetes podem atravessar páginas.

| Livro | NPC | Página PDF do índice | Nome encontrado na página? | Termos mecânicos na página? | Próxima verificação |
|---|---|---:|---|---|---|
| Chicago by Night | Kevin Jackson | 210 | Sim | Não | Identificar intervalo completo do verbete e bloco mecânico |
| Chicago by Night | Naomi Stewart | 220 | Sim | Não | Conferir continuação e início do bloco mecânico |
| Chicago by Night | Gengis | 98 | Sim | Não | Conferir páginas adjacentes |
| Chicago by Night | Alan Sovereign | 217 | Sim | Sim | Confirmar atribuição e transcrever apenas campos autorizados |
| The Fall of London | Darius Shirazi | 35 | Sim | Não | Conferir páginas adjacentes |
| The Fall of London | Mickey Wheeler | 42 | Sim | Sim | Conferir bloco e campos disponíveis |
| Let the Streets Run Red | Juggler | 157 | Sim | Não | Localizar ficha nas páginas adjacentes |
| Let the Streets Run Red | Tessa Greene | 216 | Sim | Sim, trecho de disciplinas no início | Distinguir trecho de personagem anterior e localizar bloco da Tessa |
| Let the Streets Run Red | Modius | 208 | Sim | Sim | Confirmar limites do bloco |
| Let the Streets Run Red | Alan Sovereign | 220 | Sim | Não | Localizar início e fim do verbete |

**Método:** inspeção do texto extraível da página, busca literal do nome e termos `Attributes`, `Skills`, `Disciplines`, `Blood Potency`, `Health` e `Willpower`. Não foi feito OCR nem revisão visual de cada bloco. Portanto, **não alterar** `statistics: null`, `mechanicsStatus: NOT_EXTRACTED`, `publication: REFERENCE_ONLY` ou `rightsStatus: METADATA_ONLY` com base apenas nesta conferência.

## Próximas tarefas

1. Delimitar cada verbete nas páginas anteriores/posteriores e identificar exatamente o bloco de estatísticas correspondente.
2. Inventariar novos NPCs por livro e registrar `bookCode`, `pdfPage`, `printedPage` (quando comprovada), completude e status editorial.
3. Mapear cada campo disponível à tipagem `NpcData`, sem inventar valores nem converter descrições narrativas em pontos mecânicos.
4. Revisar direitos de uso antes de incorporar estatísticas, biografias extensas ou arte ao catálogo distribuído.
5. Após revisão, validar os seeds e testar importação isolada no banco **persistente de desenvolvimento**, com migration incremental e sem sobrescrever registros existentes.

## Referências internas

- `seeds/reference/npcs-v5.json`
- `seeds/reference/README.md`
- `codex/specs/catalogo-npcs-antagonistas-livros/requirements.md`
- `scripts/validate-reference-seeds.mjs`
