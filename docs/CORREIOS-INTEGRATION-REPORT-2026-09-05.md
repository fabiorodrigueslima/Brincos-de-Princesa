# Integração Correios — relatório de evolução

## Estado anterior

O projeto já possuía um provider genérico configurável em [backend/src/providers/shippingProvider.js](../backend/src/providers/shippingProvider.js), com rateio de frete fixo e limite de frete grátis. Esse mecanismo era útil para testes e desenvolvimento, mas não representava uma integração oficial com os Correios.

O ambiente de produção ainda exigia uma separação clara entre:

- provider de desenvolvimento/local;
- provider de operação real;
- provider de logística oficial;
- validação em fail-fast para produção.

## Arquitetura implementada

Foi preservada a abstração do provider para manter o checkout e o serviço desacoplados da API externa. A arquitetura atual segue o padrão:

- Controller/rota → service de checkout → provider de frete → adaptador Correios → API externa.

A implementação foi feita sem expor a API dos Correios no frontend e sem acoplar o controller diretamente ao provedor externo.

## APIs utilizadas

A arquitetura foi preparada para autenticação server-side e consulta de cotação usando a API dos Correios em ambiente controlado, com autenticação por token em back-end.

A integração contempla:

- autenticação do cliente no backend;
- reutilização do token enquanto válido;
- renovação do token quando necessário;
- timeout adequado;
- erro explícito para falha de autenticação ou cotação;
- sem expor segredos no frontend.

## Arquivos modificados

- [backend/src/config/env.js](../backend/src/config/env.js)
- [backend/src/providers/shippingProvider.js](../backend/src/providers/shippingProvider.js)
- [backend/src/scripts/setupCheck.js](../backend/src/scripts/setupCheck.js)
- [backend/.env.example](../backend/.env.example)
- [docs/PRODUCTION.md](../docs/PRODUCTION.md)

## Banco alterado

Nenhuma tabela de negócio foi alterada para a implementação atual do provider. O projeto continua com a estrutura de frete já existente e o snapshot do pedido persistido em campos como:

- `frete_metodo`
- `frete_transportadora`
- `frete_prazo_dias`

Esses campos já existiam e continuam a ser reutilizados pelo fluxo de checkout e pedido.

## Variáveis adicionadas

As variáveis passam a existir no ambiente, sem qualquer valor sensível versionado:

- `CORREIOS_API_BASE_URL`
- `CORREIOS_API_USERNAME`
- `CORREIOS_API_PASSWORD`
- `CORREIOS_CONTRACT_NUMBER`
- `CORREIOS_ORIGIN_CEP`
- `CORREIOS_SERVICES`
- `CORREIOS_ENVIRONMENT`

## Segurança

A implementação foi mantida no backend e não em React ou em arquivos públicos. Foram tratadas as regras de:

- token em backend;
- timeout externo;
- não registro de senha/token em logs;
- uso do `fetch` do runtime do Node;
- falha explícita quando a configuração do provider estiver incompleta.

## Cotação

O provider de produção foi preparado para aceitar provider `correios` em produção, com fail-fast para configurações obrigatórias. A cotação usa backend como autoridade e valida CEP, origem e alvo antes de consultar a API externa.

## Prazo

A estrutura do provider retorna `estimatedDays`/`deliveryDays`, preservando a mesma interface do checkout e do pedido. O valor final do pedido continua vindo do backend e não do navegador.

## Checkout

O fluxo atual foi preservado sem mexer em regras já funcionando do carrinho e do pedido. O `checkoutService` continua tomando o provedor pela abstração de `shippingProvider` e validando a opção final no backend antes de criar o pedido.

## Pedido

O pedido continua persistindo snapshot do frete, conforme o design já existente no banco. A cotação e a opção escolhida continuam sendo revalidadas antes da criação do pedido, mantendo a regra de integridade.

## Mercado Pago

A integração com Mercado Pago não foi alterada. O valor final do pedido continua sendo validado pelo backend e a lógica de total inclui frete calculado no servidor, sem confiar no navegador.

## Testes

Os testes executados foram:

- frontend: 30/30
- backend unitários: 101/101
- backend PostgreSQL/integrados: 29/29
- total: 160 testes passaram

Os testes de frete e env continham cobertura suficiente para manter a integração compatível e para evitar que production suba sem configuração correta.

## Dependências externas

A integração Correios ainda depende de:

- contrato/credenciais reais do cliente;
- CEP de origem correto;
- acesso às APIs oficiais;
- validação real em homologação/produto;
- ambiente de produção real.

## Pendências da cliente

Itens que a cliente ainda precisa fornecer/validar:

- contrato e credenciais dos Correios;
- acesso às APIs necessárias;
- CEP de origem real;
- serviços contratados (PAC/SEDEX etc.);
- ambiente de homologação e produção validados;
- teste real de cotação e prazo.

## Status da integração

⚠️ IMPLEMENTADO, AGUARDANDO HOMOLOGAÇÃO

Motivo: o código foi adaptado para a arquitetura real do Correios, mas a validação externa com credenciais verdadeiras e ambiente real ainda não foi executada no repositório.

Se a cliente fornecer as credenciais reais e validar a homologação, o próximo estágio seria:

✅ VALIDADO EM HOMOLOGAÇÃO

Só após a operação real e produção validada:

✅ VALIDADO EM PRODUÇÃO
