# Fase 0 — Arquitetura do Brinco de Princesa

Status: proposta para aprovação. Nenhuma decisão marcada como “a definir” deve ser tratada como implementada.

## 1. Visão arquitetural

```text
Navegador (React/Vite)
  -> HTTPS / JSON
API REST (Node.js/Express)
  -> regras, autenticação, autorização, validação e transações
PostgreSQL (pg, SQL parametrizado, sem ORM)

Serviços externos isolados atrás de adaptadores:
  -> gateway de pagamento (um único provedor, a definir)
  -> cálculo/rastreio de frete (a definir)
  -> e-mail transacional (a definir)
  -> armazenamento de imagens (a definir)
```

O frontend nunca acessa o banco. A API é a autoridade sobre preço, desconto, estoque, frete, total, estado de pedido e pagamento. Integrações externas ficam em adaptadores para evitar que regras de negócio dependam diretamente de um fornecedor.

### Decisões propostas

- Monorepositório com `frontend`, `backend`, `database` e `docs`.
- API versionada em `/api/v1`.
- JavaScript ESM em frontend e backend, conforme o requisito.
- PostgreSQL como fonte de verdade; `NUMERIC(12,2)` para valores monetários.
- Sessão administrativa opaca em cookie HttpOnly; não usar token administrativo em `localStorage`.
- Checkout inicialmente como convidado. Conta de cliente fica como decisão separada, sem bloquear vendas.
- Um único gateway, por checkout hospedado ou componentes oficiais tokenizados.
- Estoque baixado/reservado dentro de transação, com política de expiração a definir.
- Auditoria append-only para ações administrativas relevantes.

## 2. Estrutura planejada

```text
brinco-de-princesa/
├── frontend/
│   ├── public/
│   │   └── brand/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── common/
│   │   │   ├── commerce/
│   │   │   └── forms/
│   │   ├── contexts/
│   │   ├── hooks/
│   │   ├── layouts/
│   │   ├── pages/
│   │   │   ├── public/
│   │   │   └── admin/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── styles/
│   │   └── utils/
│   ├── tests/
│   ├── .env.example
│   └── package.json
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middlewares/
│   │   ├── repositories/
│   │   ├── routes/
│   │   ├── security/
│   │   ├── services/
│   │   ├── utils/
│   │   └── validators/
│   ├── tests/
│   │   ├── integration/
│   │   ├── security/
│   │   └── unit/
│   ├── .env.example
│   └── package.json
├── database/
│   ├── database.sql
│   ├── tables.sql
│   ├── indexes.sql
│   └── seed.sql
├── docs/
│   ├── ARCHITECTURE.md
│   ├── API.md
│   ├── DATABASE.md
│   ├── DEPLOY.md
│   ├── LGPD.md
│   ├── PAYMENTS.md
│   └── SECURITY.md
├── .gitignore
└── README.md
```

## 3. Domínios e responsabilidades

- **Catálogo:** categorias, coleções, produtos, variantes e imagens.
- **Comercial:** cupons, carrinho cotado no servidor, checkout e pedidos.
- **Estoque:** disponibilidade, reserva/baixa e trilha de alterações.
- **Pagamento:** intenção, retorno, webhook, conciliação e reembolso.
- **Clientes:** identificação mínima, endereços e consulta segura de pedido.
- **Administração:** catálogo, pedidos, clientes, cupons, configurações e auditoria.
- **Conteúdo institucional:** história, processo artesanal, personalizados e políticas.

Controllers traduzem HTTP; services aplicam regras e transações; repositories contêm SQL parametrizado; validators rejeitam entradas inválidas e campos inesperados. Essa separação deve ser testada e não apenas nominal.

## 4. Modelo de dados

### Tabelas principais

| Tabela | Finalidade | Relações centrais |
|---|---|---|
| `usuarios_admin` | administradores, hash e estado da conta | 1:N sessões, tokens e logs |
| `clientes` | dados mínimos do comprador | 1:N endereços e pedidos |
| `enderecos` | entrega/cobrança | N:1 cliente; snapshot também no pedido |
| `categorias` | classificação hierárquica opcional | 1:N produtos; self-FK opcional |
| `colecoes` | agrupamentos editoriais | N:N produtos |
| `produtos` | dados compartilhados do item | N:1 categoria; 1:N variantes e imagens |
| `produto_variantes` | SKU, atributos, preço e estoque | N:1 produto |
| `produto_imagens` | URL, alt, ordem e variante opcional | N:1 produto; N:1 variante opcional |
| `produto_colecoes` | junção produto/coleção | FK para ambos |
| `pedidos` | totais, estado logístico e snapshots de contato/endereço | N:1 cliente opcional; 1:N itens e pagamentos |
| `pedido_itens` | snapshot imutável do item comprado | N:1 pedido; referências opcionais ao catálogo |
| `pagamentos` | estado e IDs não sensíveis do gateway | N:1 pedido |
| `cupons` | regras de desconto | 1:N utilizações; elegibilidade por junções |
| `cupom_utilizacoes` | consumo/idempotência do cupom | N:1 cupom, cliente e pedido |
| `webhook_eventos` | deduplicação e resultado do evento | referência lógica ao pagamento |
| `sessoes` | sessão administrativa revogável | N:1 admin |
| `password_reset_tokens` | token com hash, expiração e uso único | N:1 admin |
| `audit_logs` | trilha administrativa sem segredos | N:1 admin opcional |
| `configuracoes` | parâmetros não secretos e versionáveis | chave única |
| `banners` | conteúdo editorial da home | independente |

### Extensões recomendadas

- `movimentos_estoque`: razão, quantidade, saldo e referência ao pedido/admin. Evita depender apenas do saldo atual.
- `reservas_estoque`: se o gateway assíncrono exigir reserva temporária antes da aprovação.
- `idempotency_keys`: chave, escopo, hash da requisição, resposta e expiração para checkout.
- `pedido_status_historico`: transições do pedido com autor e data.
- `cupom_produtos` e `cupom_categorias`: restrições de elegibilidade.

### Integridade crítica

- UUID ou identidade bigint são aceitáveis internamente; códigos públicos de pedido devem ser aleatórios e não enumeráveis.
- `slug`, `sku`, e-mails normalizados, código do pedido e IDs externos do gateway recebem `UNIQUE` quando aplicável.
- `CHECK` impede quantidade menor que zero, total negativo e estados fora do conjunto aceito.
- FKs usam exclusão restrita em registros financeiros. Pedido e itens não são apagados em cascata.
- `pedido_itens` guarda nome, SKU, variante, quantidade, preço unitário e subtotal do momento da compra.
- Pedido guarda snapshot do endereço; alterações posteriores no cadastro não reescrevem o histórico.
- A criação do pedido bloqueia as variantes necessárias (`SELECT ... FOR UPDATE`) e valida estoque na mesma transação.
- Transições de pedido e pagamento usam matrizes explícitas; pagamento e logística permanecem independentes.

### Relações resumidas

```text
clientes 1--N enderecos
clientes 1--N pedidos 1--N pedido_itens
pedidos 1--N pagamentos
categorias 1--N produtos 1--N produto_variantes
produtos 1--N produto_imagens
produtos N--N colecoes
cupons 1--N cupom_utilizacoes N--1 pedidos
usuarios_admin 1--N sessoes
usuarios_admin 1--N audit_logs
```

## 5. API REST proposta

Todas as respostas usam DTOs explícitos e envelope de erro estável. Paginação tem limite máximo no servidor.

### Pública

```text
GET    /api/v1/catalog/categories
GET    /api/v1/catalog/collections
GET    /api/v1/catalog/collections/:slug
GET    /api/v1/products
GET    /api/v1/products/:slug
POST   /api/v1/cart/quote
POST   /api/v1/coupons/validate
POST   /api/v1/checkout/orders
GET    /api/v1/orders/:publicCode           (com prova de acesso)
POST   /api/v1/orders/:publicCode/access    (fluxo a definir)
POST   /api/v1/contact
GET    /api/v1/content/:slug
GET    /api/v1/health/live
GET    /api/v1/health/ready
```

`cart/quote` recebe somente variante, quantidade, cupom e destino necessário ao frete; retorna cálculo autoritativo com prazo curto de validade. `checkout/orders` exige chave de idempotência, recalcula tudo e nunca aceita preço ou total do navegador.

### Pagamento/webhook

```text
POST   /api/v1/payments/:orderCode/session
GET    /api/v1/payments/:orderCode/status   (com prova de acesso)
POST   /api/v1/webhooks/payments/:provider
```

Retorno visual de “sucesso” não aprova pagamento. O webhook validado e, quando exigido, a consulta server-to-server ao provedor determinam o estado.

### Autenticação administrativa

```text
GET    /api/v1/admin/csrf
POST   /api/v1/admin/auth/login
POST   /api/v1/admin/auth/logout
GET    /api/v1/admin/auth/session
POST   /api/v1/admin/auth/forgot-password
POST   /api/v1/admin/auth/reset-password
```

### Administrativa protegida

```text
GET    /api/v1/admin/dashboard
CRUD   /api/v1/admin/products
CRUD   /api/v1/admin/products/:id/variants
CRUD   /api/v1/admin/products/:id/images
CRUD   /api/v1/admin/categories
CRUD   /api/v1/admin/collections
GET    /api/v1/admin/orders
GET    /api/v1/admin/orders/:id
PATCH  /api/v1/admin/orders/:id/status
GET    /api/v1/admin/customers
GET    /api/v1/admin/customers/:id
CRUD   /api/v1/admin/coupons
GET    /api/v1/admin/audit-logs
GET    /api/v1/admin/settings
PATCH  /api/v1/admin/settings
POST   /api/v1/admin/uploads/images
```

Rotas de exclusão preferem arquivamento quando há vínculo histórico. Toda autorização ocorre no backend.

## 6. Autenticação e autorização

### Administradores

1. Senha com Argon2id (parâmetros aferidos na infraestrutura) ou bcrypt com custo aferido se houver restrição operacional.
2. Mensagem de erro uniforme para reduzir enumeração; atraso/rate limit por combinação de conta, origem e sinais adicionais.
3. Sessão opaca aleatória; somente o hash do identificador fica no banco.
4. Cookie `HttpOnly`, `Secure` em produção, `SameSite=Lax` ou `Strict`, escopo/path mínimo e rotação após login.
5. CSRF por token ligado à sessão para operações mutáveis, mais verificação de `Origin`/`Referer` como camada adicional.
6. Logout revoga a sessão no servidor. Expiração absoluta e por inatividade.
7. Recuperação usa token aleatório de uso único, armazenado com hash, prazo curto e invalidação das sessões após troca.
8. RBAC mínimo (`OWNER`, `MANAGER`, `FULFILLMENT`) é recomendado antes de haver mais de uma pessoa no painel.

### Clientes e consulta de pedidos

Conta de cliente ainda não foi decidida. Para checkout convidado, a consulta do pedido não pode depender só do código: proposta é link com token de acesso aleatório enviado ao e-mail e armazenado com hash, ou autenticação por código temporário. IDs sequenciais nunca serão credencial.

## 7. Pagamentos

- Escolher exatamente um provedor após avaliar contrato, taxas, Pix/cartão, chargeback, split (se necessário), suporte e qualidade do sandbox.
- Preferir checkout hospedado ou componente oficial tokenizado. O navegador transmite os dados sensíveis diretamente ao provedor.
- A aplicação não recebe nem armazena PAN completo, CVV, trilha magnética ou senha. No banco ficam pedido, ID externo, valor, moeda, método genérico, status e timestamps necessários à conciliação.
- Segredos existem apenas no backend e no cofre de segredos do ambiente, separados entre sandbox e produção.
- A criação do pagamento usa idempotência. O valor nasce do cálculo server-side persistido no pedido.
- Webhook: validar assinatura e janela temporal, validar schema, deduplicar ID do evento, localizar pagamento, confirmar dados com o provedor quando aplicável, comparar valor/moeda/pedido, executar transição idempotente e auditar o resultado.
- Página de retorno é apenas informativa; consulta o status interno e nunca marca pedido como pago.
- Reembolsos exigem autorização administrativa, idempotência e conciliação.

O escopo PCI final só pode ser avaliado depois de escolher o fluxo oficial do provedor e a forma de incorporação no site.

## 8. Controles de segurança

| Risco | Controle planejado | Verificação |
|---|---|---|
| SQL injection | placeholders do `pg`; allowlist para ordenação | testes de repositório e revisão automatizada/manual |
| XSS | React escapando texto; sem HTML arbitrário; CSP | testes com payloads e relatório CSP |
| CSRF | token ligado à sessão + cookie seguro + origem | integração com requisição cruzada |
| IDOR/BOLA | código público não enumerável + vínculo/prova de acesso | teste de acesso cruzado |
| preço adulterado | recálculo integral no backend | teste enviando preço/total falsos |
| overselling | transação, lock de linha e `CHECK` | testes concorrentes |
| duplo checkout | idempotency key e restrição única | repetição e concorrência |
| webhook falso/replay | assinatura, timestamp, deduplicação e confirmação | fixtures inválidas/repetidas |
| brute force | limites multicritério, backoff e alertas | testes de limite sem bloquear usuário globalmente |
| session fixation/hijacking | rotação, hash, cookie e revogação | testes de sessão antiga/expirada |
| mass assignment | schemas com campos explícitos | payload com campos administrativos extras |
| upload malicioso | tamanho/quantidade, MIME real, extensão, nome aleatório, storage sem execução | corpus de arquivos inválidos |
| vazamento em logs | redaction e allowlist de campos | teste automatizado de segredos/PII |
| dependência vulnerável | lockfile, auditoria e atualização revisada | CI e triagem periódica |

Também serão configurados Helmet com CSP específica, `frame-ancestors`, `nosniff`, Referrer-Policy e HSTS somente sob HTTPS; CORS por allowlist; limites separados por rota; validação de body/params/query; limite de payload; erros sem stack/SQL em produção; conta PostgreSQL sem superusuário; backups criptografados e restauração testada.

## 9. LGPD e privacidade por design

Antes do deploy será criado um inventário por dado contendo finalidade, hipótese legal a validar, origem, armazenamento, acesso, compartilhamento, retenção e descarte. Hipóteses legais finais precisam de validação jurídica contextual; não serão inventadas pelo software.

Matriz inicial:

| Dados | Finalidade | Acesso | Retenção proposta |
|---|---|---|---|
| nome e contato | checkout, comunicação e suporte | atendimento/operacional | definir por obrigação e necessidade |
| endereço | entrega e evidência da operação | operacional/logística | snapshot pelo período legal aplicável |
| itens e valores | execução, fiscal, defesa e conciliação | operacional/financeiro | definir com contabilidade/jurídico |
| pagamento não sensível | conciliação e antifraude | financeiro restrito | conforme contrato/obrigações |
| IP e eventos de segurança | segurança e prevenção a fraude | segurança restrita | curta e documentada |
| preferências de marketing | comunicação opcional | marketing autorizado | até revogação ou fim da finalidade |

- Minimizar campos: CPF só entra quando a finalidade fiscal/comercial for confirmada.
- Cookies essenciais separados de analytics/marketing; nenhum rastreador será adicionado por padrão.
- Processo para acesso, correção, oposição, portabilidade quando aplicável, exclusão/anonimização e resposta documentada.
- Exclusão não apaga registros cuja retenção seja legalmente necessária; restringe uso e anonimiza quando possível.
- Fornecedores são catalogados como operadores/suboperadores conforme o caso, com contratos e transferências avaliados.
- Plano de incidente define detecção, contenção, evidências, avaliação de risco, comunicação e lições aprendidas.
- Logs evitam corpo completo, token, cookie, senha, segredo e dados de cartão.

## 10. Identidade visual e uso da logo

- Arquivo oficial preservado em `public/brand/brinco-de-princesa-logo.png`.
- Uso planejado no header, footer, favicon e Open Graph, com fundo/contraste adequados e sem deformação.
- Gerar derivados WebP/AVIF e tamanhos responsivos na fase visual; manter PNG original como fonte.
- A logo informativa terá texto alternativo “Brinco de Princesa”; quando redundante ao nome adjacente, será decorativa.
- Tokens CSS: `#701921`, `#541219`, `#FEFEFB`, `#EEE5DA`, `#C9A579`, `#34282A`, `#FFFFFF`.
- Fonte da logo permanece “a identificar”. Títulos usarão fallback serifado configurável e corpo legível; não alegaremos ter identificado a fonte pela imagem.

## 11. Testes e entrega

- Unitários para cálculo, cupons e máquinas de estado.
- Integração com PostgreSQL real isolado para transações, constraints e repositories.
- API para autenticação, autorização, catálogo, checkout, pedidos e webhooks.
- Segurança para SQLi, XSS, CSRF, IDOR, preço adulterado, quantidade inválida, replay e acesso admin.
- Concorrência para estoque e idempotência.
- Frontend para carrinho, formulários e rotas críticas; E2E do fluxo de compra e administração.
- Acessibilidade automatizada mais teclado/leitor de tela manual nos fluxos críticos.
- Breakpoints verificados em 320, 375, 390, 768, 1024 e 1440+.
- CI: lint, testes, build, auditoria revisável e migração SQL em banco descartável.

## 12. Fases e critérios de saída

1. **Fase 0 — arquitetura:** decisões documentadas e pontos abertos aprovados.
2. **Fase 1 — estrutura:** monorepo executável, configuração e health checks.
3. **Fase 2 — banco:** SQL manual, constraints, índices e seeds testados.
4. **Fase 3 — institucional:** páginas públicas responsivas, acessíveis e com identidade oficial.
5. **Fase 4 — catálogo:** API/admin de categorias, coleções, produtos, variantes e imagens.
6. **Fase 5 — loja:** busca, filtros, paginação e página do produto.
7. **Fase 6 — carrinho:** estado local com cotação autoritativa no backend.
8. **Fase 7 — clientes:** dados mínimos, endereços e acesso seguro ao pedido.
9. **Fase 8 — checkout/pedidos:** transação, snapshots, estoque e idempotência.
10. **Fase 9 — admin:** dashboard e operações autorizadas/auditadas.
11. **Fase 10 — autenticação:** sessões, CSRF, recuperação e RBAC.
12. **Fase 11 — hardening:** CSP, CORS, limites, uploads, logs e testes ofensivos básicos.
13. **Fase 12 — pagamento:** um gateway oficial em sandbox.
14. **Fase 13 — webhooks:** assinatura, conciliação, replay e idempotência.
15. **Fase 14 — LGPD:** inventário, políticas, direitos e retenção aprovados.
16. **Fase 15 — testes:** suíte crítica e evidências.
17. **Fase 16 — auditoria:** revisão de arquitetura, segurança, acessibilidade e performance.
18. **Fase 17 — deploy:** HTTPS, secrets, observabilidade, backup e restauração testada.

Cada fase só é concluída com arquivos alterados, testes executados, resultado real, análise de segurança e limitações restantes.

## 13. Riscos e decisões pendentes

Bloqueadores antes das respectivas fases:

1. Gateway e métodos de pagamento desejados; CNPJ/conta e contrato ainda não informados.
2. Política de reserva/baixa de estoque e prazo para pedidos pendentes.
3. Origem do frete, transportadoras, cálculo, regiões e retirada local.
4. Necessidade fiscal de CPF, emissão de nota e integrações contábeis.
5. Checkout convidado versus conta de cliente; proposta inicial é convidado.
6. Provedor de e-mail, domínio remetente e recuperação administrativa.
7. Hospedagem, região, domínio, volumes esperados, RPO e RTO de backup.
8. Storage/CDN de imagens e processo editorial de upload.
9. Regras reais de cupons, personalizados, prazo de produção, troca e devolução.
10. Conteúdo real: história, artesã, contatos, produtos, fotos e depoimentos autorizados.
11. Fonte oficial da marca e versões vetoriais/transparente da logo, se existirem.
12. Papéis administrativos e número de operadores.
13. Base legal, prazos de retenção e textos jurídicos requerem validação profissional contextual.

## 14. Critério de aprovação da Fase 0

Aprovar: arquitetura em camadas, tabelas/extensões, API, sessão administrativa por cookie, checkout convidado inicial, abordagem de pagamento, plano LGPD e sequência das fases. Decisões ainda não necessárias podem permanecer registradas, mas devem ser resolvidas antes da fase que dependem delas.
