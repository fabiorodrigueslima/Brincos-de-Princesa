# Relatório de migração PostgreSQL — 07/10/2026

## Veredito atual

**🟡 BANCO PRONTO PARA HOMOLOGAÇÃO. Migração de dados concluída.** O banco Neon em São Paulo foi restaurado, comparado com a origem, atualizado pelo runner oficial e testado por conexão pooled com usuário restrito. A URL real está preparada em arquivo privado. Administrador inicial criado e senha verificada. Plano Launch e janela de recuperação de sete dias confirmados pelas telas fornecidas pelo responsável. Permanece pendente a estratégia de backup contínuo externo de produção. Não houve deploy nem troca do banco usado pelo ambiente local.

## Evidências locais

| Item | Resultado |
|---|---|
| Origem | `localhost:5432/brinco_de_princesa`, PostgreSQL 18.4 |
| Ferramentas | pg_dump/pg_restore 18.4 |
| Tamanho observado | 11.114.175 bytes, aproximadamente 10,6 MiB |
| Encoding/locale | UTF8; libc Windows `Portuguese_Brazil.1252` |
| Schemas | `app` e `public`; nenhum objeto de usuário encontrado fora de `app` |
| Estrutura | 33 tabelas, 29 sequences, 89 índices, 412 constraints (inclui NOT NULL do PostgreSQL 18), 15 triggers, uma função e nenhuma view |
| Extensões | Apenas plpgsql 1.0 |
| Dados no snapshot | 100 linhas no total; contagens exatas, sem depender das estimativas de estatística |
| Dados principais | 4 produtos, 6 variantes, 3 clientes, 6 pedidos, 5 imagens, 4 sessões de clientes; zero pagamentos e zero administradores |
| Histórico original | 001–013 aplicadas, checksums corretos; 014/015 pendentes |
| Backup | Custom completo, schema SQL, dados SQL, inventário, grants/roles sem senhas, lista do archive e SHA-256 |
| Local do backup | `C:\backup-brinco\20261007_010534`, com ACL privada |
| Validação do archive | pg_restore --list legível; tabelas, dados, sequences, índices e constraints presentes |
| Restauração | Nova instância em 127.0.0.1:55440, banco descartável `bdp_restore_20261007`; nenhuma restauração sobre a origem |
| Comparação | Todas as tabelas com contagem e digest iguais; sequences e histórico iguais; estrutura/grants equivalentes |
| Ensaio de migrations | Runner oficial aplicou somente 014/015 na cópia; status final 001–015 aplicado, zero pendências |
| Preservação após migrations | 33 tabelas anteriores preservadas; somente histórico 13→15 como mudança esperada de dados; quatro novas tabelas |
| Pool runtime real | 12 consultas, três conexões reutilizadas, timeout por saturação testado e recuperação aprovada |
| Privilégios na cópia | `brinco_app` sem CREATE no banco, sem TEMP, sem CREATE em app/public; search_path app,public; statement_timeout 10s; lock_timeout 3s |

A origem não recebeu migrations, atualização de registros, rotação de senha nem exclusões. Os arquivos `.env` existentes não foram alterados. Não houve push ou deploy.

Reconferência final da origem, somente leitura: dados/digests das 33 tabelas, estados das 29 sequences e histórico de migrations permaneceram idênticos ao snapshot original (`source-recheck.json`).

## Verificações do projeto nesta etapa

| Comando/ensaio | Resultado |
|---|---|
| npm ci | Aprovado; 306 pacotes instalados, 309 auditados, zero vulnerabilidades conhecidas |
| npm run lint | Aprovado nos dois workspaces |
| npm test | 311 testes aprovados: 48 frontend, 213 backend unitários e 50 PostgreSQL isolados |
| npm run build | Aprovado; bundle de produção 335,16 kB, 99,95 kB gzip |
| npm run validate:deploy | Aprovado |
| npm run db:status — origem | Aprovado, checksums válidos; somente 014/015 pendentes |
| db:status → db:migrate → db:status — cópia | Aprovado; somente 014/015 aplicadas; zero pendências |
| Pool singleton do backend — cópia | Aprovado, máximo 3, fila/timeout/recuperação e privilégio mínimo |
| git diff --check | Aprovado |

Logs: `migration-install.log`, `migration-validation.log`, `migration-rehearsal.log`, `migration-source-status.log`, `migration-diff-check.log`, todos ignorados pelo Git. O primeiro npm ci encontrou a dependência nativa em uso pelo Vite; o servidor de desenvolvimento deste projeto foi parado e a instalação foi repetida com sucesso. O build emitiu diagnóstico de tempo de plugin (`PLUGIN_TIMINGS`), sem erro de build ou aviso de segurança; não foi suprimido. Não houve teste falho na rodada final.

Os testes destrutivos de integração usaram somente `brinco_de_princesa_test` na instância descartável da porta 55440, separado tanto da origem quanto da cópia restaurada. A instância de ensaio é encerrada ao finalizar; os arquivos de evidência e backup são preservados.

## Divergências investigadas

**🟢 Resolvidas:** a comparação textual inicialmente apontou ACLs explícitas do owner versus ACL padrão, e casts de arrays varchar→text reexpressos pelo pg_restore. A comparação semântica limitada a essas formas confirmou equivalência, mantendo as comparações brutas arquivadas. Não foi simplesmente ignorada uma diferença de schema. Testes da ferramenta garantem que mudanças em dados ou constraints continuam sendo detectadas.

**🟠 Importante:** locale Windows `Portuguese_Brazil.1252` não é diretamente portável para o Neon Linux. A restauração local de ensaio usou locale C e preservou dados/constraints; isso não comprova equivalência de ordenação de textos. Conferir no destino ordenação com acentos, normalização lower/upper e unicidade. Registrar a collation escolhida antes do corte definitivo.

No destino confirmado (`C.UTF-8`), a ordem dos produtos atuais e a normalização dos e-mails existentes coincidiram. Um conjunto sintético de letras acentuadas apresentou ordenação diferente, conforme esperado; não há equivalência geral entre as collations. Todos os índices foram recriados e há zero constraints não validadas. Não houve mudança silenciosa de collation nas queries do aplicativo.

**🟠 Importante:** `database/permissions.sql` é histórico e revoga acessos necessários ao aplicativo moderno. Não reaplicá-lo depois do restore/migrations. Preservar grants do backup e conferir os privilégios efetivos.

**🟢 Corrigido no código:** `npm run db:status` antes verificava conexão e seis tabelas de catálogo. Agora lê histórico/checksums/pendências em transação somente leitura, sem criar tabela de controle. Foram adicionados testes para histórico ausente, migration modificada e arquivo ausente.

## Provedor e etapa online

**Neon escolhido pelo usuário; plano atualizado pelo usuário de Free para Launch.** Projeto novo em São Paulo (`sa-east-1`), PostgreSQL 18.6 Linux, banco `neondb`. O projeto anterior de Ohio foi apenas inspecionado, sem migração ou alteração. A conta e os projetos foram criados pelo usuário; a contratação do plano Launch foi feita pelo próprio usuário.

Arquivos privados em `C:\backup-brinco\20261007_010534`: `neon-runtime.env` contém a URL pooled de `brinco_app` e os limites do pool; `neon-release.env` contém a conexão administrativa direta e flags de release; `neon-connection.env` contém a conexão fornecida pelo usuário. A senha runtime foi gerada aleatoriamente (36 bytes) e não reutiliza a senha local exposta. Sua rotação local continua recomendada após o corte coordenado.

| Etapa online | Estado |
|---|---|
| Conta/projeto e destino vazio | 🟢 Confirmados antes de qualquer restauração |
| Identidade, versão e TLS | 🟢 PostgreSQL 18.6, São Paulo, TLS 1.3, certificado/hostname validados |
| Roles owner/runtime/release | 🟢 brinco_owner NOLOGIN, brinco_app restrito, neondb_owner somente release |
| Restauração online e comparação | 🟢 33 tabelas e 100 registros do snapshot preservados antes das migrations |
| Migrations 014/015 online | 🟢 Somente essas duas aplicadas; 001–013 ignoradas corretamente; zero pendências |
| Endpoint pooled e pool remoto | 🟢 Um único pool, máximo 3 conexões, 12 consultas, fila de 9, timeout e recuperação testados |
| Backend, login, pedidos e jobs online simulados | 🟢 Smoke aprovado em banco Neon separado, com transportes externos simulados |
| Admin inicial online | 🟢 OWNER criado em 07/10/2026; senha aleatória verificada e armazenada em arquivo privado |
| URL runtime restrita para Vercel | 🟢 Preparada e conectividade verificada; não cadastrada na Vercel |
| Backup online e restore | 🟢 Archive inicial restaurado e comparado em outro banco |
| Retenção contínua | 🟢 Plano Launch e History window de 7 dias confirmados por captura do painel após salvar; backup externo contínuo ainda pendente |

O primeiro restore falhou por ausência do schema app e foi totalmente revertido. Foi criado `app AUTHORIZATION brinco_owner`, e o restore transacional seguinte preservou ownership/grants. O papel owner perdeu o privilégio CREATE no banco após o preparo. O runtime não tem CREATE/TEMP, DDL em app/public, membership de owner ou de neon_superuser. Os parâmetros efetivos do runtime pooled são `search_path=app,public`, `statement_timeout=10s`, `lock_timeout=3s`.

O `pg_stat_ssl` do servidor reportou ssl=false atrás do proxy Neon; a conexão do cliente foi verificada diretamente como TLSSocket criptografado, autorizado e TLS 1.3. Tanto Node quanto pg_dump/pg_restore utilizaram verify-full, sem desativar validação de certificado.

O backup online `neon-online-20261007.backup` tem SHA-256 `5f39191e58194b016a867d172e723f54f182b1c54b6086e54e0dccea333c72ad`. Foi restaurado em `bdp_neon_smoke_20261007`, separado de `neondb`. Após comparar dados, sequences, schema e grants, essa cópia recebeu fixtures sintéticas para testes HTTP. O administrador sintético foi desativado ao final. O banco de ensaio foi preservado, sem DROP; ele não deve ser usado na Vercel.

O ensaio HTTP confirmou health/readiness, produtos/categorias, login admin/cliente, sessão, carrinho, cotação, CSRF, pedido, preferência de pagamento simulada com frete, webhook repetido, pedido PAID, imagem, e-mail simulado e ambos os jobs. Nenhum pagamento ou e-mail real foi executado. Não se rodou o test runner destrutivo contra o Neon.

Reconferência após o smoke, em transação somente leitura: as 37 tabelas de `neondb`, suas sequences e as 15 migrations permaneceram idênticas ao inventário anterior aos testes. O SHA-256 do backup online também foi reconfirmado.

Validação desta conclusão: lint, **214 testes unitários backend**, build e schema Vercel aprovados; a rodada completa anterior tinha 311 testes e o teste adicional cobre ACL padrão de sequence sem mascarar grants extras. Logs atuais: `neon-lint.log`, `neon-unit.log`, `neon-build.log`. Evidências privadas: `neon-restore-comparison.json`, `neon-post-migration-inventory.json`, `neon-online-backup-semantic-proof.json`, `neon-pool-proof.json`, `neon-http-smoke.log`, `neon-collation-check.json`.

O [procedimento Neon](DATABASE-MIGRATION-NEON.md) descreve os controles de destino vazio, TLS, ownership, grants, isolamento de testes e proibição de executar o runner destrutivo contra o banco migrado.

## Riscos e próximos passos

- 🟠 O backup contém dados sensíveis e está protegido por ACL, mas ainda precisa de cópia externa criptografada/backup do provedor. Não assumir proteção contra perda desta máquina.
- 🟠 Snapshot não inclui escritas posteriores. Conferir alterações e fazer novo backup/corte final antes da transferência definitiva; não operar origem e destino como escritores simultâneos.
- 🟠 A origem contém outbox, sessões e reservas. Não disparar jobs/envios reais durante testes da migração nem remover esses registros silenciosamente.
- 🟡 Conectividade, certificado e pooler Neon foram testados. Não houve teste de carga representativo de vendas ; plano Launch contratado pelo usuário.
- 🟡 Nenhuma migration aplicada foi modificada; 014/015 devem acompanhar o release. O banco original permanece na versão 013.
- 🟡 Para fechar a preparação operacional: definir backup contínuo externo. Administrador inicial criado e janela de sete dias confirmada pelo usuário. [Limites oficiais da janela de restauração](https://neon.com/docs/introduction/restore-window). Nenhuma autorização de deploy é presumida.

## Arquivos desta etapa

Criados: scripts de backup/restauração, comparação de inventário e ensaio do pool; implementação/testes do status de migrations; testes da comparação semântica; guia Neon e este relatório.

Modificados: comando `db:status` em `backend/package.json`, referências em `DEPLOY.md` e checklist. Alterações anteriores do projeto foram preservadas.

## Contagem comparativa por tabela

Todas as contagens e digests do restore inicial coincidiram. A coluna online se refere a `neondb` após as migrations, sem as fixtures do banco separado de ensaio. O histórico 13→15 e quatro tabelas novas vazias são as únicas mudanças esperadas.

| Tabela | Local (snapshot) | Restore local | Após migrations na cópia | Online |
|---|---:|---:|---:|---|
| app.audit_logs | 0 | 0 | 0 | 0 |
| app.banners | 0 | 0 | 0 | 0 |
| app.categorias | 7 | 7 | 7 | 7 |
| app.cliente_password_reset_tokens | 2 | 2 | 2 | 2 |
| app.cliente_sessoes | 4 | 4 | 4 | 4 |
| app.clientes | 3 | 3 | 3 | 3 |
| app.colecoes | 1 | 1 | 1 | 1 |
| app.configuracoes | 5 | 5 | 5 | 5 |
| app.cupom_categorias | 0 | 0 | 0 | 0 |
| app.cupom_produtos | 0 | 0 | 0 | 0 |
| app.cupom_utilizacoes | 0 | 0 | 0 | 0 |
| app.cupons | 0 | 0 | 0 | 0 |
| app.curso_sessoes | 0 | 0 | 0 | 0 |
| app.cursos | 0 | 0 | 0 | 0 |
| app.email_outbox | 6 | 6 | 6 | 6 |
| app.enderecos | 2 | 2 | 2 | 2 |
| app.idempotency_keys | 6 | 6 | 6 | 6 |
| app.movimentos_estoque | 7 | 7 | 7 | 7 |
| app.pagamentos | 0 | 0 | 0 | 0 |
| app.password_reset_tokens | 0 | 0 | 0 | 0 |
| app.pedido_itens | 6 | 6 | 6 | 6 |
| app.pedido_status_historico | 7 | 7 | 7 | 7 |
| app.pedidos | 6 | 6 | 6 | 6 |
| app.privacy_requests | 1 | 1 | 1 | 1 |
| app.produto_colecoes | 3 | 3 | 3 | 3 |
| app.produto_imagens | 5 | 5 | 5 | 5 |
| app.produto_variantes | 6 | 6 | 6 | 6 |
| app.produtos | 4 | 4 | 4 | 4 |
| app.reservas_estoque | 6 | 6 | 6 | 6 |
| app.schema_migrations | 13 | 13 | 15 | 15 |
| app.sessoes | 0 | 0 | 0 | 0 |
| app.usuarios_admin | 0 | 0 | 0 | 0 |
| app.webhook_eventos | 0 | 0 | 0 | 0 |
| app.cliente_activation_tokens | — | — | 0 | 0 |
| app.rate_limits | — | — | 0 | 0 |
| app.job_leases | — | — | 0 | 0 |
| app.image_upload_intents | — | — | 0 | 0 |

## Identificação do archive validado

Arquivo: `brinco_de_princesa_20261007_010534.backup`

SHA-256: `287fe053f4c88ec969f3fafd399640e4ca4bdb2926ea6d6722b1a9551ef0a914`

Todos os 5 arquivos do manifesto original passaram na reconferência de SHA-256 após o ensaio. O manifesto não inclui o arquivo privado de conexão Neon nem os relatórios posteriores ao backup.

## Atualização: administrador inicial e retenção

Em 07/10/2026, o primeiro administrador real foi criado no Neon com papel OWNER, usando o nome e e-mail fornecidos pelo responsável. A senha forte foi gerada aleatoriamente, armazenada somente em `C:\backup-brinco\20261007_010534\acesso-administrador.txt` e verificada com a função de autenticação do backend. Nenhuma senha foi publicada no chat ou no repositório; não houve envio de e-mail nem deploy.

A criação acrescentou uma linha a `app.usuarios_admin` e avançou sua sequence. A tabela comparativa e o backup inicial acima representam o estado anterior a essa criação. O usuário também confirmou pelas capturas do painel o plano Launch e History window salvo em 7d. Isso não comprova sete dias de histórico já acumulado nem um agendamento de snapshots; o último painel de snapshots mostrava nenhum agendamento.
