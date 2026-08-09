# Migrations SQL — Brinco de Princesa

## Estado e baseline

O PostgreSQL real foi inventariado antes de qualquer migration: versão 18.4, schema `app`, 26 tabelas de negócio, 68 índices, 13 triggers e a função `app.set_atualizado_em()`. O inventário corresponde aos scripts SQL históricos; nenhuma das 26 tabelas precisou ser recriada ou alterada para produzir a baseline.

`database/migrations/001_baseline.sql` é uma baseline de adoção. Ela valida o conjunto completo de tabelas e os contratos essenciais de catálogo, dinheiro, estoque, imagens, índices e triggers. Ela não contém `DROP`, não recria tabelas e não move dados.

Depois de validada, a baseline é registrada em `app.schema_migrations`. Essa é uma tabela técnica adicional e não integra as 26 tabelas de negócio.

## Legenda do inventário

- `!`: `NOT NULL`;
- `=`: valor `DEFAULT`;
- `PK`, `FK` e `UQ`: chave primária, estrangeira e única;
- tipos monetários são `numeric(12,2)`; nenhum valor monetário usa `float` ou `real`.

## Inventário das 26 tabelas de negócio

| Tabela | Colunas e tipos | PK, FK e UNIQUE | CHECK e DEFAULT | Índices |
|---|---|---|---|---|
| `audit_logs` | `id bigint!`; `admin_id bigint`; `acao varchar(80)!`; `tipo_recurso varchar(80)`; `recurso_id varchar(100)`; `resultado varchar(16)!`; `request_id varchar(64)`; `ip_hash char(64)`; `metadados jsonb!`; `criado_em timestamptz!` | PK `id`; FK `admin_id→usuarios_admin` SET NULL | resultado permitido; metadados objeto; `metadados={}`; `criado_em=now()` | PK; `audit_logs_admin_criado_idx`; `audit_logs_recurso_idx` |
| `banners` | `id bigint!`; `titulo varchar(160)!`; `subtitulo varchar(300)`; `imagem_url text`; `link_url text`; `texto_botao varchar(50)`; `posicao varchar(40)!`; `ativo bool!`; `ordem int2!`; `inicia_em/termina_em timestamptz`; timestamps! | PK `id` | período válido; posição, ativo, ordem e timestamps com defaults | PK |
| `categorias` | `id bigint!`; `categoria_pai_id bigint`; `nome varchar(100)!`; `slug varchar(120)!`; `descricao text`; `ativa bool!`; `ordem int2!`; timestamps! | PK `id`; FK autorreferente RESTRICT; UQ `slug` | slug normalizado; sem autorreferência; `ativa=true`; `ordem=0`; timestamps | PK; UQ slug |
| `clientes` | `id bigint!`; `public_id uuid!`; `email varchar(254)!`; `nome varchar(100)!`; `sobrenome varchar(120)!`; `telefone varchar(24)`; `ativo bool!`; timestamps! | PK `id`; UQ `public_id` | e-mail básico; UUID, ativo e timestamps com defaults | PK; UQ public_id; `clientes_email_lower_uk` |
| `colecoes` | `id bigint!`; `nome varchar(120)!`; `slug varchar(140)!`; `descricao text`; `imagem_url text`; `ativa bool!`; `destaque bool!`; `publicada_em timestamptz`; timestamps! | PK `id`; UQ `slug` | slug normalizado; `ativa=true`; `destaque=false`; timestamps | PK; UQ slug |
| `configuracoes` | `chave varchar(100)!`; `valor jsonb!`; `descricao varchar(240)`; `publica bool!`; `atualizado_por bigint`; `atualizado_em timestamptz!` | PK `chave`; FK `atualizado_por→usuarios_admin` SET NULL | `publica=false`; `atualizado_em=now()` | PK |
| `cupom_categorias` | `cupom_id bigint!`; `categoria_id bigint!` | PK composta; FKs para `cupons` e `categorias`, ambas CASCADE | — | PK composta |
| `cupom_produtos` | `cupom_id bigint!`; `produto_id bigint!` | PK composta; FKs para `cupons` e `produtos`, ambas CASCADE | — | PK composta |
| `cupom_utilizacoes` | `id bigint!`; `cupom_id bigint!`; `pedido_id bigint!`; `cliente_id bigint`; `email_normalizado varchar(254)!`; `desconto_aplicado numeric(12,2)!`; `criado_em timestamptz!` | PK `id`; FKs RESTRICT; UQ `pedido_id` | desconto não negativo; timestamp | PK; UQ pedido; índices por cupom/cliente e cupom/e-mail |
| `cupons` | `id bigint!`; `codigo varchar(40)!`; `descricao varchar(180)`; `tipo varchar(16)!`; `valor numeric(12,2)!`; `pedido_minimo numeric(12,2)!`; `desconto_maximo numeric(12,2)`; limites; usos; período; `ativo bool!`; timestamps! | PK `id`; código único normalizado por índice | tipo; valor positivo; percentual ≤100; limites positivos; período válido; defaults de mínimo, limite/cliente, usos, ativo e timestamps | PK; `cupons_codigo_upper_uk` |
| `enderecos` | `id bigint!`; `cliente_id bigint!`; campos de endereço; `principal bool!`; timestamps! | PK `id`; FK cliente CASCADE | CEP e UF; `principal=false`; timestamps | PK; `enderecos_um_principal_por_cliente_uk` parcial |
| `idempotency_keys` | `id bigint!`; `escopo varchar(50)!`; hashes `char(64)!`; `status_code int2`; `response_body jsonb`; `recurso_id varchar(100)`; `expira_em/criado_em timestamptz!` | PK `id`; UQ `(escopo,chave_hash)` | status HTTP 100–599; expiração posterior à criação; timestamp | PK; UQ escopo/chave; índice de expiração |
| `movimentos_estoque` | `id bigint!`; `variante_id bigint!`; `pedido_id/admin_id bigint`; `tipo varchar(24)!`; `quantidade int2!`; `saldo_apos int2!`; `motivo varchar(240)`; `criado_em timestamptz!` | PK `id`; FKs variante/pedido RESTRICT e admin SET NULL | tipos permitidos; quantidade ≠0; saldo ≥0; timestamp | PK; `movimentos_estoque_variante_idx` |
| `pagamentos` | `id bigint!`; `pedido_id bigint!`; `provedor varchar(32)!`; `gateway_payment_id varchar(160)`; `idempotency_key varchar(128)!`; status/método/moeda; `valor numeric(12,2)!`; timestamps | PK `id`; FK pedido RESTRICT; UQ idempotency; UQ `(provedor,gateway_payment_id)` | status/moeda; valor ≥0; defaults de status, BRL e timestamps | PK; duas UQ; índices por pedido e status |
| `password_reset_tokens` | `id bigint!`; `admin_id bigint!`; `token_hash char(64)!`; `expira_em timestamptz!`; `usado_em`; `criado_em!` | PK `id`; FK admin CASCADE; UQ hash | expiração posterior à criação; timestamp | PK; UQ hash; `password_reset_admin_ativos_idx` |
| `pedido_itens` | `id bigint!`; `pedido_id bigint!`; `produto_id/variante_id bigint`; snapshots de nome/SKU/variante/atributos; `quantidade int2!`; `preco_unitario/subtotal numeric(12,2)!` | PK `id`; pedido RESTRICT; produto/variante SET NULL | quantidade >0; valores ≥0; subtotal coerente; atributos objeto/default `{}` | PK; `pedido_itens_pedido_idx` |
| `pedido_status_historico` | `id bigint!`; `pedido_id bigint!`; status anterior/novo; `admin_id bigint`; `motivo`; `criado_em!` | PK `id`; pedido RESTRICT; admin SET NULL | timestamp | PK; `pedido_status_historico_pedido_idx` |
| `pedidos` | `id bigint!`; código/token; cliente/cupom; status; snapshots do cliente/endereço; moeda; subtotal/desconto/frete/total `numeric(12,2)!`; observações; timestamps | PK `id`; UQ código; FKs cliente RESTRICT e cupom SET NULL | status/moeda/e-mail/endereço; valores ≥0; desconto ≤ subtotal; total coerente; defaults | PK; UQ código; índices por cliente/data e status/data |
| `produto_colecoes` | `produto_id bigint!`; `colecao_id bigint!`; `ordem int2!` | PK composta; FKs CASCADE | `ordem=0` | PK composta; `produto_colecoes_colecao_ordem_idx` |
| `produto_imagens` | `id bigint!`; `produto_id bigint!`; `variante_id bigint`; `url text!`; `alt_text varchar(180)!`; MIME/dimensões; `ordem int2!`; `principal bool!`; `criado_em!` | PK `id`; produto CASCADE; variante SET NULL; UQ parcial por produto principal | dimensões positivas; defaults de ordem, principal e timestamp | PK; `produto_imagens_uma_principal_uk`; índice produto/ordem |
| `produto_variantes` | `id bigint!`; `produto_id bigint!`; `sku varchar(64)!`; `nome varchar(120)!`; `atributos jsonb!`; `preco/preco_promocional numeric(12,2)`; `estoque/estoque_reservado int2!`; `ativa bool!`; timestamps! | PK `id`; FK produto RESTRICT; UQ SKU | preço/estoque ≥0; promoção menor que preço; reservado ≤ estoque; atributos objeto; defaults | PK; UQ SKU; índices de variante ativa e estoque disponível |
| `produtos` | `id bigint!`; `categoria_id bigint`; `nome varchar(160)!`; `slug varchar(180)!`; descrição e dados artesanais; peso; prazo; status; flags; SEO; publicação; timestamps! | PK `id`; FK categoria RESTRICT; UQ slug | slug; peso/prazo ≥0; status permitido; defaults de descrição, prazo, status, flags e timestamps | PK; UQ slug; índices categoria/status, publicação ativa e destaque |
| `reservas_estoque` | `id bigint!`; `pedido_id/variante_id bigint!`; `quantidade int2!`; `status varchar(16)!`; `expira_em!`; timestamps! | PK `id`; FKs RESTRICT; UQ `(pedido_id,variante_id)` | quantidade >0; status permitido; default status/timestamps | PK; UQ pedido/variante; índice de expiração ativa |
| `sessoes` | `id bigint!`; `admin_id bigint!`; hashes; expiração/uso/revogação/criação | PK `id`; FK admin CASCADE; UQ token hash | expiração posterior à criação; defaults de uso/criação | PK; UQ token; `sessoes_admin_ativas_idx` |
| `usuarios_admin` | `id bigint!`; e-mail/nome/hash; papel; ativo; tentativas; bloqueio/login; timestamps | PK `id`; e-mail único normalizado por índice | formato de e-mail; papel; tentativas ≥0; defaults | PK; `usuarios_admin_email_lower_uk` |
| `webhook_eventos` | `id bigint!`; provedor/evento; tipo; hash/assinatura; status/tentativas/erro; timestamps | PK `id`; UQ `(provedor,gateway_event_id)` | status permitido; tentativas ≥0; defaults | PK; UQ provedor/evento; `webhook_eventos_pendentes_idx` |

O inventário completo por coluna, constraint e definição de índice também pode ser emitido, sem escrita, por `database/scripts/schema_inventory.sql`.

## Tabela de controle

`app.schema_migrations` contém:

- `id`: identidade e chave primária;
- `version`: inteiro positivo e único;
- `name`: nome estável e único;
- `checksum`: SHA-256 hexadecimal do conteúdo, normalizando apenas CRLF/LF para evitar falsos conflitos entre sistemas operacionais;
- `applied_at`: instante de aplicação.

`brinco_app` e `PUBLIC` têm todos os privilégios revogados nessa tabela e em sua sequence.

## Runner

`npm run db:migrate`:

1. lê somente nomes `NNN_nome.sql`;
2. rejeita versões duplicadas e nomes fora da convenção;
3. ordena numericamente;
4. obtém advisory lock;
5. valida checksums já registrados;
6. executa cada pendência em transação com `SET LOCAL ROLE brinco_owner`;
7. registra a migration na mesma transação;
8. faz rollback integral em erro;
9. libera o lock mesmo quando há falha.

## Conexões e bancos

- `DATABASE_URL`: runtime `brinco_app`, nunca executa DDL;
- `DATABASE_ADMIN_URL`: conexão administrativa para migrations e seed;
- `TEST_DATABASE_URL`: runtime do banco terminado em `_test`;
- `TEST_DATABASE_ADMIN_URL`: preparação administrativa isolada dos testes.

Em desenvolvimento local, quando `DATABASE_ADMIN_URL` não está definida, o runner pode reutilizar a credencial administrativa já explícita de `TEST_DATABASE_ADMIN_URL`, trocando somente o banco de destino para o banco indicado por `DATABASE_URL`. Esse fallback é proibido em produção. Runtime e administração são sempre validados como usuários e senhas distintos.

## Nova migration e imutabilidade

1. não edite `001_baseline.sql` nem qualquer arquivo já aplicado;
2. crie o próximo `NNN_nome_descritivo.sql`;
3. escreva SQL compatível com transação;
4. não inclua senha, URL de conexão ou dado comercial real;
5. execute `npm run db:migrate` no banco de teste e depois no ambiente autorizado;
6. execute a suíte completa, `verify.sql`, lint, build e auditorias;
7. revise a nova linha de `schema_migrations`.

Alterar uma migration aplicada produz divergência de checksum e interrompe o runner.
