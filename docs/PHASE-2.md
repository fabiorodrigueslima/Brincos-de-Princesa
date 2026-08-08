# Fase 2 — PostgreSQL manual

Status: concluída em 8 de agosto de 2026.

## O que foi implementado

- Bootstrap seguro do banco e dos papéis `brinco_owner` e `brinco_app`.
- Papel da aplicação sem superusuário, criação de banco ou criação de papéis.
- Schema dedicado `app`, com `CREATE` público revogado.
- 26 tabelas com chaves, relacionamentos e constraints.
- 28 índices explícitos, além dos índices de PK/UNIQUE criados pelo PostgreSQL.
- Seeds idempotentes sem administrador, senha ou segredo.
- Pool `pg` configurável, sem ORM.
- Readiness integrado à disponibilidade do PostgreSQL.
- Fechamento do pool no encerramento da API.
- Verificador SQL transacional para integridade e permissões.

## Tabelas

Além das tabelas obrigatórias, foram incluídas:

- `produto_colecoes`;
- `cupom_produtos`;
- `cupom_categorias`;
- `movimentos_estoque`;
- `reservas_estoque`;
- `idempotency_keys`;
- `pedido_status_historico`;
- `configuracoes`;
- `banners`.

## Integridade e segurança

- Dinheiro usa `NUMERIC(12,2)`, nunca float.
- Estoque e reserva não podem ser negativos; reserva não supera estoque.
- Percentual de cupom não pode ultrapassar 100%.
- Total do pedido precisa corresponder a subtotal menos desconto mais frete.
- Itens guardam snapshots de produto, SKU, variante e preço.
- Endereço e dados de contato são preservados como snapshot do pedido.
- IDs de pedido, tokens, sessões e idempotência são separados dos IDs internos.
- Tokens persistidos têm colunas destinadas somente aos hashes.
- Não existem colunas para cartão completo ou CVV.
- Pedido e pagamento têm estados independentes.
- Registros financeiros, histórico de estoque e auditoria não podem ser excluídos pelo papel da aplicação.
- Logs de auditoria são append-only para o papel da aplicação.
- Queries do módulo de conexão usam objetos `text`/`values`; nenhuma entrada de usuário é concatenada.

## Validação executada

Os scripts foram aplicados do zero em uma instância PostgreSQL 18.4 temporária e isolada:

1. `database.sql`;
2. `tables.sql`;
3. `indexes.sql`;
4. `seed.sql`;
5. `verify.sql`.

Resultado: todos aplicados com sucesso, 26 tabelas criadas e verificador aprovado. O teste confirmou a rejeição de estoque negativo, cupom percentual acima de 100%, total adulterado e exclusão de `audit_logs` pelo papel limitado. A instância temporária foi encerrada e removida; o PostgreSQL principal da máquina não foi alterado.

Também foram executados:

- lint frontend: aprovado;
- lint backend: aprovado;
- 8 testes automatizados: aprovados;
- build do frontend: aprovado.

## Limitações atuais

- O banco principal ainda não foi inicializado, pois a senha administrativa não foi fornecida e não deve ser presumida ou salva no projeto.
- Ainda não há repositories de catálogo; eles começam junto à Fase 4.
- A estratégia de migrations incrementais será criada antes do primeiro deploy. Até lá, os scripts representam a criação inicial.
- Transições de estados e concorrência de estoque estão modeladas no banco, mas as regras transacionais serão implementadas nas fases de pedidos e checkout.
- Backup e restauração pertencem à preparação de infraestrutura/deploy.

## Próxima fase

Fase 3: site institucional com Home, história, processo artesanal, personalizados, contato, políticas, navegação responsiva, acessibilidade e SEO inicial.
