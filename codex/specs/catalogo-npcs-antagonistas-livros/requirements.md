# SPEC-RPG-022 — Catálogo de NPCs e antagonistas dos livros

**Status:** proposed | **Versão:** 1.1 | **Branch:** develop | **Natureza:** SPEC, não implementação

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


## Expansão v1.1 — Antagonistas genéricos e contribuições da comunidade

### Catálogo de antagonistas genéricos

- **RF15 [P0]:** Adicionar aba/filtro **Antagonistas genéricos**, com modelos reutilizáveis e originais, separados das fichas canônicas de livros e das criações da comunidade. Exemplos de arquétipos (não fichas oficiais): segurança particular, policial, investigador, caçador, agente da Segunda Inquisição, criminoso, ocultista, carniçal e vampiro rival.
- **RF16 [P0]:** Cada arquétipo permite escolher tipo de criatura, papel, ameaça, complexidade de ficha (`SIMPLE`, `INTERMEDIATE`, `FULL`) e variações mecânicas *validadas pelo sistema*. Estatísticas de modelos genéricos são conteúdo original do aplicativo, marcado `GENERIC_TEMPLATE`, e não atribuído a livros.
- **RF17 [P0]:** A ação **Adicionar à mesa** clona um modelo genérico para a campanha, permitindo edição imediata sem afetar sua definição global.
- **RF18 [P0]:** A ação **Criar NPC/Antagonista** reutiliza os editores atuais e aceita criação do zero ou baseada em modelo; salva **privadamente** sob controle do Narrador, com visibilidade `ST_ONLY` como padrão.
- **RF19 [P0]:** Após salvar um novo NPC/antagonista personalizado, apresentar um **popup não obrigatório** perguntando se o criador quer **enviar uma cópia para análise de inclusão no catálogo comunitário do site**. A resposta padrão é **Não compartilhar**. O salvamento privado independe do consentimento e acontece antes do popup.
- **RF20 [P0]:** O popup mostra uma **prévia exata dos campos a enviar** e permite excluir/editar nome, descrição, histórico, atributos, poderes, tags e demais dados opcionais. **Nunca** incluir automaticamente notas privadas do Narrador, informações de jogadores, nomes ou IDs de campanhas, contatos pessoais, logs, imagens, PDFs ou segredos da mesa.
- **RF21 [P0]:** Consentimento exige ato afirmativo explícito e separado, sem caixa pré-selecionada. Opções: **Não, manter privado**, **Agora não** e **Enviar para avaliação**. Recusar/fechar não impede o NPC de ser utilizado e não autoriza envio posterior; não repetir popup insistentemente. Permitir contribuição posterior na ficha pela ação **Sugerir ao catálogo**.
- **RF22 [P0]:** Consentimento **não publica diretamente**. A submissão vira `PENDING_REVIEW` em área restrita; moderador aprova, pede alterações ou rejeita por qualidade, segurança, dados pessoais, plágio e direitos autorais. Apenas material aprovado e autorizado pode entrar no catálogo comunitário.
- **RF23 [P0]:** Usuário pode consultar status da contribuição e **retirar a submissão antes da publicação**; após publicação, fornecer fluxo para solicitar remoção/despublicação e política explícita de retenção e uso. Retirada não deve apagar a ficha privada nem cópias legitimamente criadas antes, conforme termos exibidos.
- **RF24 [P0]:** Registrar versão dos termos aceitos, data, usuário, hash/snapshot da prévia aprovada, escopo da licença de compartilhamento e mudanças de status com auditoria. A licença de contribuição deve ser apresentada claramente e permitir somente usos autorizados; não assumir transferência de titularidade.
- **RF25 [P0]:** Não convidar ao envio de personagem copiado/adaptado de livros sem autorização de redistribuição. Para derivados de obra protegida, bloquear submissão ou exigir validação editorial e direitos comprovados. Distinguir `OFFICIAL_SOURCE`, `GENERIC_TEMPLATE` e `COMMUNITY_SUBMISSION`.
- **RF26 [P1]:** Catálogo comunitário pesquisável pelo Narrador, com autoria/crédito **opcional e autorizado**, classificação de ameaça, revisão, procedência, e importação por cópia; submissões não aprovadas nunca aparecem em busca.
- **RF27 [P1]:** Não exigir contas públicas, rede social ou compartilhamento para criar, editar ou usar NPC. Possibilidade de optar por não exibir a pergunta novamente nas preferências, com reativação manual.

### Texto proposto para o popup

> **Quer compartilhar seu NPC com a comunidade?**
>
> Seu NPC foi salvo na sua biblioteca privada. Você pode, opcionalmente, enviar uma **cópia revisada** para avaliação e possível inclusão na biblioteca do site. **Nada será publicado automaticamente**. Confira os dados abaixo e confirme que tem direito de compartilhá-los. Sua ficha original e anotações privadas permanecerão na sua conta.
>
> **Não, manter privado** · **Agora não** · **Revisar e enviar para avaliação**

O popup deve apresentar link para os termos/licença e a política de privacidade **antes do envio**, com consentimento separado para eventual crédito público do autor. Dados visíveis para o usuário não devem constituir autorização implícita.

### Aceite adicional

11. Catálogo genérico contém modelos originais identificados como genéricos; Narrador adiciona e edita cópia sem modificar template.
12. Narrador cria NPC do zero e utiliza imediatamente, mesmo recusando o compartilhamento.
13. Recusa, fechamento do popup, timeout, falha de rede ou opção “Agora não” não enviam nenhum dado.
14. Envio confirmado guarda somente os campos aprovados na prévia, termos aceitos e status `PENDING_REVIEW`; a biblioteca pública não exibe submissão pendente.
15. Moderador só publica após verificar direitos, dados pessoais e qualidade; há estado de rejeição, revisão e retirada.
16. Mudanças posteriores na ficha privada **não** atualizam automaticamente a cópia enviada/publicada.
17. Não há vazamento de dados de campanha, personagens dos jogadores, notas privadas ou materiais de livros sem autorização.
18. Retirada e remoção respeitam o fluxo publicado e preservam trilha de auditoria mínima.
