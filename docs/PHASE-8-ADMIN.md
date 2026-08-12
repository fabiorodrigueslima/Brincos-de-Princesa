# Fase 8 — Painel administrativo

## Segurança administrativa

O namespace `/api/v1/admin` é protegido no backend. Senhas usam scrypt com salt aleatório, parâmetros versionados e comparação constante. O primeiro `OWNER` é criado interativamente por `npm run admin:create`; nenhuma credencial é versionada.

Login cria token e segredo CSRF aleatórios. Apenas hashes são persistidos. A sessão usa cookie HttpOnly, SameSite Strict, Secure em produção, duração configurável (padrão de 8 horas), expiração e revogação no logout. Cinco falhas bloqueiam a conta por 15 minutos e o endpoint possui rate limit próprio. Respostas de login não diferenciam usuário inexistente de senha incorreta.

Mutações exigem sessão, Origin permitido e `X-CSRF-Token`. Os papéis existentes foram reutilizados: `OWNER`, `MANAGER` e `FULFILLMENT`. Configurações são exclusivas do OWNER; catálogo exige OWNER/MANAGER; estoque e operação de pedidos permitem FULFILLMENT. O frontend esconder ações é apenas UX — a decisão final é do backend.

## Operação

O painel em `/admin` possui login, navegação própria e visões responsivas para dashboard, produtos, estoque, pedidos, cursos, categorias, coleções e configurações. Listagens críticas são paginadas no backend. O dashboard mostra somente contagens reais e não expõe dados pessoais.

Produtos podem ser criados e editados com campos do modelo atual. Variantes aceitam preço, promoção validada, SKU, atributos flexíveis e estoque. Ajustes de estoque bloqueiam a linha, impedem físico abaixo do reservado e sempre geram `movimentos_estoque` com usuário e motivo. Pedidos possuem listagem minimizada, detalhe autorizado e allowlist de transições; pagamento não pode ser aprovado manualmente.

As APIs também disponibilizam cursos, categorias, coleções e configurações operacionais existentes. A duração da reserva é a única configuração mutável exposta; secrets nunca entram no painel.

## Imagens e integrações

Não existe storage configurado. O painel informa o bloqueio e não oferece upload local como se fosse produção. Gestão completa de imagem aguarda provider com validação real de MIME, tamanho e dimensões. Frete e pagamento também são exibidos como não configurados, sem campos para secrets.

## Auditoria e LGPD

Login, logout e mutações relevantes registram usuário, ação, recurso, resultado, request ID e metadados mínimos. Senhas, cookies, CSRF, endereço integral e payloads não são auditados. Listagens de pedidos mostram apenas código, nome, total e estados; detalhe completo exige autorização.

## Migration e limitações

`005_admin_security.sql` concede privilégios mínimos às tabelas e sequências administrativas existentes. Não cria tabelas nem modifica migrations anteriores. CRUD visual detalhado de todas as entidades, modais de confirmação, upload e scheduler distribuído permanecem melhorias futuras; as APIs seguras e visões operacionais essenciais estão preparadas.
