GRANT SELECT, INSERT, UPDATE ON app.usuarios_admin, app.sessoes, app.audit_logs,
  app.produtos, app.produto_variantes, app.produto_imagens, app.categorias,
  app.colecoes, app.produto_colecoes, app.cursos, app.curso_sessoes,
  app.movimentos_estoque, app.pedidos, app.pedido_status_historico,
  app.configuracoes TO brinco_app;

GRANT USAGE, SELECT ON SEQUENCE app.usuarios_admin_id_seq, app.sessoes_id_seq,
  app.audit_logs_id_seq, app.produtos_id_seq, app.produto_variantes_id_seq,
  app.produto_imagens_id_seq, app.categorias_id_seq, app.colecoes_id_seq,
  app.cursos_id_seq, app.curso_sessoes_id_seq, app.movimentos_estoque_id_seq,
  app.pedido_status_historico_id_seq TO brinco_app;
