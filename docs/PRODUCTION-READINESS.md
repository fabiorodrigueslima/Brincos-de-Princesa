# Production readiness

Estado em 12 de agosto de 2026: **não liberar pedidos reais**.

## Go/no-go

O catálogo, produto, carrinho e núcleo transacional podem ser apresentados. A abertura comercial é **NO-GO** enquanto frete e pagamento estiverem desabilitados e enquanto não existirem domínio/HTTPS, job de reservas, backup automatizado, observabilidade e políticas operacionais aprovadas.

## Entradas necessárias da cliente

- domínio oficial, dados de contato e identidade comercial final;
- catálogo, preços, estoque, fotos, pesos, dimensões e embalagem reais;
- transportadora/agregador, CEP de origem, modalidades e credenciais;
- gateway, conta comercial, métodos aceitos e credenciais;
- textos aprovados de privacidade, termos, trocas, retenção e atendimento;
- ofertas reais de cursos ou confirmação para manter o estado vazio;
- responsáveis por pedidos, estoque, incidentes e solicitações LGPD.

## Decisões de terceiros/infraestrutura

- hospedagem de frontend, API e PostgreSQL;
- storage/CDN de imagens;
- gateway e transportadora;
- SMTP/e-mail transacional;
- scheduler/worker para reservas;
- monitoramento, alertas e secret manager;
- política automática de backup e teste periódico de restore.

## Critério mínimo de liberação

1. Sandbox real completo aprovado.
2. HTTPS e domínio final com CORS/cookies/canonical ajustados.
3. Webhook assinado, idempotente e observado.
4. Frete autoritativo homologado com dimensões reais.
5. Backup automático e restore testado no provedor.
6. Job de expiração com execução única e alerta de falha.
7. Dados demo substituídos e políticas aprovadas.
8. Teste E2E final em produção controlada antes de aceitar tráfego.
