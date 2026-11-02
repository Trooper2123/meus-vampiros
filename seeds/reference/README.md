# Seeds de referências V5 — extração em andamento

**Data:** 2026-11-02
**Status:** primeira etapa de indexação, **não** extração mecânica completa, **não** importado no banco.
**SPECs:** [RPG-022](../../codex/specs/catalogo-npcs-antagonistas-livros/requirements.md) e [RPG-023](../../codex/specs/antecedentes-clan-loresheets/requirements.md).

## Arquivos

| Arquivo | Registros | Destino e status |
|---|---:|---|
| `loresheets-v5.json` | 78 | Metadados bibliográficos e páginas de PDF, **não selecionáveis** |
| `npcs-v5.json` | 10 | Referências de personagens canônicos, sem estatísticas, **não importáveis como ficha pronta** |
| `generic-antagonists-v5.json` | 10 | Arquétipos **originais/homebrew** suplementares, em formato `NpcData` de ficha intermediária |

O projeto já mantém **15 modelos genéricos** em `lib/npc-domain.ts` / `NPC_TEMPLATES`. Estes dez modelos suplementares evitam repetir aqueles IDs e podem ser curados antes de integrar no catálogo.

## Validação

```bash
node scripts/validate-reference-seeds.mjs
```

O script valida unicidade de identificadores, referência de origem, ausência de efeitos/estatísticas canônicas não revisados e formatos dos modelos genéricos. Não modifica o banco e **não** substitui os testes de integração nem a revisão editorial.

## Cobertura de Loresheets, nesta primeira etapa

| Fonte | Referências localizadas |
|---|---:|
| Corebook | 9 |
| Chicago by Night | 22 |
| The Chicago Folios | 12 |
| Let the Streets Run Red | 5 |
| Cults of the Blood Gods | 2 |
| Forbidden Religions | 3 |
| Blood Sigils | 2 |
| In Memoriam | 2 |
| Live from the Succubus Club | 6 |
| Sabbat: The Black Hand | 13 |
| The Fall of London | 2 |

Outras Loresheets, variantes, páginas, perfis e livros disponíveis ainda precisam de inventário. `printedPage` fica `null` até conferência da paginação impressa. `pdfPage` é a página ordinal do arquivo PDF disponibilizado, **não** deve ser interpretada como página impressa. Quando um nome ocorre em múltiplas obras, as referências permanecem separadas por fonte.

## Próximos passos para finalizar a extração completa

1. Inventariar **todas** as Loresheets por publicação, incluindo livros ainda não indexados e referências não localizadas na primeira passagem. Resolver repetições e versões divergentes com rastreabilidade.
2. Revisar **cada nível independente** de cada Loresheet: nome, pontos, requisitos e efeito, sem inferência. Aprovar direitos de conteúdo para uso no site.
3. Extrair fichas **completas** dos SPCs/NPCs dos livros, respeitando a estrutura original (`FULL`/`INTERMEDIATE`/`SIMPLE`) e marcar quais têm somente biografia. Não converter menções em fichas.
4. Distinguir nomenclatura oficial, traduções editoriais e adaptações; registrar livro, edição, página impressa e PDF.
5. Validar todos os registros com curadoria, aprovação editorial e testes; somente então alterar `publication` ou `mechanicsStatus` e gerar seeds de banco.
6. Integrar catálogo com os fluxos existentes `/npcs`, `/api/npc-templates`, `/api/merits-flaws`, sem duplicação do domínio.
7. Confirmar o **DATABASE_URL de desenvolvimento isolado** e autorização de migração/seed, executar em ambiente de testes validado, sem tocar produção.

## Direitos e segurança

Os índices bibliográficos **não** reproduzem descrições, tabelas, estatísticas ou arte protegidas dos livros. Referências canônicas estão explicitamente bloqueadas para importação automática. Não expor PDFs privados como recursos públicos. Qualquer disponibilização de texto mecânico integral dependerá de direitos de uso adequados; a posse local de um PDF não concede licença de redistribuição.

Os modelos originais não são apresentados como oficiais e seus pools são criações para o aplicativo. Nada foi publicado no catálogo do site ou gravado no PostgreSQL por este commit.
