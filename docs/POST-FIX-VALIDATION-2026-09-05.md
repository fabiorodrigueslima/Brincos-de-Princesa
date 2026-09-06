# Validação pós-correção — Brinco de Princesa

## Correção analisada

A correção revisada garante que a aplicação falhe cedo em `NODE_ENV=production` quando:

- `PAYMENT_PROVIDER` não for `mercado-pago`;
- `SHIPPING_PROVIDER` não for `configurable`.

A implementação fica em:

- [backend/src/config/env.js](../backend/src/config/env.js)
- [backend/src/scripts/setupCheck.js](../backend/src/scripts/setupCheck.js)
- [backend/tests/env.test.js](../backend/tests/env.test.js)

A regra foi reforçada sem refatorar comportamentos válidos já existentes.

## Evidência encontrada

### Validação na implementação

A validação de produção está centralizada em `env.js` e usa `zod.superRefine`. A regra atual exige:

- em produção, `PAYMENT_PROVIDER` precisa ser `mercado-pago`;
- em produção, `SHIPPING_PROVIDER` precisa ser `configurable`;
- além disso, se `PAYMENT_PROVIDER === "mercado-pago"`, exigem-se também as variáveis de integração obrigatórias já existentes no projeto, como:
  - `MERCADO_PAGO_ACCESS_TOKEN`;
  - `MERCADO_PAGO_WEBHOOK_SECRET`;
  - `PUBLIC_BACKEND_URL`;
  - `PUBLIC_FRONTEND_URL`;
- o `setupCheck.js` usa a mesma lógica de gate: se o ambiente de produção não tiver o provider correto e os valores essenciais, o script retorna falha.

### Ausência de bypass simples

Os pontos revisados não mostraram fallback ou sobrescrita paralela que ignorasse a validação:

- `paymentProvider` é montado a partir de `env.PAYMENT_PROVIDER` em [backend/src/providers/paymentProvider.js](../backend/src/providers/paymentProvider.js);
- `shippingProvider` é montado a partir de `env.SHIPPING_PROVIDER` em [backend/src/providers/shippingProvider.js](../backend/src/providers/shippingProvider.js);
- não foi encontrado uso paralelo de `process.env.PAYMENT_PROVIDER` ou `process.env.SHIPPING_PROVIDER` em módulos do backend que contradissessem o env centralizado;
- os valores de produção continuam sendo previstos como parâmetros do ambiente, não como valores hardcoded em código.

## Testes específicos

### Cenário A: produção com pagamento desabilitado

Resultado esperado: falha na inicialização.

Evidência executada:

- import do config com `NODE_ENV=production`, `PAYMENT_PROVIDER=disabled`, `SHIPPING_PROVIDER=configurable` → falha com `Configuração de ambiente inválida: PAYMENT_PROVIDER`.

### Cenário B: produção com frete desabilitado

Resultado esperado: falha na inicialização.

Evidência executada:

- import do config com `NODE_ENV=production`, `PAYMENT_PROVIDER=mercado-pago`, `SHIPPING_PROVIDER=disabled` → falha com `Configuração de ambiente inválida: SHIPPING_PROVIDER`.

### Cenário C: produção válida

Resultado esperado: passa, desde que demais variáveis obrigatórias estejam corretas.

Evidência executada:

- import do config com `NODE_ENV=production`, `PAYMENT_PROVIDER=mercado-pago`, `SHIPPING_PROVIDER=configurable` e demais campos obrigatórios preenchidos → passa.

### Cenário D: provider vazio

Resultado esperado: falha.

Evidência executada:

- `PAYMENT_PROVIDER=''` em produção → falha com `PAYMENT_PROVIDER` inválido.

### Cenário E: provider inválido

Resultado esperado: falha.

Evidência executada:

- `PAYMENT_PROVIDER='stripe'` em produção → falha com `PAYMENT_PROVIDER` inválido.

### Cenário F: `NODE_ENV=test`

Resultado esperado: a proteção não deve quebrar testes.

Evidência executada:

- config com `NODE_ENV=test`, `PAYMENT_PROVIDER=mercado-pago`, `SHIPPING_PROVIDER=configurable` → passa.

### Cenário G: `NODE_ENV=development`

Resultado esperado: comportamento permitido para desenvolvimento.

Evidência executada:

- config com `NODE_ENV=development`, `PAYMENT_PROVIDER=disabled`, `SHIPPING_PROVIDER=disabled` → passa.

## Testes de regressão

Executado com evidência:

- `npx vitest run tests/env.test.js`
- resultado: 1 arquivo passou, 3 testes passaram, 0 falhas.

Também foi executada a suíte real do projeto:

- `npm test`: passou,
- `npm run lint`: passou,
- `npm run build`: passou.

## Fail-fast

O fail-fast do projeto está consistente em duas camadas:

1. `env.js` impede inicialização com produção inválida.
2. `setupCheck.js` também rejeita a configuração antes do deploy ou da operação.

A validação não é só nominal. Ela exige que a integração ativa em produção tenha as variáveis necessárias para funcionar:

- token do Mercado Pago;
- segredo do webhook;
- URLs públicas do backend e frontend;
- demais valores do ambiente que o projeto já exige na configuração.

Se faltar qualquer item indispensável, a aplicação falha antes de aceitar tráfego.

## Mercado Pago

O projeto continua exigindo runtime real do gateway em produção. O bloqueador de código foi corrigido, mas o ambiente externo ainda precisa ser configurado corretamente para operação real.

Pontos confirmados:

- provider habilitado somente quando `PAYMENT_PROVIDER=mercado-pago`;
- a integração exige `MERCADO_PAGO_ACCESS_TOKEN` e `MERCADO_PAGO_WEBHOOK_SECRET` em produção;
- URLs publicas são obrigatórias (`PUBLIC_BACKEND_URL`, `PUBLIC_FRONTEND_URL`);
- a aplicação não aceita configuração incompleta na inicialização.

## Frete

O mesmo princípio foi aplicado ao shipping provider:

- em produção, `SHIPPING_PROVIDER` precisa ser `configurable`;
- o nome do provider não é suficiente para dizer que o frete está pronto;
- o provider configurável continua dependente de valores como preço fixo, limite de frete grátis, UF permitidas, etc., conforme o schema do ambiente;
- se o backend for colocado em produção com frete inválido, a aplicação falha antes de aceitar fluxo de compra.

## Possíveis bypasses

Nenhum bypass relevante foi encontrado durante a revisão específica.

Os módulos que usam o provider consultam as variáveis já validadas no ambiente central e não há lógica paralela que reescreva `PAYMENT_PROVIDER` ou `SHIPPING_PROVIDER` por fora do `env.js`.

## Problemas encontrados

### Problema interno resolvido

O bloqueador de produção identificado na segunda auditoria foi corretamente coberto: era possível iniciar a aplicação em produção com providers de pagamento/frete desabilitados.

### Problema de ambiente externo restante

Ainda existe dependência externa real não resolvida em código:

- Mercado Pago real/sandbox;
- domínio e HTTPS;
- infraestrutura de hospedagem/DB operacional;
- backup, monitoramento e alertas;
- configuração do frete real da transportadora.

Esses itens são dependências externas e não são bugs de código.

## Bloqueadores internos restantes

Nenhum bloqueador interno de código foi encontrado após esta correção.

O projeto não fica em estado de produção inválido por uma configuração cega de `PAYMENT_PROVIDER` ou `SHIPPING_PROVIDER` em produção.

## Dependências externas restantes

- credenciais reais do Mercado Pago;
- domínio público e HTTPS;
- banco PostgreSQL gerenciado/operacional;
- transportadora concreta e regras de frete reais;
- secret manager e políticas de observabilidade;
- backup/restore e alertas operacionais.

## Status do código

Status do código: `🟢 CÓDIGO PRONTO PARA PRODUÇÃO`.

Justificativa:

- a validação de produção foi reforçada;
- a falha de inicialização foi validada contra cenários reais de produção e desenvolvimento/teste;
- o setup check ficou consistente com a aplicação;
- testes e build do projeto passaram;
- não foram encontradas regressões relevantes nem bypasses simples.

## Status do go-live

Status do go-live: `🟡 GO-LIVE DEPENDE DE CONFIGURAÇÕES EXTERNAS`.

Justificativa:

- o código foi validado, mas ainda há dependência de ambiente externo real para receber pagamentos reais, domínio HTTPS e infraestrutura operacional de produção.
- isso não é um bug de código; é uma dependência real de operação.

## Veredito

**Após esta correção, existe algum bloqueador de CÓDIGO que impeça a preparação para produção?**

Resposta: **NÃO**.

Evidência: a validação do ambiente em produção falha corretamente quando os providers ficam incompatíveis, a aplicação e o setup check são consistentes, e a suíte de regressão do projeto passou.

**O sistema deve receber pagamentos reais hoje?**

Resposta: **SIM, APÓS VALIDAÇÃO DO AMBIENTE EXTERNO**.

Evidência: o código está pronto para produção internamente, mas o go-live real depende de credenciais e infraestrutura externas válidas do Mercado Pago, domínio HTTPS, banco e operação real.
