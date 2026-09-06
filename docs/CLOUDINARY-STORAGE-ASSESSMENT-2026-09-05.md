# Avaliação de storage Cloudinary — Brinco de Princesa

**Data:** 05/09/2026

## Arquitetura anterior

O projeto expunha uma interface de storage com `put` e `delete`. O provider HTTP fazia `PUT` e `DELETE` em uma URL arbitrária usando Bearer token e montava a URL pública por concatenação. O serviço de imagens permanecia desacoplado do provider, e as rotas administrativas aplicavam autenticação, CSRF, papéis e limite de 5 MB.

## Decisão tomada

O provider HTTP não é compatível diretamente com Cloudinary. Cloudinary exige endpoints próprios, multipart upload, assinatura server-side, `secure_url` e `public_id` para gerenciamento. Foi criado um provider específico atrás da interface existente:

`StorageProvider -> CloudinaryStorageProvider -> Cloudinary API`

## Compatibilidade do provider http

Classificação: **❌ MELHOR CRIAR PROVIDER ESPECÍFICO**.

Forçar Cloudinary pelo provider HTTP perderia assinatura, resposta canônica, identificação do asset e exclusão correta. O provider HTTP existente foi preservado para compatibilidade, mas não é aceito em produção.

## Alterações realizadas

- Adicionado `createCloudinaryStorageProvider` em `backend/src/providers/storageProvider.js`.
- Upload assinado no backend via SHA-1 dos parâmetros Cloudinary.
- Multipart com `file`, `folder`, `public_id`, `timestamp`, `api_key` e `signature`.
- Persistência do `secure_url` e do `public_id` através do campo existente `storage_key`.
- Exclusão remota pelo endpoint `image/destroy` usando `public_id`.
- Implementados `addImage` e `deleteImage` no `adminRepository`, incluindo ordem, imagem principal e retorno do asset remoto.
- `STORAGE_PROVIDER=cloudinary` passou a ser obrigatório em produção.
- O setup check usa a configuração central validada.
- Não foi necessário alterar o banco.

## Variáveis necessárias

- `STORAGE_PROVIDER=cloudinary`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `CLOUDINARY_FOLDER` opcional, com padrão `brinco-de-princesa/products`

Nenhum valor real foi versionado.

## Segurança

- API Secret permanece somente no backend.
- Não há upload direto do frontend.
- Assinatura é calculada server-side.
- `public_id` é aleatório e não depende do nome original.
- Upload aceita apenas JPEG, PNG e WebP nos limites atuais da rota.
- O nome original não é usado para caminho ou identificação do asset.
- Controllers não conhecem Cloudinary.

## Upload

O fluxo atual continua aceitando múltiplas imagens por chamadas independentes, persiste URLs públicas seguras, suporta imagem principal e mantém autenticação administrativa, CSRF, autorização por papel e limite de 5 MB.

## Exclusão

O identificador remoto é persistido em `storage_key`. A exclusão usa esse identificador, não a URL pública. O serviço remove o asset remoto após a exclusão da linha de imagem e trata `not found` como idempotente.

## Banco

A migration 009 já fornece `produto_imagens.storage_key` com índice único parcial. Esse campo é suficiente para armazenar o `public_id`; nenhuma migration adicional foi criada.

## Testes

Foram adicionados testes para:

- configuração Cloudinary completa em produção;
- credenciais ausentes;
- provider inválido e providers proibidos em produção;
- setup check coerente com a inicialização;
- upload multipart assinado;
- URL segura e `public_id` persistível;
- exclusão com invalidação de CDN;
- erro do provider;
- persistência de URL e `storage_key` no repository de imagens;
- validações existentes do serviço de imagens.

Os testes mockam somente `fetch`, na fronteira externa do Cloudinary.

Regressão executada:

- frontend: 30 testes;
- backend unitário: 119 testes;
- PostgreSQL/integrados: 29 testes;
- total: 178 testes.

## Dependências externas

🔒 **DEPENDÊNCIA EXTERNA**

Ainda são necessárias conta Cloudinary, cloud name, API key, API secret, configuração de pasta, política de transformação/CDN e homologação real. Nenhuma credencial real estava disponível durante esta implementação.

## Status da integração

⚠️ **IMPLEMENTADO, AGUARDANDO CREDENCIAIS**

O adapter e a validação local estão implementados. A integração não foi declarada validada porque ainda não houve upload real para Cloudinary seguido de persistência, renderização no frontend e exclusão remota.
