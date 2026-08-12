# Fase 9 — auditoria profunda e readiness

Data: 12 de agosto de 2026. Escopo: árvore de trabalho das fases 1–8, sem commit, push ou deploy.

## Baseline

- Branch: `main`, sincronizada com `origin/main` no início.
- Estado preservado: 36 arquivos rastreados modificados e 70 entradas não rastreadas.
- Migrations: `001_baseline.sql` até `005_admin_security.sql`.
- Runtime: Node 24.18.1, npm 11.16.0, PostgreSQL 18.4.
- Frontend e backend: versão 0.1.0. Portas padrão: 5173 e 3000.
- Bancos locais: desenvolvimento, integração com sufixo `_test` e restore descartável com sufixo `_restore_test`.
- `git diff --check` estava aprovado. Nenhuma alteração foi descartada.

## Método e evidências

A auditoria combinou revisão estática, testes de API, PostgreSQL real, migrations do zero, seed repetido, concorrência, rollback, navegador real, build de produção, restore, busca de secrets e auditoria do registro npm. Aprovação unitária isolada não foi usada como prova de fluxo.

## Inventário funcional

| Área | Estado verificado | Evidência/reserva |
|---|---|---|
| Home, história, processo, contato | FUNCIONANDO | navegação real e 404 pública |
| Loja, busca, categorias, novidades e promoções | FUNCIONANDO | API/PostgreSQL e UI usam catálogo real |
| Coleções e coleção individual | FUNCIONANDO | vazio e inexistente tratados sem 500 |
| Produto, variantes, preço e galeria | FUNCIONANDO | modal, teclado, Escape e foco verificados |
| Carrinho | FUNCIONANDO após correção | fluxo real produto → carrinho e validação autoritativa |
| Checkout e endereço | FUNCIONANDO PARCIALMENTE | identificação e preenchimento manual funcionam |
| CEP | FUNCIONANDO PARCIALMENTE | provider e fallback manual implementados; disponibilidade externa não garantida |
| Frete | BLOQUEADA | provider, credenciais, origem, embalagem e dimensões ausentes |
| Pedido público | BLOQUEADA | depende de cotação logística final real |
| Consulta de pedido | FUNCIONANDO em integração | código aleatório + token em header, sem ID sequencial |
| Pagamento, PIX e cartão | BLOQUEADA | nenhum gateway configurado; nenhum dado de cartão é recebido |
| Cursos | FUNCIONANDO | estado vazio honesto; dados demo não viram oferta real |
| Admin login, sessão, logout, CSRF, RBAC | FUNCIONANDO | API e PostgreSQL real; login visual inspecionado |
| Dashboard e consultas admin | FUNCIONANDO | dados reais |
| Produtos/variantes admin | FUNCIONANDO PARCIALMENTE | API mutável existe; formulários visuais completos não |
| Estoque e pedidos admin | FUNCIONANDO PARCIALMENTE | API transacional existe; UI é predominantemente leitura |
| Categorias, coleções e cursos admin | FUNCIONANDO PARCIALMENTE | listagem, sem CRUD visual completo |
| Configurações e auditoria | FUNCIONANDO PARCIALMENTE | configuração segura limitada; sem tela completa de logs |
| Upload de imagens | NÃO IMPLEMENTADA | storage não escolhido |
| E-mail transacional | NÃO IMPLEMENTADA | provider não escolhido |

## Achados e correções

### HIGH corrigido

O PostgreSQL entrega `BIGINT` como texto. A página mostrava confirmação de inclusão, mas o reducer rejeitava o identificador textual e o carrinho permanecia vazio. Os DTOs de produto agora convertem IDs para números seguros. O fluxo foi repetido no navegador e chegou ao carrinho validado e ao checkout.

### MEDIUM corrigidos

- Admin e consulta protegida de pedido agora respondem `Cache-Control: no-store, private` e `Pragma: no-cache`.
- A expiração do cookie administrativo acompanha `ADMIN_SESSION_HOURS`, em vez de oito horas fixas.
- Healthchecks e webhooks autenticados não são bloqueados pela cota genérica por IP.
- `robots.txt` bloqueia `/admin`, `/checkout` e `/pedido/`.
- Foi removida a afirmação de entrega nacional enquanto a logística está indisponível.
- Texto antigo que dizia que categorias seriam conectadas no futuro foi corrigido.

### Riscos remanescentes

- HIGH/BLOCKER EXTERNO: frete e pagamento reais inexistentes impedem vendas.
- HIGH operacional: expiração de reservas é oportunística; produção precisa de job externo com execução única/segura.
- HIGH operacional: não há backup, monitoramento ou restore automatizados na hospedagem ainda não escolhida.
- MEDIUM: cinco falhas de senha bloqueiam a conta por 15 minutos; rate limit por IP reduz abuso simples, mas ataques distribuídos podem causar indisponibilidade direcionada.
- MEDIUM: o painel ainda não oferece toda a operação visual necessária para uma pessoa não técnica.
- MEDIUM: política de retenção LGPD, responsável, canal de titulares e bases legais exigem decisão da cliente/assessoria.
- LOW: canonical e sitemap aguardam domínio e inventário comercial definitivos.

## Banco, migrations e seed

- Migrations 001–005 aplicaram em banco limpo e a segunda execução não reaplicou arquivos.
- Checksum e ordem são verificados em `schema_migrations`.
- Seed de desenvolvimento é idempotente e rotula produtos/coleções como demonstração.
- Constraints rejeitam preço negativo, promoção inválida, estoque negativo, reserva acima do estoque, total incoerente, subtotal adulterado e FKs órfãs.
- Runtime usa papel limitado, sem superuser/createdb/createrole. Migration 005 concede somente operações necessárias.
- PostgreSQL 18.4 foi confirmado durante restore real.
- Dump do banco de teste foi restaurado em banco vazio; cinco migrations foram recuperadas e o banco descartável foi removido.

## Testes críticos

| Teste | Resultado | Evidência |
|---|---|---|
| Concorrência 2 compradores / estoque 1 | PASS | 1 sucesso e 1 `INSUFFICIENT_STOCK` |
| Alta concorrência 20 / estoque 5 | PASS | exatamente 5 reservas e 15 recusas |
| Idempotência 10 repetições | PASS | um pedido; payload diferente gera conflito |
| Rollback intermediário | PASS | cliente e chave removidos após falha no endereço |
| Reserva e expiração idempotente | PASS | saldo reservado volta a zero |
| Pagamento tardio | PASS | pedido não volta a pago; estoque não fica negativo |
| Webhook genérico | PASS; integração real BLOCKED | assinatura/provider reais aguardam gateway |
| Autenticação, sessão e logout | PASS | hashes, expiração e revogação testados |
| CSRF | PASS | token e Origin exigidos em mutações |
| RBAC/IDOR | PASS no modelo atual | autorização por papel aplicada no backend; não há ownership por operador |
| SQL injection | PASS | consultas parametrizadas e ordenação allowlisted |
| XSS | PASS básico | React escapa texto; nenhum `dangerouslySetInnerHTML` |
| Mass assignment | PASS | schemas estritos rejeitam campos extras |
| CORS | PASS | allowlist, sem `*` com credenciais |
| Rate limit | PASS | limites específicos; webhook/health isentos do limite genérico |
| Backup/restore local | PASS | dump e restore em PostgreSQL 18.4 |
| Build de produção | PASS | artefatos Vite gerados |
| Responsividade | PASS básico | regras e inspeção visual; matriz automatizada completa ainda recomendada |
| Acessibilidade básica | PASS | landmarks, labels, foco do modal, Escape, skip link, aria-live |

## Dependências, secrets e logs

`npm audit --omit=dev` encontrou zero vulnerabilidades conhecidas nas 113 dependências de produção. Não foram localizados PAN, CVV, chave privada ou segredo real versionado. `.env` está ignorado; `.env.example` contém placeholders. Logs da aplicação registram eventos, request ID e nomes de erro, sem corpo integral, cookies ou tokens.

## Produção e integrações

Frete necessita provider, contrato/credenciais, CEP de origem, peso/dimensões por item, embalagem, modalidades, prazos e política de contingência. Pagamento necessita gateway, conta, credenciais sandbox/produção, método PIX/cartão, tokenização/checkout hospedado, assinatura de webhook, URLs e conciliação. Storage necessita provider, bucket, credenciais, CDN/domínio, MIME/tamanho/dimensões, backup e exclusão. E-mail necessita domínio remetente, provider, autenticação e templates.

## Checklist

### Bloqueadores de produção

- Configurar e homologar frete, pagamento, webhooks, HTTPS, domínio/CORS e secrets.
- Implementar job externo para expiração de reservas.
- Definir backup automático, retenção e restore periódico.
- Configurar observabilidade, alertas, política LGPD e dados comerciais reais.

### Antes da apresentação à cliente

- Substituir produtos, coleção e imagens marcados como demonstração.
- Confirmar textos da marca, processo, políticas, contato e cursos.
- Explicar que checkout para na logística e que o painel visual ainda é parcial.

### Antes do primeiro pedido real

- E2E sandbox completo de frete → pedido → pagamento → webhook → estoque.
- Homologar cancelamento, atraso, reembolso, e-mail e expiração automática.
- Executar teste de restauração no ambiente escolhido.

### Pode ficar para depois

- CRUD visual completo de todos os cadastros, sitemap/canonical definitivo, analytics consentido e otimizações adicionais de bundle.

## Matriz de prontidão

| Área | Status | Produção | Observação |
|---|---|---|---|
| Frontend público | READY | parcial | dados demo precisam troca |
| Catálogo/produto/carrinho | READY | sim após dados reais | carrinho corrigido e testado |
| Checkout/CEP | PARTIAL | não isoladamente | funciona até logística |
| Frete | BLOCKED | não | dependência externa |
| Pedido/estoque | READY interno | não público | transação e concorrência aprovadas |
| Pagamento/PIX/cartão/webhook | BLOCKED | não | gateway ausente |
| Cursos | READY | sim como estado vazio | sem oferta fictícia |
| Admin/autenticação/RBAC/auditoria | PARTIAL | operacional | UI mutável incompleta |
| Imagens | BLOCKED | não | storage ausente |
| Banco | READY | sim | backup hospedado pendente |
| Backup | PARTIAL | não | restore local passou; automação ausente |
| Segurança | READY técnico | homologar infra | sem achado crítico aberto |
| LGPD/SEO | PARTIAL | decisões pendentes | domínio e política final ausentes |
| Performance | READY básico | medir hospedagem | bundle pequeno |
| Responsividade/acessibilidade | READY básico | ampliar automação | fluxos principais inspecionados |
| Observabilidade/deploy | BLOCKED | não | hospedagem não definida |

## Scores

- Prontidão para apresentação à cliente: **82%**. O sistema demonstra catálogo, produto, carrinho, checkout parcial, cursos e painel, mas precisa deixar os bloqueios claros e trocar dados demo.
- Prontidão para abrir ao público: **43%**. A base transacional e de segurança é forte, porém frete, pagamento, webhooks reais, job, infraestrutura, backup, observabilidade, domínio e decisões LGPD impedem operação comercial.

