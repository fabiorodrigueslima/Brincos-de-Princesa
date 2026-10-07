# Checklist de produção

Escopo atual: primeira publicação somente do catálogo e painel, com SITE_MODE=catalog e sem crons. Os itens de pagamentos, integrações e abertura comercial abaixo são requisitos da fase futura de vendas.

Status local: pronto para homologação. Marcar somente com evidência do ambiente correspondente; verificações locais não significam que o serviço externo foi homologado.

- [ ] Plano Vercel com Services e cron de frequência compatível
- [x] Banco gerenciado criado, TLS verificado e pool inicial de 3 conexões validado
- [x] Provedor Neon escolhido pelo responsável
- [x] Backup local custom, schema/dados e hashes gerados fora do projeto
- [x] Restauração local isolada comparada com a origem do snapshot
- [x] Projeto Neon São Paulo novo e conexão administrativa fornecidos por canal privado
- [x] Locale/collation e índices únicos conferidos; diferença geral de acentos documentada
- [x] Comparação origem × online concluída sem divergências inesperadas
- [x] Backup inicial online e restauração do destino comprovados
- [x] Plano Launch e retenção de sete dias confirmados no painel pelo responsável
- [ ] Backup contínuo externo e agendamento de snapshots definidos
- [x] Papéis runtime/admin separados e permissões mínimas conferidas
- [x] Backup do banco e restauração testados
- [x] Baseline preparada, migrations 001–015 aplicadas e checksums conferidos no Neon
- [ ] Variáveis cadastradas, separadas entre preview e produção
- [ ] URLs públicas e CORS com origens exatas; IP/TRUST_PROXY validados
- [ ] Mercado Pago com aplicação/credenciais corretas do ambiente
- [ ] Webhook configurado, assinatura e reentrega verificadas
- [ ] SuperFrete produção, CEP, serviços, pesos e dimensões conferidos
- [ ] Frete normal, grátis e retirada conferidos no total do pagamento
- [ ] Cloudinary produção, quota, upload de 5 MiB e exclusão/invalidação testados
- [ ] Serviço de e-mail implementa os quatro templates e deduplicação
- [ ] Domínio definitivo e HTTPS ativos
- [ ] Deep links SPA e prioridade da API confirmados no edge Vercel
- [ ] CSP, cookies Secure/HttpOnly/SameSite e CSRF verificados no navegador
- [ ] Cron autenticado ativo; chamada sem segredo recusada
- [x] Admin inicial OWNER criado; senha aleatória verificada e salva em arquivo privado
- [ ] Healthcheck e readiness aprovados no deployment
- [ ] Teste de pedido, reenvio de tentativa e concorrência aprovados
- [ ] Teste de pagamento autorizado pelo responsável concluído
- [ ] Teste de webhook repetido e valor divergente concluído
- [ ] Teste de cancelamento/expiração sem estoque preso concluído
- [ ] Procedimento de pagamento tardio, UNKNOWN e estorno homologado
- [ ] Teste de upload, confirmação repetida e limpeza de órfãos concluído
- [ ] Recuperação de senha e ativação recebidas na caixa de teste
- [ ] Monitoramento de outbox, webhooks, banco e erros configurado
- [ ] Rollback ensaiado sem remover schema ou perder pagamentos
- [ ] Release versiona migration 014 existente, 015 nova e lockfile
- [ ] Responsável aprovou abertura comercial e habilitou checkout

Consulte [DEPLOY.md](DEPLOY.md) para requisitos e procedimentos. Nenhuma ação real de publicação ou cobrança é autorizada por este checklist.
