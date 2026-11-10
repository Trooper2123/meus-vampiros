# Revisão manual — Livros × VTM Wiki (V5)

## Arquivos
- `revisao-disciplinas-v5-interativa.html`: página **independente**, feita para baixar e abrir localmente no navegador. Inclui todos os registros (376 do catálogo + 78 candidatos da Wiki), filtros, escolha por item, anotações, e botão **Exportar decisões CSV**.
- `revisao-disciplinas-v5-comparativo.csv`: planilha em formato CSV UTF-8 com ponto-e-vírgula, **37 colunas** com campos Livro e Wiki lado a lado, nomes finais, fontes, páginas, links e espaços para decisão. Pode ser aberta no Excel/LibreOffice ou importada no Google Sheets.

## Como decidir
- **Livros**: preservar somente a definição do catálogo atual. Identificador visível sugerido: `[Nome] - Livros`.
- **Wiki**: usar somente a definição conferida na VTM Wiki. Identificador: `[Nome] - VTM WIKI`.
- **Ambas**: preservar as duas variantes como registros separados, mantendo as referências independentes.
- **Excluir**: remover o item do catálogo futuro, após revisão.
- **Pendente**: ainda sem decisão.

**Exemplo:** `Squirm - Livros` e `Squirm - VTM WIKI`. A referência do livro existente continua associada à versão Livros; o URL da VTM Wiki fica associado à versão Wiki.

## Atenção à exatidão
1. Os 376 registros atuais foram copiados para a coluna **Livros** conforme a branch de revisão. Eles **não** foram presumidos corretos.
2. Os campos da **Wiki** ainda sem transcrição/validação ficam com `A CONFERIR`. O link da disciplina permite verificar nome, nível, custo, pré-requisitos, Amálgamas, duração, parada e resistência, além do livro e página citados naquela linha. Não substituir por `N/A` sem verificar a tabela.
3. Os 78 candidatos ausentes são listados como `Candidato Wiki não presente no catálogo atual` e não são poderes ativos.
4. O CSV possui todas as colunas de comparação. No HTML, a definição atual aparece dentro de **Ver campos cadastrados**; a Wiki é aberta através do link correspondente. Se selecionar **Ambas**, os dois nomes são exportados com a decisão.
5. Após selecionar e anotar, **exporte as decisões CSV** para manter uma cópia. O HTML também tenta armazenar escolhas no navegador local, mas isso não é mecanismo de sincronização ou backup.
6. Não aplicar as decisões automaticamente no banco antes de revisar diferenças mecânicas e as regras de aquisição.

## Estrutura do CSV
A coluna `Decisão (Livros / Wiki / Ambas / Excluir / Pendente)` recebe exatamente um desses cinco valores. As colunas `Nome final Livros` e `Nome final Wiki` já são pré-preenchidas com sufixos explícitos, e as colunas `Fonte Livros`, `Página Livros`, `Arquivo Livros`, `URL Wiki`, `Fonte precisa Wiki` e `Página Wiki PDF` preservam ou reservam a rastreabilidade.

A versão apresentada como “VTM Wiki” é apenas a origem de referência; a página da Wiki muitas vezes cita um **livro físico diferente**. O título da obra e sua página devem ser preenchidos em `Fonte precisa Wiki` antes de habilitar a variante.

## Correção do conteúdo Wiki no revisor (08/11/2026)
Os dados das **70 páginas dos 12 PDFs VTM Wiki** foram incorporados ao HTML, que agora mostra o **trecho textual localizado** ao lado da versão Livros e permite consultar o conteúdo textual completo da página de origem com seletor de página (funciona offline, após baixar o HTML).

O CSV foi atualizado com mais três colunas de fonte Wiki: **página sugerida**, **estado de localização** e **excerto do PDF** para cada um dos 454 itens. Os excertos vêm de arquivos efetivamente fornecidos, não de informações inventadas.

**Limitação da extração**: o PDF da Wiki possui tabelas em múltiplas colunas; o texto extraído pode misturar células ou não localizar nomes espalhados em linhas. Assim, o trecho é evidência textual para conferência e **não** uma transcrição verificada campo a campo. Nas colunas estruturadas de efeito, custo, duração, pré-requisito, amálgama e dados da Wiki, os valores ainda não validados continuam explicitamente como `A CONFERIR`. Não usar trecho parcial como regra automatizada sem revisão visual da tabela original.
