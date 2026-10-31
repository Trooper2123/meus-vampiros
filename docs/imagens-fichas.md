# Imagens de personagens e NPCs

O resumo do personagem e os detalhes/catálogo de NPCs oferecem envio, substituição, edição de título/enquadramento e remoção do retrato. A galeria fica em **Perfil, relações e mídias**, no contexto da mesa. Fichas independentes usam retrato global.

## Configuração

- Usar um **Vercel Blob privado** e configurar `BLOB_READ_WRITE_TOKEN` somente no servidor do ambiente correspondente. Não usar variável `NEXT_PUBLIC_` nem inserir o token no frontend.
- As tabelas de mídia fazem parte de `migrations/20261023_npcs_sheet_narrative.sql`. Aplicar a migração somente com autorização específica, no destino validado e com backup/rollback definidos. Esta continuação não altera nem executa schema.
- Sem o token, o painel informa que o envio está desabilitado. A ausência de tabelas é informada como módulo aguardando migração; não é resolvida fazendo upload novamente.

## Fluxo e limites

O servidor autoriza a reserva pelo usuário autenticado e pela ficha/mesa. O navegador envia para um caminho privado limitado à reserva; a confirmação lê e valida os bytes, reencoda em WebP e registra a mídia. O ID do proprietário não vem do cliente. Confirmar novamente uma reserva já concluída devolve a mesma imagem.

São aceitos JPEG, PNG e WebP estáticos, com até 5 MB, entre 32 e 8192 pixels por dimensão e no máximo 32 milhões de pixels. O resultado é limitado a 4096 pixels por dimensão, mantém até 5 MB e não preserva metadados EXIF. Há limite de dez reservas por usuário a cada quinze minutos e cem imagens ativas por contexto, revalidado na confirmação.

As imagens são lidas por `/api/sheet-media/:id`, com autenticação, autorização atual e `Cache-Control: private, no-store`. Não há URL pública permanente no DTO. Ser dono de outra mesa ou ter o perfil comum não libera imagens privadas de terceiros.

Ao substituir o retrato global, o anterior é revogado na transação e removido do storage somente após a confirmação do banco. Falhas na transação preservam o retrato anterior e permitem repetir a confirmação. No contexto da mesa, a imagem anterior permanece na galeria. A remoção lógica revoga a leitura mesmo se a exclusão física falhar.

Se a confirmação falhar depois do envio, **Confirmar envio novamente** reutiliza a reserva sem reenviar o arquivo. Se somente a atualização da lista falhar após uma operação confirmada, o painel informa o sucesso e orienta recarregar a página. Reservas abandonadas ou falhas de exclusão física podem deixar objetos privados pendentes de limpeza operacional; esta entrega não executa limpeza automática.

## Validação local

```sh
pnpm exec vitest run --config vitest.media.config.ts
```

A configuração exige PostgreSQL local com o schema `meus_vampiros_test` já preparado. Cria apenas fixtures sintéticas nesse schema, sem limpeza ou DDL, e usa armazenamento em memória. Não envia arquivos ao Blob real. Os testes cobrem rollback, reenvio, quotas, autorização, origem, arquivo inválido, privacidade e interface. QA visual e validação do provedor externo são etapas separadas.
