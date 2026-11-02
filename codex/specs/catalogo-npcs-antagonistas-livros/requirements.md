# SPEC-RPG-022 — Catálogo de NPCs e antagonistas dos livros

**Status:** proposed | **Versão:** 1.0 | **Branch:** develop | **Natureza:** SPEC, não implementação

## Objetivo

Oferecer ao Narrador uma **biblioteca pesquisável de NPCs e antagonistas pré-criados**, provenientes das obras de referência da V5 autorizadas para uso no projeto. A biblioteca deve ser uma **aba/página adicional** do atual catálogo de NPCs, com opção **Adicionar à mesa**, seguindo a experiência do seletor **Adicionar habilidade**. A adição deve clonar dados para uma instância editável da campanha, mantendo intacto o template da biblioteca.

## Contexto do repositório

Já existem `/npcs`, `components/npcs/npc-catalogue`, `/api/npcs`, `/api/npc-templates`, `npc_definitions`, `campaign_npcs`, `lib/npc-store.ts` e `/api/campaigns/[id]/npcs`. **Reutilizar** o domínio e as permissões atuais. Verificar capacidade dos templates existentes antes de criar novas tabelas.

## Fontes verificadas e cobertura

- *Vampire: The Masquerade V5 Corebook*: antagonistas, SPCs e regras de construção de personagens do Narrador.
- *Chicago by Night*: elenco da cidade e personagens com perfis e regras.
- *The Chicago Folios*: biografias, blocos de estatísticas e ganchos.
- *Let the Streets Run Red*: capítulo de biografias com blocos de estatísticas; capítulo de personagens prontos. A publicação distingue antagonistas/SPCs de fichas prontas.
- *The Fall of London*: SPCs detalhados com atributos, habilidades, potência de sangue e disciplinas.
- *Companion*: regras de mortais e carniçais.
- Demais livros do acervo: avaliar individualmente, sem presumir que toda menção a personagem inclui ficha completa.

**Importante:** esta SPEC não afirma que o acervo já foi integralmente extraído; a catalogação é atividade com revisão e aprovação editorial. Não inventar estatísticas ausentes.

## Requisitos

| ID | Prioridade | Regra |
|---|---|---|
| RF01 | P0 | Narrador acessa aba **Biblioteca dos Livros** no catálogo de NPCs e rota dedicada `/npcs/biblioteca`. |
| RF02 | P0 | Pesquisa textual por nome, apelido, facção, clã, papel e obra; filtros: livro, tipo, facção, clã, nível de ameaça, completude da ficha. Paginação. |
| RF03 | P0 | Cards de resultado exibem nome, tipo, classificação como antagonista/aliado/neutro (quando fundamentada), livro, referência de página, indicação de ficha completa/parcial/narrativa e botão **Adicionar à mesa**. |
| RF04 | P0 | Clique em card abre prévia com dados mecânicos disponíveis, biografia resumida autorizada, tags, campos faltantes, fonte e variantes; sempre mostrar o que é confirmado versus adaptação. |
| RF05 | P0 | **Adicionar à mesa** abre diálogo para selecionar campanha, definir nome opcional, papel, segredo/visibilidade e nível de adaptação; confirmação explícita cria uma **cópia editável** no domínio de NPC existente. |
| RF06 | P0 | Template global é imutável para Narrador; alterações feitas na cópia da campanha nunca atualizam a fonte, nem outras campanhas. |
| RF07 | P0 | Preservar `sourceBook`, `edition`, `pageStart`, `pageEnd`, `sourceEntryId`, `catalogVersion` e `adaptationNotes`; origem clicável leva à referência bibliográfica ou página do PDF **somente quando arquivo estiver licenciado e acessível ao usuário**. |
| RF08 | P0 | A biblioteca é acessível apenas ao Narrador autenticado; dados de antagonistas ocultos não chegam a jogadores, API de sessão ou canais em tempo real sem revelação autorizada. |
| RF09 | P0 | Suportar ficha V5 completa, ficha simplificada/intermediária e entrada narrativa sem estatísticas; proibir conversão automática que fabrique atributos e poderes. |
| RF10 | P1 | Opcionalmente converter/adaptar ficha parcial com editor existente e marcadores `MISSING` e `HOUSE_RULE`, exigindo revisão do Narrador. |
| RF11 | P1 | Estado por campanha e sessão: ativo, arquivado, relacionamento, ameaças, ferimentos e anotações privadas, reutilizando `campaign_npcs`/instâncias existentes. |
| RF12 | P1 | Permitir adicionar o mesmo template mais de uma vez por opção explícita; proteger contra duplicação acidental por idempotency key. |
| RF13 | P1 | Exibir fonte original em inglês com traduções de rótulos PT-BR quando houver tradução verificada; nomes próprios e nomes canônicos permanecem originais. |
| RF14 | P1 | Filtro `somente prontos para uso` mostra apenas entradas validadas, compatíveis com o modelo de ficha atual. |

## Taxonomia

```text
creatureType: VAMPIRE | HUMAN | GHOUL | OTHER
narrativeRole: ANTAGONIST | ALLY | NEUTRAL | UNDETERMINED
sheetCompleteness: FULL | PARTIAL | NARRATIVE_ONLY
canonStatus: SOURCE_EXACT | VERIFIED_ADAPTATION | CUSTOM
reviewStatus: DRAFT | REVIEWED | APPROVED | REJECTED
```

Categoria de antagonista é **papel na crônica**, não espécie, e pode ser alterada na instância da campanha. Nível de ameaça deve ser explícito na fonte ou atribuído como classificação editorial, com indicador da origem.

## Fluxo de uso

1. Narrador abre `/npcs` → aba **Biblioteca dos Livros** (ou `/npcs/biblioteca`).
2. Busca ou filtra personagem; abre prévia detalhada e verifica livro/página/completude.
3. Seleciona **Adicionar à mesa** (botão com mesmo padrão visual e feedback de **Adicionar habilidade**).
4. Escolhe campanha e confirma opções; servidor valida permissões e copia apenas campos permitidos, persistindo referência de proveniência.
5. Interface retorna ao NPC da campanha com ação **Editar ficha**; template permanece intacto.
6. Narrador pode usar o NPC no modo sessão por meio dos recursos atuais.

## Regras de conteúdo e direitos

- Não importar automaticamente todos os perfis, descrições extensas, ilustrações e blocos de texto protegidos em uma biblioteca distribuída sem autorização/licença adequada.
- Manter o catálogo de metadados/proveniência separado do conteúdo efetivamente redistribuível.
- Para conteúdo não autorizado, usar somente metadados bibliográficos, referências de página e resumos originais curtos, ou permitir importação privada pelo próprio usuário com acesso controlado; validar juridicamente o modelo de distribuição.
- Não incluir imagens dos livros sem direitos de uso. Não servir PDFs fornecidos pelo usuário publicamente.
- Revisão humana obrigatória para cada entrada; guardar título/edição/página precisos, sem criar fichas mecânicas especulativas.
- Não prometer links para posições exatas em PDFs externos ou edição indisponível; mostrar livro + página como fallback.

## Critérios de aceite

1. Narrador encontra personagem pelo nome e filtra por livro, clã, papel e completude.
2. Cada resultado indica fonte, página e nível de completude; campos ausentes não são inventados.
3. **Adicionar à mesa** cria instância editável associada à campanha selecionada, com proveniência preservada.
4. Editar a instância não modifica o template global nem outras mesas.
5. Jogador não tem acesso à biblioteca privada, descrição secreta ou detalhes de antagonistas.
6. Tentativas de criar NPC em mesa alheia retornam 403; acesso não autenticado retorna 401.
7. Busca paginada tem limites de entrada, consulta segura e desempenho adequado.
8. Operação repetida com mesma chave idempotente não cria duplicata.
9. Conteúdo não liberado para redistribuição não é retornado por APIs públicas nem publicado no catálogo.
10. Todos os registros disponíveis para uso passaram por validação editorial.

## Fora de escopo

Extração integral automática de todo o acervo; geração por IA de fichas ausentes; publicação de PDFs/ilustrações; modificação automática do elenco canônico; acesso à biblioteca por jogadores.
