CREATE TABLE app.cursos (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nome VARCHAR(160) NOT NULL,
  slug VARCHAR(180) NOT NULL UNIQUE,
  resumo VARCHAR(300) NOT NULL DEFAULT '',
  descricao TEXT NOT NULL DEFAULT '',
  imagem_url TEXT,
  imagem_alt VARCHAR(180),
  status VARCHAR(16) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','PUBLISHED','ARCHIVED')),
  destaque BOOLEAN NOT NULL DEFAULT FALSE,
  publicado_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT cursos_slug_formato CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT cursos_imagem_coerente CHECK (imagem_url IS NOT NULL OR imagem_alt IS NULL),
  CONSTRAINT cursos_publicacao_coerente CHECK (status <> 'PUBLISHED' OR publicado_em IS NOT NULL)
);

CREATE TABLE app.curso_sessoes (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  curso_id BIGINT NOT NULL REFERENCES app.cursos(id) ON DELETE RESTRICT,
  inicia_em TIMESTAMPTZ,
  termina_em TIMESTAMPTZ,
  local TEXT,
  vagas SMALLINT CHECK (vagas IS NULL OR vagas > 0),
  status VARCHAR(16) NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED','CANCELLED','COMPLETED')),
  publica BOOLEAN NOT NULL DEFAULT FALSE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT curso_sessoes_periodo_valido CHECK (termina_em IS NULL OR inicia_em IS NULL OR termina_em > inicia_em)
);

CREATE INDEX cursos_publicos_idx ON app.cursos (publicado_em DESC, id DESC) WHERE status='PUBLISHED';
CREATE INDEX curso_sessoes_publicas_idx ON app.curso_sessoes (curso_id, inicia_em) WHERE publica=TRUE AND status='SCHEDULED';

CREATE TRIGGER set_cursos_atualizado_em BEFORE UPDATE ON app.cursos FOR EACH ROW EXECUTE FUNCTION app.set_atualizado_em();
CREATE TRIGGER set_curso_sessoes_atualizado_em BEFORE UPDATE ON app.curso_sessoes FOR EACH ROW EXECUTE FUNCTION app.set_atualizado_em();

REVOKE ALL PRIVILEGES ON app.cursos, app.curso_sessoes FROM PUBLIC, brinco_app;
REVOKE ALL PRIVILEGES ON app.cursos_id_seq, app.curso_sessoes_id_seq FROM PUBLIC, brinco_app;
GRANT SELECT ON app.cursos, app.curso_sessoes TO brinco_app;
