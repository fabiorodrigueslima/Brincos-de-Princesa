# Fase 1 — Estrutura React + Node

Status: concluída em 8 de agosto de 2026.

## O que foi implementado

- Monorepositório npm com workspaces `frontend` e `backend`.
- Frontend React 19, Vite e React Router.
- Layout mínimo responsivo com a logo oficial e os tokens de cor da marca.
- Rota inicial e página 404 controlada.
- API Express versionada em `/api/v1`.
- Endpoints `GET /api/v1/health/live` e `GET /api/v1/health/ready`.
- Configuração validada por variáveis de ambiente.
- CORS com allowlist, sem curinga.
- Helmet com política restritiva para as respostas da API.
- Limite geral de requisições.
- Limite de corpo JSON em 100 KB.
- Identificador de requisição validado/gerado pelo servidor.
- Respostas de erro controladas, sem stack trace ou detalhes internos.
- Encerramento gracioso do servidor.
- `x-powered-by` desabilitado.
- Arquivos `.env` e artefatos sensíveis ignorados pelo versionamento.

## Verificações executadas

Comando: `npm run check`.

Resultado:

- lint do frontend: aprovado;
- lint do backend: aprovado;
- testes da API: 3 aprovados;
- build de produção do frontend: aprovado;
- auditoria npm durante a instalação: 0 vulnerabilidades reportadas.

Os testes confirmam liveness, resposta 404 controlada, ausência do header `X-Powered-By`, presença de request ID e rejeição de origem fora da allowlist.

## Análise de segurança da fase

Os controles desta fase protegem somente a fundação HTTP. Ainda não existem autenticação, sessão, CSRF, banco, catálogo, checkout, pagamento ou upload; portanto, não há alegação de que esses fluxos estejam protegidos ou prontos.

O rate limit atual é genérico e baseado na identificação fornecida pela biblioteca. Limites multicritério e específicos para login, recuperação, checkout, cupom e webhook serão implementados quando as rotas existirem. A política CSP da API é deliberadamente restritiva; a política do frontend será definida junto às integrações reais.

O endpoint de readiness ainda testa apenas o processo da API. Na Fase 2 passará a refletir também a disponibilidade do PostgreSQL sem revelar credenciais ou detalhes internos.

## O que ainda não funciona

- Banco PostgreSQL e consultas.
- Catálogo e páginas institucionais definitivas.
- Carrinho, clientes, checkout e pedidos.
- Painel e autenticação administrativa.
- Pagamentos e webhooks.
- Upload e armazenamento de imagens.
- E-mail, frete, backup e deploy.

## Próxima fase

Fase 2: criar `database.sql`, `tables.sql`, `indexes.sql` e `seed.sql`, configurar o pool `pg`, implementar transações e testar constraints e integridade referencial em PostgreSQL real.
