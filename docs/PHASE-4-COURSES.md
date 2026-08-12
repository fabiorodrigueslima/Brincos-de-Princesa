# Fase 4 — Cursos

## Arquitetura

Fluxo público: rota → validação Zod → controller → service → repository → PostgreSQL. O frontend consome `/api/v1/courses` e `/api/v1/courses/:slug` nas rotas `/cursos` e `/cursos/:slug`.

## Migration e tabelas

`003_courses.sql` cria `cursos` e `curso_sessoes`, índices públicos, constraints, triggers de atualização e privilégio mínimo de leitura para `brinco_app`. O runner controla ordem, transação e checksum.

Cursos possuem nome, slug, resumo, descrição, imagem opcional, status, destaque e datas. Um curso publicado exige `publicado_em`. Sessões pertencem a um curso por FK `RESTRICT` e possuem datas, local, vagas e visibilidade opcionais.

## Publicação

Somente cursos `PUBLISHED` com `publicado_em <= now()` são públicos. O detalhe retorna somente sessões `SCHEDULED`, públicas e futuras; campos ausentes permanecem nulos e não geram conteúdo inventado.

## Estado sem cursos

Nenhum curso é inserido no seed de desenvolvimento. A listagem e a Home mostram comunicação neutra quando o banco está vazio. Fixtures chamadas “Dados de demonstração” existem somente na suíte isolada de testes.

## Limitações deliberadas

Não foram implementados inscrição, pagamento, matrícula, conta de aluno, presença, certificado, upload ou CRUD administrativo. Uma futura tabela de inscrições só deve ser modelada quando regras comerciais, privacidade e pagamento forem confirmados.
