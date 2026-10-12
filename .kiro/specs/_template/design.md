# Design: <Nome da funcionalidade>

## 1. Visão geral

Resuma a solução e como ela atende aos requisitos.

## 2. Estado atual

- Fluxos e arquivos existentes relacionados.
- Limitações que motivam a mudança.

## 3. Arquitetura proposta

### 3.1 Componentes e responsabilidades

| Componente/arquivo | Responsabilidade | Entradas e saídas |
|---|---|---|
| `<arquivo>` | <responsabilidade> | <contrato> |

### 3.2 Fluxo de dados

1. <Origem da ação>.
2. <Validação e processamento>.
3. <Persistência e resposta>.
4. <Atualização da interface>.

## 4. Modelo de dados e migração

- Tabelas/colunas afetadas.
- Valores padrão, constraints, índices e compatibilidade retroativa.
- Estratégia de rollback quando aplicável.

## 5. Contratos de API

### `<MÉTODO> <rota>`

- Autenticação: <regra>.
- Autorização: <regra>.
- Entrada: <query/body>.
- Saída: <status e payload>.
- Erros: `400`, `401`, `403`, `404`, `409`, `500` conforme aplicável.

## 6. Interface e acessibilidade

- Estados: carregando, vazio, sucesso, erro e desabilitado.
- Navegação por teclado, labels, foco e leitores de tela.
- Responsividade e aderência ao `UI-GUIDE.md`.

## 7. Segurança

- Validação no servidor e queries parametrizadas.
- Proteção de dados sensíveis e limites de entrada.
- Matriz de permissões por perfil.

## 8. Estratégia de testes

- Testes unitários: <casos>.
- Testes de integração: <fluxos>.
- Testes manuais: <cenários externos ou visuais>.
- Comandos de validação: `<comando>`.

## 9. Riscos e mitigação

| Risco | Impacto | Mitigação |
|---|---|---|
| <risco> | <impacto> | <ação> |

## 10. Decisões e desvios

- <Decisão, motivo e diferença em relação ao plano inicial>.
