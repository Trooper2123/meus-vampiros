# Planejamento de novas funcionalidades

Toda nova funcionalidade relevante deve possuir uma spec em `.kiro/specs/<nome-da-funcionalidade>/`, criada a partir de `.kiro/specs/_template/`.

## Arquivos obrigatórios

- `requirements.md`: problema, objetivos, histórias de usuário, critérios de aceitação, regras e itens fora do escopo.
- `design.md`: arquitetura, dados, APIs, componentes, fluxos, segurança, acessibilidade, testes, riscos e decisões técnicas.
- `tasks.md`: implementação dividida em fases e tarefas pequenas, numeradas, dependentes e com status atualizado.
- `tasks.meta.json`: metadados de execução mantidos pela ferramenta; iniciar vazio.

## Roteiro do agente

1. **Descobrir**: ler `AGENTS.md`, a documentação relevante do Next.js em `node_modules/next/dist/docs/`, `UI-GUIDE.md` para mudanças visuais e o código afetado.
2. **Especificar**: criar ou atualizar `requirements.md`; registrar dúvidas e não implementar enquanto houver requisito essencial ambíguo.
3. **Projetar**: preencher `design.md` com contratos, persistência, autorização, migração, estados de UI, acessibilidade e estratégia de testes.
4. **Planejar**: decompor o trabalho em `tasks.md`, com dependências e ordem executável. Usar os estados `pending`, `in_progress`, `blocked` e `completed`.
5. **Executar**: marcar a tarefa atual como `in_progress`, implementar apenas seu escopo e atualizar o progresso quando houver impedimento ou decisão relevante.
6. **Validar**: começar pelos testes específicos e avançar para TypeScript, lint e build conforme o impacto. Não corrigir falhas não relacionadas.
7. **Concluir**: marcar como `completed` apenas após critérios de aceitação e validações passarem; atualizar o resumo da spec e o `CHANGELOG.md`.
8. **Revisar**: antes de commit, verificar diff, segredos, validação de rotas, autorização, migrações e arquivos não relacionados.

## Regras de manutenção

- Requisitos alterados durante o desenvolvimento devem ser refletidos primeiro em `requirements.md` e `design.md`.
- O status em `tasks.md` deve representar o estado real; trabalho parcialmente validado permanece `in_progress`.
- Cada tarefa deve produzir um resultado verificável e preferencialmente caber em um único commit.
- Decisões divergentes do design inicial devem ser registradas na seção “Decisões e desvios” de `design.md`.
- Nunca copiar IDs, sessões ou histórico de execução de outra spec para `tasks.meta.json`.
