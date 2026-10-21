# Disciplinas por origem

A matriz fornecida é o catálogo de associação ao clã. A autorização usa IDs estáveis, como `AUSPEX` e `PROTEAN`; nomes são rótulos de apresentação. Metamorfose aceita também o nome de apresentação anterior Proteanismo.

## Modelo adotado

O desenvolvimento usa o provider descartável em memória. Os registros aproveitam os documentos já persistidos pelo comando transacional, sem uma segunda fonte de níveis ou XP:

| Registro lógico | Armazenamento |
| --- | --- |
| clan_disciplines | seed `CLAN_DISCIPLINES`, também disponibilizado em `DevStore.clanDisciplines` |
| character_disciplines | `data.disciplinas`, identificada por `disciplineId`; `level` é o nível atual |
| discipline_acquisitions | `gameState.disciplineAcquisitions`: Disciplina, origem, níveis e custo |
| discipline_access_grants | `gameState.disciplineAccessGrants`: requisito, origem, Disciplina, nível, mesa, Narrador e justificativa |
| conteúdos vinculados | `DISCIPLINE_CONTENTS`: ritual/cerimônia, Disciplina, nível e poderes exigidos |

O schema físico JSONB de personagens não precisa de migração. A persistência SQL externa continua sujeita ao backlog de integração e não foi executada ou validada nesta entrega.

## Catálogo de pesquisa do Narrador

O provider descartável em memória inclui 372 registros extraídos de `codex/catalogo-disciplinas-vtm-v5.html`, associados ao ID da Disciplina e identificados por tipo, nível, fonte, página e nome. As 27 habilidades usam os IDs de `SPECIALTY_SKILL_NAMES`; os registros também associam habilidades reconhecidas nas paradas de dados. A página `/master/catalogo` permite pesquisar os conteúdos e validar a fonte/situação, mas esse material de referência não é uma regra de aprendizado nem altera as aquisições dos personagens. O acesso exige papel de Narrador ou vínculo como Narrador de mesa no servidor.

## Regras de aquisição

- **Clã:** pacote inicial 2+1, somente nas Disciplinas associadas. Caitiff escolhe três opções distintas e distribui 2+1 entre elas.
- **Predação:** concede seu ponto conforme o tipo e a escolha persistidos; não transforma a Disciplina em Disciplina de clã. Restrições existentes de predação permanecem.
- **XP:** próximo nível ×5 para clã, ×7 para fora do clã e ×6 para Caitiff, conforme os custos já documentados no projeto. Compra um nível por operação.
- **Aprendizado:** a referência local exige aprovação e não contém comprovação automatizável de todas as condições narrativas. A política adotada requer autorização de aprendizado específica do Narrador para cada Disciplina/nível. Isso não representa implementação integral das condições de aprendizado V5.
- **Exceção inicial:** o Narrador pode dispensar apenas a associação ao clã para uma Disciplina, nível inicial e clã determinados. Os limites 2+1 e a política de sangue-fraco continuam obrigatórios.
- **Sangue-fraco:** sem pacote comum; Alquimia e aquisições permanentes ficam bloqueadas até a definição do catálogo próprio. Ausência de clã não significa acesso livre.
- **Revogação:** não devolve XP nem apaga níveis. Revogar associação inicial devolve a ficha a rascunho, onde precisa ser corrigida antes de aprovação.

Autorização não concede níveis nem XP. Grants de outra mesa, do antigo Narrador, revogados ou de outro nível/origem não liberam uma aquisição. Cópias conservam origens públicas dos níveis; não copiam justificativas/autorização privada da mesa.

## Operações

As opções de evolução ficam em /characters/[id]/evolution, com especialidades e Disciplinas. Botão Evolução junto ao nome abre nova guia. O resumo e a gestão oferecem acesso à página; não incluem mais os painéis de evolução. A página valida autenticação e acesso do proprietário/Narrador antes de montar os componentes.

`GET /api/characters/[id]/disciplines` devolve custos, bloqueios e capacidades para proprietário/Narrador. Justificativas e autoria das autorizações não são expostas ao jogador.

`POST` aceita `PURCHASE`, `AUTHORIZE` ou `REVOKE`, com ID estável, nível, justificativa, revisão e chave de idempotência. O servidor carrega personagem e Narrador responsável no comando bloqueado/transacional; nunca aceita saldo, custo ou autoridade do cliente. Exige JSON e origem válida, limita corpo e usa respostas privadas sem cache.

Compras gravam nível, débito de XP, aquisição e evento no mesmo comando. A ficha volta a rascunho para preencher o poder e validar a nova configuração. Retry mantém a chave; concorrência exige revisão atual.

## Rituais e cerimônias

Catálogo inicial de metadados, sem execução ou compra automática desses conteúdos:

- `BLOOD_WALK`: Caminhada de Sangue, ritual vinculado a Feitiçaria de Sangue, nível 1.
- `SUMMON_SPIRIT`: Invocar Espírito, cerimônia vinculada a Oblívio, nível 1, exige o poder `THE_BINDING_FETTER`.

Níveis e vínculo consultados nos índices secundários [Blood Sorcery](https://whitewolf.fandom.com/wiki/Blood_Sorcery_(VTM_5e)) e [Oblivion](https://whitewolf.fandom.com/wiki/Oblivion_(Discipline)), que indicam Core V5 p.272 e Cults of the Blood Gods p.209. Rótulos em português são de apresentação. Não foram reproduzidos textos de poderes/efeitos. A lista não representa o catálogo completo; aprendizado e execução desses conteúdos exigem regras específicas da crônica.

## Validação e limites

Testes cobrem toda a matriz, Toreador, Brujah/Dominação, Caitiff/sangue-fraco, predação+XP, troca de clã, exceções, revogação, cópia, saldos, concorrência, idempotência, autorização/IDOR, CSRF, IDs repetidos e tentativas de injetar autoridade/custos.

Preparação inicial da SPEC: processo isolado de teste, sem carregar .env ou conectar PostgreSQL; reset único, 8 fichas/3 mesas e integridade aprovados. O teste geral de preparação P2 fica fora da regressão desta SPEC para não repetir o reset; preparação executada e validada separadamente. QA manual visual, teclado e responsividade permanecem no backlog.
