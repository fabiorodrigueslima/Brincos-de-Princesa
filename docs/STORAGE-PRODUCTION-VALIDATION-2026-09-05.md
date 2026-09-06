# Validação de storage em produção — Brinco de Princesa

**Data:** 05/09/2026

## Problema original

A aplicação podia iniciar em `NODE_ENV=production` com `STORAGE_PROVIDER=disabled`. O painel administrativo mantinha upload de imagens, mas o erro `503 STORAGE_NOT_CONFIGURED` só aparecia durante o upload.

Também havia divergência entre `env.js` e `setupCheck.js`: o schema central permitia `disabled`, enquanto o setup check aplicava uma regra textual separada usando `process.env.STORAGE_PROVIDER`.

## Causa

A validação central bloqueava apenas `local` em produção. `disabled` continuava sendo um valor aceito pelo schema. O provider selecionava o provider desabilitado e adiava a falha para o primeiro upload.

## Correção realizada

- Produção agora exige `STORAGE_PROVIDER=http`.
- `disabled` e `local` falham durante o carregamento de `env.js` em produção.
- Provider inválido ou vazio continua sendo rejeitado pelo enum do Zod.
- `STORAGE_HTTP_URL`, `STORAGE_HTTP_TOKEN` e `STORAGE_PUBLIC_URL` continuam obrigatórios quando HTTP está ativo.
- `setupCheck.js` passou a consumir `env` validado, sem leitura direta de `process.env.STORAGE_PROVIDER`.
- O check de e-mail foi alinhado ao schema central como opcional, evitando divergência fora do escopo do storage.

## Arquivos modificados

- `backend/src/config/env.js`
- `backend/src/scripts/setupCheck.js`
- `backend/tests/env.test.js`
- `backend/tests/setup-check.test.js`
- `backend/.env.example`
- `docs/PRODUCTION.md`

## Regras de produção

- `STORAGE_PROVIDER=http`: permitido somente com URL, token e URL pública válidos.
- `STORAGE_PROVIDER=disabled`: falha antes da aplicação aceitar tráfego.
- `STORAGE_PROVIDER=local`: falha antes da aplicação aceitar tráfego.
- valor inválido ou vazio: falha no schema.

## Regras de development

`local` continua permitido para gravar em `backend/uploads`. `disabled` continua permitido quando o fluxo testado não depende de upload. Não é exigido storage externo.

## Regras de test

Os testes não dependem de storage HTTP real. `disabled` continua permitido e providers externos são validados com valores sintéticos e sem chamadas externas.

## Setup check

O setup check importa a mesma configuração validada usada pela aplicação. Configuração HTTP completa passa. Configuração `disabled` em produção falha no carregamento antes dos checks.

## Upload

O fluxo existente continua protegido por autenticação administrativa, autorização por papel, limite de 5 MB, MIME permitido, validação de bytes mágicos, nomes aleatórios e tratamento de erro do provider.

## Segurança

Nenhum segredo real foi adicionado ao repositório ou incluído neste relatório. O token de storage permanece restrito ao backend e ao secret manager/ambiente de execução.

## Testes específicos

- `tests/env.test.js`: 12 testes passaram.
- `tests/setup-check.test.js`: 2 testes passaram.
- `tests/image-service.test.js`: 3 testes passaram.
- Total focado: 17 testes passaram.

Cenários cobertos: production com `disabled`, `local`, provider inválido, HTTP sem URL, sem token, sem URL pública, HTTP completo, development com `local` e test com `disabled`.

## Regressão completa

- `npm run lint`: passou.
- `npm test`: passou.
- `npm run build`: passou.

## Nova contagem de testes

- Frontend: 30 testes.
- Backend unitário: 114 testes.
- PostgreSQL/integrados: 29 testes.
- Total: 173 testes.

## Dependências externas

A operação real ainda depende de um storage HTTP compatível, URL privada, token, URL pública/CDN, políticas de backup e retenção. Esses valores devem ser configurados fora do Git.

## Status do storage

✅ CORRIGIDO

A aplicação não inicia com storage desabilitado, local em produção ou configuração HTTP incompleta.

## Status do código

🟢 CÓDIGO PRONTO PARA PRODUÇÃO

A regra de fail-fast do storage está centralizada, testada e coerente com o setup check.

## Status do go-live

🟡 GO-LIVE DEPENDE DE CONFIGURAÇÕES EXTERNAS

Ainda é necessário configurar e homologar o storage HTTP real, além das demais integrações e infraestrutura de produção. Os testes locais não substituem essa validação externa.
