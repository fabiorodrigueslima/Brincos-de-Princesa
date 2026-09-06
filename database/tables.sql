\set ON_ERROR_STOP on
\connect brinco_de_princesa

SET ROLE brinco_owner;
SET search_path = app, public;

CREATE TABLE IF NOT EXISTS usuarios_admin (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email VARCHAR(254) NOT NULL,
  nome VARCHAR(120) NOT NULL,
  password_hash TEXT NOT NULL,
  papel VARCHAR(24) NOT NULL DEFAULT 'MANAGER'
    CHECK (papel IN ('OWNER', 'MANAGER', 'FULFILLMENT')),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  tentativas_login_falhas SMALLINT NOT NULL DEFAULT 0
    CHECK (tentativas_login_falhas >= 0),
  bloqueado_ate TIMESTAMPTZ,
  ultimo_login_em TIMESTAMPTZ,
  senha_alterada_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT usuarios_admin_email_formato CHECK (position('@' IN email) > 1)
);

CREATE TABLE IF NOT EXISTS clientes (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  public_id UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  email VARCHAR(254) NOT NULL,
  nome VARCHAR(100) NOT NULL,
  sobrenome VARCHAR(120) NOT NULL,
  telefone VARCHAR(24),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT clientes_email_formato CHECK (position('@' IN email) > 1)
);

CREATE TABLE IF NOT EXISTS enderecos (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cliente_id BIGINT NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  apelido VARCHAR(60),
  cep VARCHAR(9) NOT NULL,
  rua VARCHAR(160) NOT NULL,
  numero VARCHAR(20) NOT NULL,
  complemento VARCHAR(120),
  bairro VARCHAR(100) NOT NULL,
  cidade VARCHAR(100) NOT NULL,
  uf CHAR(2) NOT NULL,
  destinatario VARCHAR(220) NOT NULL,
  principal BOOLEAN NOT NULL DEFAULT FALSE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT enderecos_cep_formato CHECK (cep ~ '^[0-9]{5}-?[0-9]{3}$'),
  CONSTRAINT enderecos_uf_formato CHECK (uf ~ '^[A-Z]{2}$')
);

CREATE TABLE IF NOT EXISTS categorias (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  categoria_pai_id BIGINT REFERENCES categorias(id) ON DELETE RESTRICT,
  nome VARCHAR(100) NOT NULL,
  slug VARCHAR(120) NOT NULL UNIQUE,
  descricao TEXT,
  ativa BOOLEAN NOT NULL DEFAULT TRUE,
  ordem SMALLINT NOT NULL DEFAULT 0,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT categorias_sem_auto_referencia CHECK (categoria_pai_id IS NULL OR categoria_pai_id <> id),
  CONSTRAINT categorias_slug_formato CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

CREATE TABLE IF NOT EXISTS colecoes (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  slug VARCHAR(140) NOT NULL UNIQUE,
  descricao TEXT,
  imagem_url TEXT,
  ativa BOOLEAN NOT NULL DEFAULT TRUE,
  destaque BOOLEAN NOT NULL DEFAULT FALSE,
  publicada_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT colecoes_slug_formato CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

CREATE TABLE IF NOT EXISTS produtos (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  categoria_id BIGINT REFERENCES categorias(id) ON DELETE RESTRICT,
  nome VARCHAR(160) NOT NULL,
  slug VARCHAR(180) NOT NULL UNIQUE,
  descricao TEXT NOT NULL DEFAULT '',
  materiais TEXT,
  medidas TEXT,
  peso_gramas NUMERIC(8,2) CHECK (peso_gramas IS NULL OR peso_gramas >= 0),
  cuidados TEXT,
  prazo_producao_dias SMALLINT NOT NULL DEFAULT 0 CHECK (prazo_producao_dias >= 0),
  status VARCHAR(16) NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT', 'ACTIVE', 'ARCHIVED')),
  destaque BOOLEAN NOT NULL DEFAULT FALSE,
  novidade BOOLEAN NOT NULL DEFAULT FALSE,
  meta_title VARCHAR(70),
  meta_description VARCHAR(170),
  publicado_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT produtos_slug_formato CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

CREATE TABLE IF NOT EXISTS produto_variantes (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  produto_id BIGINT NOT NULL REFERENCES produtos(id) ON DELETE RESTRICT,
  sku VARCHAR(64) NOT NULL UNIQUE,
  nome VARCHAR(120) NOT NULL,
  atributos JSONB NOT NULL DEFAULT '{}'::jsonb,
  preco NUMERIC(12,2) NOT NULL CHECK (preco >= 0),
  preco_promocional NUMERIC(12,2),
  estoque SMALLINT NOT NULL DEFAULT 0 CHECK (estoque >= 0),
  estoque_reservado SMALLINT NOT NULL DEFAULT 0 CHECK (estoque_reservado >= 0),
  ativa BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT variantes_promocao_valida CHECK (
    preco_promocional IS NULL OR (preco_promocional >= 0 AND preco_promocional < preco)
  ),
  CONSTRAINT variantes_reserva_valida CHECK (estoque_reservado <= estoque),
  CONSTRAINT variantes_atributos_objeto CHECK (jsonb_typeof(atributos) = 'object')
);

CREATE TABLE IF NOT EXISTS produto_imagens (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  produto_id BIGINT NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  variante_id BIGINT REFERENCES produto_variantes(id) ON DELETE SET NULL,
  url TEXT NOT NULL,
  alt_text VARCHAR(180) NOT NULL,
  mime_type VARCHAR(80),
  largura_px INTEGER CHECK (largura_px IS NULL OR largura_px > 0),
  altura_px INTEGER CHECK (altura_px IS NULL OR altura_px > 0),
  ordem SMALLINT NOT NULL DEFAULT 0,
  principal BOOLEAN NOT NULL DEFAULT FALSE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS produto_colecoes (
  produto_id BIGINT NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  colecao_id BIGINT NOT NULL REFERENCES colecoes(id) ON DELETE CASCADE,
  ordem SMALLINT NOT NULL DEFAULT 0,
  PRIMARY KEY (produto_id, colecao_id)
);

CREATE TABLE IF NOT EXISTS cupons (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  codigo VARCHAR(40) NOT NULL,
  descricao VARCHAR(180),
  tipo VARCHAR(16) NOT NULL CHECK (tipo IN ('PERCENT', 'FIXED')),
  valor NUMERIC(12,2) NOT NULL CHECK (valor > 0),
  pedido_minimo NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (pedido_minimo >= 0),
  desconto_maximo NUMERIC(12,2) CHECK (desconto_maximo IS NULL OR desconto_maximo > 0),
  limite_usos INTEGER CHECK (limite_usos IS NULL OR limite_usos > 0),
  limite_por_cliente SMALLINT NOT NULL DEFAULT 1 CHECK (limite_por_cliente > 0),
  usos INTEGER NOT NULL DEFAULT 0 CHECK (usos >= 0),
  inicia_em TIMESTAMPTZ,
  expira_em TIMESTAMPTZ,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT cupons_percentual_valido CHECK (tipo <> 'PERCENT' OR valor <= 100),
  CONSTRAINT cupons_periodo_valido CHECK (expira_em IS NULL OR inicia_em IS NULL OR expira_em > inicia_em)
);

CREATE TABLE IF NOT EXISTS cupom_produtos (
  cupom_id BIGINT NOT NULL REFERENCES cupons(id) ON DELETE CASCADE,
  produto_id BIGINT NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  PRIMARY KEY (cupom_id, produto_id)
);

CREATE TABLE IF NOT EXISTS cupom_categorias (
  cupom_id BIGINT NOT NULL REFERENCES cupons(id) ON DELETE CASCADE,
  categoria_id BIGINT NOT NULL REFERENCES categorias(id) ON DELETE CASCADE,
  PRIMARY KEY (cupom_id, categoria_id)
);

CREATE TABLE IF NOT EXISTS pedidos (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  codigo_publico VARCHAR(32) NOT NULL UNIQUE,
  access_token_hash CHAR(64) NOT NULL,
  cliente_id BIGINT REFERENCES clientes(id) ON DELETE RESTRICT,
  cupom_id BIGINT REFERENCES cupons(id) ON DELETE SET NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'PENDING_PAYMENT'
    CHECK (status IN ('PENDING_PAYMENT', 'PAID', 'IN_PRODUCTION', 'READY_TO_SHIP', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED', 'CHARGEBACK')),
  email_cliente VARCHAR(254) NOT NULL,
  nome_cliente VARCHAR(220) NOT NULL,
  telefone_cliente VARCHAR(24),
  endereco_entrega JSONB NOT NULL,
  moeda CHAR(3) NOT NULL DEFAULT 'BRL' CHECK (moeda ~ '^[A-Z]{3}$'),
  subtotal NUMERIC(12,2) NOT NULL CHECK (subtotal >= 0),
  desconto NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (desconto >= 0),
  frete NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (frete >= 0),
  total NUMERIC(12,2) NOT NULL CHECK (total >= 0),
  observacoes_cliente VARCHAR(1000),
  cancelado_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pedidos_email_formato CHECK (position('@' IN email_cliente) > 1),
  CONSTRAINT pedidos_endereco_objeto CHECK (jsonb_typeof(endereco_entrega) = 'object'),
  CONSTRAINT pedidos_total_coerente CHECK (total = subtotal - desconto + frete),
  CONSTRAINT pedidos_desconto_valido CHECK (desconto <= subtotal)
);

CREATE TABLE IF NOT EXISTS pedido_itens (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  pedido_id BIGINT NOT NULL REFERENCES pedidos(id) ON DELETE RESTRICT,
  produto_id BIGINT REFERENCES produtos(id) ON DELETE SET NULL,
  variante_id BIGINT REFERENCES produto_variantes(id) ON DELETE SET NULL,
  nome_produto VARCHAR(160) NOT NULL,
  sku VARCHAR(64) NOT NULL,
  nome_variante VARCHAR(120) NOT NULL,
  atributos_variante JSONB NOT NULL DEFAULT '{}'::jsonb,
  quantidade SMALLINT NOT NULL CHECK (quantidade > 0),
  preco_unitario NUMERIC(12,2) NOT NULL CHECK (preco_unitario >= 0),
  subtotal NUMERIC(12,2) NOT NULL CHECK (subtotal >= 0),
  CONSTRAINT pedido_itens_subtotal_coerente CHECK (subtotal = preco_unitario * quantidade),
  CONSTRAINT pedido_itens_atributos_objeto CHECK (jsonb_typeof(atributos_variante) = 'object')
);

CREATE TABLE IF NOT EXISTS pagamentos (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  pedido_id BIGINT NOT NULL REFERENCES pedidos(id) ON DELETE RESTRICT,
  provedor VARCHAR(32) NOT NULL,
  gateway_payment_id VARCHAR(160),
  idempotency_key VARCHAR(128) NOT NULL UNIQUE,
  status VARCHAR(16) NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'AUTHORIZED', 'APPROVED', 'DECLINED', 'CANCELLED', 'REFUNDED', 'CHARGEBACK')),
  metodo VARCHAR(40),
  moeda CHAR(3) NOT NULL DEFAULT 'BRL' CHECK (moeda ~ '^[A-Z]{3}$'),
  valor NUMERIC(12,2) NOT NULL CHECK (valor >= 0),
  aprovado_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provedor, gateway_payment_id)
);

CREATE TABLE IF NOT EXISTS cupom_utilizacoes (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cupom_id BIGINT NOT NULL REFERENCES cupons(id) ON DELETE RESTRICT,
  pedido_id BIGINT NOT NULL UNIQUE REFERENCES pedidos(id) ON DELETE RESTRICT,
  cliente_id BIGINT REFERENCES clientes(id) ON DELETE RESTRICT,
  email_normalizado VARCHAR(254) NOT NULL,
  desconto_aplicado NUMERIC(12,2) NOT NULL CHECK (desconto_aplicado >= 0),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS webhook_eventos (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  provedor VARCHAR(32) NOT NULL,
  gateway_event_id VARCHAR(180) NOT NULL,
  tipo_evento VARCHAR(100),
  payload_hash CHAR(64) NOT NULL,
  assinatura_valida BOOLEAN NOT NULL,
  status_processamento VARCHAR(16) NOT NULL DEFAULT 'RECEIVED'
    CHECK (status_processamento IN ('RECEIVED', 'PROCESSED', 'IGNORED', 'FAILED')),
  tentativas SMALLINT NOT NULL DEFAULT 0 CHECK (tentativas >= 0),
  erro_codigo VARCHAR(80),
  recebido_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  processado_em TIMESTAMPTZ,
  UNIQUE (provedor, gateway_event_id)
);

CREATE TABLE IF NOT EXISTS sessoes (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  admin_id BIGINT NOT NULL REFERENCES usuarios_admin(id) ON DELETE CASCADE,
  token_hash CHAR(64) NOT NULL UNIQUE,
  csrf_secret_hash CHAR(64) NOT NULL,
  ip_hash CHAR(64),
  user_agent_hash CHAR(64),
  expira_em TIMESTAMPTZ NOT NULL,
  ultimo_uso_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  revogada_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT sessoes_expiracao_valida CHECK (expira_em > criado_em)
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  admin_id BIGINT NOT NULL REFERENCES usuarios_admin(id) ON DELETE CASCADE,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expira_em TIMESTAMPTZ NOT NULL,
  usado_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT reset_expiracao_valida CHECK (expira_em > criado_em)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  admin_id BIGINT REFERENCES usuarios_admin(id) ON DELETE SET NULL,
  acao VARCHAR(80) NOT NULL,
  tipo_recurso VARCHAR(80),
  recurso_id VARCHAR(100),
  resultado VARCHAR(16) NOT NULL CHECK (resultado IN ('SUCCESS', 'DENIED', 'FAILED')),
  request_id VARCHAR(64),
  ip_hash CHAR(64),
  metadados JSONB NOT NULL DEFAULT '{}'::jsonb,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT audit_metadados_objeto CHECK (jsonb_typeof(metadados) = 'object')
);

CREATE TABLE IF NOT EXISTS configuracoes (
  chave VARCHAR(100) PRIMARY KEY,
  valor JSONB NOT NULL,
  descricao VARCHAR(240),
  publica BOOLEAN NOT NULL DEFAULT FALSE,
  atualizado_por BIGINT REFERENCES usuarios_admin(id) ON DELETE SET NULL,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS banners (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  titulo VARCHAR(160) NOT NULL,
  subtitulo VARCHAR(300),
  imagem_url TEXT,
  link_url TEXT,
  texto_botao VARCHAR(50),
  posicao VARCHAR(40) NOT NULL DEFAULT 'HOME_HERO',
  ativo BOOLEAN NOT NULL DEFAULT FALSE,
  ordem SMALLINT NOT NULL DEFAULT 0,
  inicia_em TIMESTAMPTZ,
  termina_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT banners_periodo_valido CHECK (termina_em IS NULL OR inicia_em IS NULL OR termina_em > inicia_em)
);

CREATE TABLE IF NOT EXISTS movimentos_estoque (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  variante_id BIGINT NOT NULL REFERENCES produto_variantes(id) ON DELETE RESTRICT,
  pedido_id BIGINT REFERENCES pedidos(id) ON DELETE RESTRICT,
  admin_id BIGINT REFERENCES usuarios_admin(id) ON DELETE SET NULL,
  tipo VARCHAR(24) NOT NULL
    CHECK (tipo IN ('INITIAL', 'ADJUSTMENT', 'RESERVATION', 'RELEASE', 'SALE', 'RETURN')),
  quantidade SMALLINT NOT NULL CHECK (quantidade <> 0),
  saldo_apos SMALLINT NOT NULL CHECK (saldo_apos >= 0),
  motivo VARCHAR(240),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reservas_estoque (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  pedido_id BIGINT NOT NULL REFERENCES pedidos(id) ON DELETE RESTRICT,
  variante_id BIGINT NOT NULL REFERENCES produto_variantes(id) ON DELETE RESTRICT,
  quantidade SMALLINT NOT NULL CHECK (quantidade > 0),
  status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE', 'CONSUMED', 'RELEASED', 'EXPIRED')),
  expira_em TIMESTAMPTZ NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (pedido_id, variante_id)
);

CREATE TABLE IF NOT EXISTS idempotency_keys (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  escopo VARCHAR(50) NOT NULL,
  chave_hash CHAR(64) NOT NULL,
  request_hash CHAR(64) NOT NULL,
  status_code SMALLINT CHECK (status_code IS NULL OR status_code BETWEEN 100 AND 599),
  response_body JSONB,
  recurso_id VARCHAR(100),
  expira_em TIMESTAMPTZ NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (escopo, chave_hash),
  CONSTRAINT idempotency_expiracao_valida CHECK (expira_em > criado_em)
);

CREATE TABLE IF NOT EXISTS pedido_status_historico (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  pedido_id BIGINT NOT NULL REFERENCES pedidos(id) ON DELETE RESTRICT,
  status_anterior VARCHAR(24),
  status_novo VARCHAR(24) NOT NULL,
  admin_id BIGINT REFERENCES usuarios_admin(id) ON DELETE SET NULL,
  motivo VARCHAR(240),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION set_atualizado_em()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  tabela TEXT;
BEGIN
  FOREACH tabela IN ARRAY ARRAY[
    'usuarios_admin', 'clientes', 'enderecos', 'categorias', 'colecoes',
    'produtos', 'produto_variantes', 'cupons', 'pedidos', 'pagamentos',
    'banners', 'reservas_estoque', 'configuracoes'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_%I_atualizado_em ON %I', tabela, tabela);
    EXECUTE format(
      'CREATE TRIGGER set_%I_atualizado_em BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_atualizado_em()',
      tabela,
      tabela
    );
  END LOOP;
END;
$$;

-- A API pública atual é somente leitura e acessa apenas o catálogo.
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA app FROM brinco_app;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA app FROM brinco_app;
REVOKE ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA app FROM brinco_app;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA app FROM PUBLIC;

ALTER DEFAULT PRIVILEGES FOR ROLE brinco_owner IN SCHEMA app
  REVOKE ALL PRIVILEGES ON TABLES FROM brinco_app;
ALTER DEFAULT PRIVILEGES FOR ROLE brinco_owner IN SCHEMA app
  REVOKE ALL PRIVILEGES ON SEQUENCES FROM brinco_app;
ALTER DEFAULT PRIVILEGES FOR ROLE brinco_owner IN SCHEMA app
  REVOKE ALL PRIVILEGES ON FUNCTIONS FROM brinco_app;
ALTER DEFAULT PRIVILEGES FOR ROLE brinco_owner IN SCHEMA app
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

GRANT SELECT ON app.categorias, app.colecoes, app.produtos, app.produto_variantes,
  app.produto_imagens, app.produto_colecoes TO brinco_app;

RESET ROLE;
