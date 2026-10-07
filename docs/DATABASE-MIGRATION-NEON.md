# Migração do banco local para Neon

Provedor escolhido pelo responsável em 07/10/2026: **Neon**. Migração concluída no projeto criado pelo usuário em São Paulo: PostgreSQL 18.6, banco `neondb`, runtime pooled e TLS verificados, migrations até 015. O backup online foi restaurado e o fluxo HTTP simulado passou em banco separado. Primeiro administrador e retenção efetiva no painel ainda pendentes. Não houve deploy nem troca do DATABASE_URL usado localmente. O roteiro abaixo foi utilizado e permanece como referência operacional; veja o [relatório final](DATABASE-MIGRATION-REPORT-2026-10-07.md) para resultados.

## Preparação concluída

- Origem confirmada: PostgreSQL **18.4**, `localhost:5432/brinco_de_princesa`.
- `pg_dump` e `pg_restore` **18.4**, compatíveis com a origem.
- Backup custom completo, SQL de schema e SQL de dados em `C:\backup-brinco\20261007_010534`.
- Pasta com ACL restrita ao usuário atual, SYSTEM e Administradores; fora do projeto/OneDrive/Git. Isso é proteção de acesso, não criptografia nem cópia externa.
- Inventário em `source-inventory.json`, lista do archive em `archive-list.txt`, hashes em `SHA256.json`.
- Dump e inventário usam o mesmo snapshot PostgreSQL exportado, em transação somente leitura.
- 33 tabelas, 100 registros e 29 sequences no snapshot. Existem dados de clientes, pedidos, imagens e sessões; o dump é confidencial.
- Migrations 001–013 aplicadas com checksums corretos. 014 e 015 pendentes na origem.
- Restauração ensaiada em **outra instância**, porta 55440, banco `bdp_restore_20261007`. Nenhum DROP ou teste destrutivo foi executado na origem.
- Contagens e hashes de conteúdo de todas as tabelas, estados das sequences e histórico de migrations coincidiram antes de aplicar migrations na cópia.
- Diferenças textuais: pg_restore reexpressou casts de arrays varchar→text e substituiu ACL explícita exclusiva do owner por ACL padrão equivalente. As definições foram comparadas com normalização limitada a essas formas; grants efetivos coincidiram. Evidência em `restore-semantic-comparison.json`; comparações brutas foram preservadas.
- 014 e 015 aplicadas pelo runner oficial somente na cópia restaurada, respeitando ordem e histórico. Nenhuma migration aplicada foi editada.

## Comparação dos provedores

| Opção | Adequação ao projeto | Ponto de decisão |
|---|---|---|
| Neon — escolhido | PostgreSQL, pooling integrado, conexão direta administrativa, papéis SQL e região São Paulo | Conferir PostgreSQL 18, limites de compute, retenção e orçamento no projeto contratado |
| Supabase | PostgreSQL, conexão direta e Supavisor; alternativa adequada se os demais serviços da plataforma forem desejados | Adequar usuário do pooler e conectividade IPv4/IPv6; não é necessário substituir a autenticação do aplicativo |
| Render | PostgreSQL gerenciado com recuperação e opções de pooling | Comparar região disponível e plano com a região das Functions |
| Railway | PostgreSQL e opções de PgBouncer/backup/PITR | Requer decidir e operar os componentes e políticas correspondentes |

Não foi contratado plano nem estimado preço sem orçamento/consumo. Configure alertas e limite de consumo onde disponível. Não assuma que o plano gratuito oferece a retenção necessária para vendas reais.

Fontes oficiais: [Neon regiões](https://neon.com/docs/introduction/regions), [pooling](https://neon.com/docs/connect/connection-pooling), [papéis](https://neon.com/docs/manage/roles), [janela de restauração](https://neon.com/docs/introduction/restore-window), [Supabase conexões](https://supabase.com/docs/guides/database/connecting-to-postgres), [Render backups](https://render.com/docs/postgresql-backups), [Railway backup/restore](https://docs.railway.com/guides/postgres-backups-restores).

## Configuração realizada pelo usuário

1. Criar a conta e um **projeto novo de homologação** no Neon. Usar PostgreSQL **18**, sem fazer downgrade implícito do dump 18 para PostgreSQL 17.
2. Preferir São Paulo (`aws-sa-east-1`) e escolher a mesma região ou uma próxima para as Functions posteriormente. Confirmar no painel disponibilidade, plano, limites e retenção.
3. Na opção **Connect**, selecionar o banco novo e desabilitar **Connection pooling** para copiar a URL direta administrativa. Não copiar o comando `psql` inteiro.
4. Preencher apenas o arquivo privado `C:\backup-brinco\20261007_010534\neon-connection.env`. Não colar credenciais no chat, em relatórios ou no Git. A senha deve ser nova, gerada pelo Neon, nunca a senha local exposta.
5. Avisar que o arquivo está pronto. Antes de qualquer escrita online serão conferidos identidade, ambiente, TLS e ausência de objetos/dados de usuário. Destino com dados exige confirmação específica e backup do destino; nunca será sobrescrito automaticamente.

## Procedimento online e critérios de operação

1. Validar o SHA-256 do backup e conferir se a origem mudou desde o snapshot. Se houver novas escritas, tirar novo backup consistente e planejar a janela de corte antes da cópia final.
2. Conectar ao endpoint **direto**, exigindo TLS com validação de certificado/hostname. Confirmar versão, locale/collation, extensões e banco vazio. A origem Windows e o Neon Linux podem ter collations diferentes: conferir ordenação de nomes acentuados, lower/upper e índices únicos, sem presumir equivalência de locale.
3. Criar `brinco_owner` NOLOGIN e `brinco_app` LOGIN via SQL com senha forte nova. No Neon, papéis criados via console/API podem receber privilégios amplos; o runtime deve ser criado via SQL e não ser membro de `neon_superuser` ou de `brinco_owner`.
4. Autorizar a credencial de release a `SET ROLE brinco_owner`. O runtime deve ter apenas CONNECT, USAGE e grants de aplicação, sem CREATE/DDL, CREATEROLE, CREATEDB ou BYPASSRLS. Não conceder administração ao runtime.
5. O inventário não encontrou objetos de usuário fora de `app`; `public` está vazio, e a única extensão é plpgsql. Criar primeiro `app AUTHORIZATION brinco_owner`: o filtro de schema do pg_restore não cria automaticamente esse schema. Restaurar com `--schema=app --no-owner --role=brinco_owner --exit-on-error --single-transaction`, mantendo ACLs compatíveis. A extensão e o schema public pertencem ao ambiente gerenciado e não devem ser sobrescritos. Defaults internos de `cloud_admin` em public não são objetos da aplicação.
6. Não usar `--clean`, não rodar `database.sql`, `tables.sql`, `indexes.sql` ou `seed.sql` sobre uma restauração. Eles são bootstrap histórico e podem alterar configuração/dados existentes.
7. **Não rodar `database/permissions.sql` após restaurar.** Ele revoga privilégios adicionados pelas migrations e deixa apenas leitura de catálogo. Restaurar os grants do archive, conferir owners, sequences, funções e privilégios padrão, e aplicar os novos grants por migrations pendentes.
8. Recriar configurações por papel/banco que não são incluídas em pg_dump: `search_path=app,public`, `statement_timeout=10s`, `lock_timeout=3s`. Conferir aplicação efetiva através do endpoint pooled.
9. Comparar origem do snapshot × online antes de migrations: todas as tabelas/linhas, hashes determinísticos, sequences, colunas, índices, constraints, triggers, funções, views, grants e histórico. Investigar diferenças; não pular tabelas de sessões, imagens ou pagamentos.
10. Executar `npm run db:status`, `npm run db:migrate`, `npm run db:status` com credenciais temporárias de release apontando explicitamente ao Neon. Esperado: aplicar somente 014/015 e manter 001–013 intactas. `db:status` agora lê o histórico de migrations sem criar ou alterar tabelas.
11. Confirmar os dados originais preservados após migrations. O aumento de `schema_migrations` de 13 para 15 e quatro tabelas novas são mudanças esperadas. Não alterar configurações comerciais silenciosamente.
12. Validar runtime por endpoint pooled e role restrita: conexão, pool máximo 3, reutilização, timeouts, health/readiness e leituras. Testes que escrevem devem usar branch/banco isolado de homologação com fixtures identificadas; nunca executar `test:postgres` sobre o banco migrado.
13. E-mails e pagamentos reais devem permanecer desabilitados/substituídos durante o ensaio. A origem contém outbox e reservas: não executar jobs sobre a cópia migrada apenas para "testar conexão", pois eles podem alterar dados existentes ou disparar mensagens.
14. Não há administrador no snapshot. Criar OWNER somente quando houver destino validado e credencial inicial definida por canal privado; não inventar senha de acesso para o usuário.
15. Gerar backup inicial do destino e ensaiar restauração. Registrar retenção contratada e procedimento PITR; criar cópia externa protegida. Somente então considerar o banco pronto para conectar à Vercel.

## Variáveis finais — modelo, não credencial utilizável

```dotenv
DATABASE_URL=postgresql://brinco_app:********@ENDPOINT-POOLED:5432/BANCO
DB_SSL=true
DB_POOL_MAX=3
DB_IDLE_TIMEOUT_MS=10000
DB_CONNECTION_TIMEOUT_MS=3000

# Somente no processo de release, nunca nas Functions:
DATABASE_ADMIN_URL=postgresql://USUARIO-RELEASE:********@ENDPOINT-DIRETO:5432/BANCO
ALLOW_REMOTE_MIGRATION_DATABASE=true
ALLOW_DIFFERENT_DATABASE_ENDPOINTS=true
```

Copiar os endpoints reais do painel, sem adivinhar host. A opção de endpoints diferentes só deve ser habilitada após confirmar que pooled e direto são o mesmo banco. Para o certificado TLS, usar configuração que valide cadeia e hostname; nunca `rejectUnauthorized=false` ou `sslmode=no-verify`. Segredos do backend não devem ter prefixo VITE_. O `.env` local permanece inalterado.

## Backup, restauração e corte

O archive custom não contém senhas de papéis PostgreSQL, mas contém dados e hashes/tokens da aplicação; tratá-lo como confidencial. SQL de dados também é confidencial. ACL local não substitui criptografia em trânsito/repouso e cópia fora desta máquina. O inventário de roles foi obtido de `pg_roles`, sem ler hashes de senha de `pg_authid`.

Durante a migração final, impedir escritas concorrentes na origem pelo aplicativo e registrar o instante de corte; um snapshot é consistente, mas não inclui alterações posteriores. Não ligar os dois ambientes para escrita simultânea. Não apagar a origem após a cópia. Em caso de falha anterior ao corte, manter o aplicativo na origem; após novas escritas online, voltar ao banco antigo exige reconciliar o delta, não apenas trocar a URL.

Após a migração bem-sucedida, rotacionar a senha local exposta de maneira coordenada com os consumidores locais. A senha exposta não será reutilizada no Neon.

## Ferramentas locais adicionadas

- `scripts/database-transfer.mjs`: backup somente da origem local esperada e restauração somente em instância de teste específica e vazia; não é um comando genérico de restore online.
- `scripts/compare-database-inventories.mjs`: compara inventários sem expor linhas de dados, mantendo a distinção entre diferença textual e estrutural.
- `scripts/verify-restored-database.mjs`: ensaio pós-migration e pool apenas na cópia local isolada.
- `npm run db:status`: verifica histórico, pendências, checksums e arquivos de migration ausentes, sem DDL.

Os dumps, inventários confidenciais e configurações privadas ficam fora do repositório. Relatórios versionáveis contêm somente metadados e contagens.
