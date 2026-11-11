# Triagem e correções — TestSprite, 11/11/2026

## Evidência e escopo

Produção: https://meus-vampiros.vercel.app/ — commit publicado consultado `4804ee12c5e496c9de03c6f9b6a5cf7834bd5964`.
Projeto TestSprite: `5aeb6d1b-8c6a-4ef2-98e3-88d9cfbe6112`.
Execução: `df92b27e-ac6e-4231-adbd-9c3b5d142b49` (11/11/2026, 15:56–16:09 BRT, conforme relatório fornecido).
Branch: `fix/testsprite-production-flows`, preparada sobre `develop` (`ffd3404`), que já incorpora a PR #138. A versão de produção consultada para a triagem permanece a indicada acima.

Os relatórios fornecidos descrevem resultados e hipóteses, mas não incluem requests/responses, gravações ou passos completos. Diagnósticos abaixo distinguem problemas confirmados no código de causas ainda não reproduzidas. Nenhum teste automatizado escreveu em produção; não houve deploy, migração ou seed externo.

## Resultado informado

81 casos: 43 passaram, 14 falharam, 24 bloqueados. A soma é consistente. Entre os 57 casos não bloqueados, 43/57 = 75,4%; no total, 43/81 = 53,1%. O score de aproximadamente 74% e o denominador 39 exigem conhecer a regra de cálculo do TestSprite; não foram tratados como cobertura da aplicação.

## Correções implementadas localmente

- Editor compartilhado: bloqueio síncrono por ref evita dois saves antes do próximo render. Fichas existentes aguardam uma revisão válida; não se envia mais revisão zero quando os dados ainda não chegaram. Falhas de rede recebem feedback e liberam nova tentativa. O fetch de leitura rejeita HTTP de erro e usa `no-store`. O servidor continua rejeitando revisões concorrentes com 409; não há retry com sobrescrita automática.
- Lista de personagens: POST/PUT invalidam `/characters` após persistência bem-sucedida. Redirecionamento após salvar também atualiza a rota. Isso elimina uma lacuna de atualização de listagem; não prova que a criação do relatório tenha falhado por cache.
- Mesa visual: timeout de 15 segundos, distinção entre carregamento/erro/vazio, botão de nova tentativa e nome acessível para busca. A falha de consulta deixa de ser apresentada como loading indefinido. A causa do erro de backend no deploy continua pendente de logs e verificação das migrações existentes.
- Busca de NPC completo: pesquisa o mesmo nome `COALESCE(ch.name,n.name)` que a listagem exibe. Teste com PostgreSQL cobre renomeação da ficha vinculada e isolamento entre proprietários. Esse defeito é distinto da criação intermediária reportada, que ainda precisa de reprodução.
- Dois erros de lint anteriores em calendário e lembretes corrigidos pela substituição de expressões de vírgula por blocos explícitos; sem mudança de comportamento.

## Matriz dos 14 casos

| Caso | Resultado da investigação | Continuação necessária |
|---|---|---|
| Projeto de Coterie no hub | Código já persiste no serviço e chama `mutate()` no componente após sucesso. Testes de domínio de Coterie/Projects executados. Não confirmada perda de escrita. | Capturar payload, status HTTP, resposta, permissões e filtros do caso original. |
| YouTube | Não reproduzido nesta alteração. | URL válida, seleção da fonte e logs de carregamento em preview autenticado. |
| Novo rascunho | Lacuna de invalidação corrigida; saves duplicados e revisão não carregada protegidos. | Repetir criação, retorno e reabertura com conta de teste. |
| NPC intermediário ausente na busca | POST cria definição e vínculo de campanha na mesma transação. Correção separada da pesquisa de nome em NPC completo. | Repetir criação intermediária na mesma campanha e proprietário, com filtros registrados. |
| Edição de NPC/ficha | Proteções do editor compartilhado aplicadas. Conflito real continua preservado. | Verificar se edição usava NPC narrativo ou ficha mecânica e reproduzir o fluxo. |
| Administração de participantes | Ações aparecem por ficha vinculada; não há entidade sobre a qual aprovar/rejeitar em uma mesa vazia. | Verificar expectativa de convites e melhorar estado vazio conforme fluxo real. Não criar membros artificiais em produção. |
| NPC como remetente | Produção consultada não incluía PR #138. Posteriormente ela foi integrada em develop, base desta PR. | Validar essa funcionalidade no preview da PR após migração controlada; não classificar como regressão da implementação nova. |
| Mesa visual | Erro mantinha texto de loading. Corrigidos estado/timeout/retry. | Verificar backend, acesso a handouts e migração `20261105_session_visual.sql` no destino. Não aplicada nesta entrega. |
| Filtro de XP | Sem personagem elegível, filtro apenas “Todos” pode ser correto. | Fixture com personagem vinculado e transações de categorias distintas. |
| Detalhe de poder | Catálogo apresenta detalhes inline. Relatório exige página separada sem evidência de requisito obrigatório. | Ajustar cenário para verificar conteúdo e fonte; rota/modal nova requer decisão de produto. |
| Retomar rascunho | Proteções compartilhadas de save/revisão e feedback aplicadas. | Repetir retomada e alternância de etapas em preview. |
| Autoria das notas | Não foi demonstrado se metadado falta no armazenamento, DTO ou apresentação. | Capturar resposta da nota e conferir autor autenticado; não inferir autoria de dados existentes. |
| Campanhas por status | Página separa ativas de inativas antes do filtro. “Todas as situações” atua no subconjunto da página. | Tornar escopo explícito no teste/UI; não pressupor que filtro local unifica as duas páginas. |
| Nova Coterie em mesa arquivada | Read-only é regra válida; não retirar bloqueio do servidor. | Cenário positivo em mesa ativa; negativo confirma bloqueio em arquivada. |

## Validações

- Instalação npm concluída; sem atualização intencional de dependências.
- `pnpm build` aprovado; gera avisos de Auth0 por ausência de credenciais locais. Isso não valida login.
- `next typegen` e `tsc --noEmit` aprovados. Lint final: zero erros e dez avisos anteriores.
- Primeira execução ampliada: 131 testes, 108 passaram, 23 falharam. As mesmas 23 falhas ocorreram ao restaurar o formulário original: 20 snapshots de hash do HTML, duas expectativas da identidade e um teste antigo de bloqueio por perfil de Narrador. Não atualizar snapshots automaticamente ou enfraquecer testes de permissão para obter resultado verde.
- Seleção final de oito arquivos pertinentes: 75 testes aprovados, sem skips. Teste adicional da busca canônica também passou nas execuções de integração. Isso não substitui as três suítes com 23 falhas anteriores registradas acima.
- Novos testes de concorrência/revisão/rede, estado da mesa visual, invalidação da lista e busca canônica de NPC executados. PostgreSQL 16 local, schema `meus_vampiros_test`, dados fictícios, sem credenciais externas.
- Auditoria npm: nove ocorrências moderadas, nenhuma alta/crítica; sem dependência nova nesta alteração.
- Segurança: autorização do servidor, isolamento SQL por proprietário/campanha, consultas parametrizadas e controle de revisão preservados; sem nova rota pública ou segredo.

## Pendências e estado de entrega

Entrega parcial publicada para revisão em PR draft a pedido da usuária, com as falhas anteriores e homologação E2E pendente explicitadas. Não aprovada para merge ou deploy. O sucesso do build e dos testes novos não significa que os 14 casos do TestSprite passaram.

Para repetir o TestSprite: configurar `TESTSPRITE_API_KEY` como segredo do executor, preview pronto, contas separadas de Narrador/jogadores, duas mesas isoladas, fichas/XP, NPC revelado e entidades de Coterie. Reutilizar o projeto existente. Não usar dados reais para preencher os 24 casos bloqueados.

## Preparação da PR

Base atualizada para develop ffd3404; seleção ampliada: 147 aprovados, 23 falhas anteriores (170 testes). Build e tipos aprovados, lint sem erros/10 avisos anteriores. A usuária solicitou explicitamente a publicação de duas PRs separadas; esta é draft e não libera merge ou deploy. UI do jogador está em branch independente.
