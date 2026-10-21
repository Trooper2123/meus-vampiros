# Especialidades — revisão das fontes

Revisão em 17/10/2026 dos quatro PDFs fornecidos pelo usuário. Referências de página impressa e posição no PDF não são intercambiáveis.

## Livro básico

- **p.159 (PDF p.161):** especialidades podem ser associadas às habilidades; os exemplos do livro não são uma lista fechada. Aplicação contextual concede +1 dado, usando apenas uma especialidade por rolagem. Para a maioria das habilidades, a quantidade não ultrapassa seus pontos.
- **p.160 (PDF p.162), Craft/Ofícios:** exceção explícita; permite mais especialidades que pontos. O código aplicava o limite geral indevidamente. Corrigidos o seletor, a validação e a reconciliação pelo mesmo cálculo compartilhado.
- **p.159 e p.145 (PDF p.161 e p.147):** primeiro ponto em Erudição, Ofícios, Performance e Ciência concede uma especialidade. Isso não impede especialidades nas outras habilidades; é uma concessão gratuita específica.
- **p.136 e p.151 (PDF p.138 e p.153):** concessão adicional na criação, concessão por predação e compra por 3 XP. Mantidos custos, revisão e prevenção de duplicidade.
- **p.149 (PDF p.151):** predação que concederia especialidade numa habilidade sem pontos concede um ponto na habilidade em vez dela. A implementação atual exige habilidade com pontos; essa conversão precisa de uma tarefa própria de predação, não foi alterada nesta correção.

## Outros arquivos fornecidos

- `VtM_v5-quickstart.pdf` e `VtM V5 - storytellers-toolkit-.pdf`: busca de ocorrências consultada; não foi identificada substituição da regra geral de limite ou da exceção de Ofícios.
- `VtM - vampire-players-guide.pdf` tem 51 páginas e é conteúdo comunitário: créditos na p.2 do PDF identificam Bully como autor e o acordo do Storytellers Vault. Não confundir esse arquivo com o Players Guide oficial.
- Nesse suplemento, **Lore Master** (p.12 impressa / PDF p.13) permite acrescentar especialidade de Ocultismo por nível; **Fast Learner** (p.11 impressa / PDF p.12) modifica custos. Esses efeitos não são habilitados automaticamente pelo nome de uma vantagem: exigem opção de ruleset e validação autoritativa, ainda não implementadas.

## Cobertura e limites da correção

Testes verificam as 27 habilidades com ao menos um ponto, a exceção de Ofícios no estado salvo/em edição, duplicatas, habilidade zerada, limite explícito e compra com XP/idempotência. Outras habilidades continuam sujeitas ao limite do livro básico. Limites explícitos existentes em `SpecialtyRules.limits` prevalecem como configuração interna; nenhuma nova configuração foi exposta ao cliente.

Sem migração, reset externo, alteração de autorização, aprovação, custo ou dados existentes. Os PDFs originais não são copiados para o repositório.
