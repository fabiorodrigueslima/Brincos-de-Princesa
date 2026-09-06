import { query, transaction } from "../config/database.js";
import { AppError } from "../utils/AppError.js";

export const adminRepository = {
  async dashboard() {
    const result = await query(
      `SELECT (SELECT count(*)::integer FROM app.produtos WHERE status='ACTIVE') active_products,(SELECT count(*)::integer FROM app.pedidos WHERE status='PENDING_PAYMENT') pending_orders,(SELECT count(*)::integer FROM app.pedidos WHERE status='PAID') paid_orders,(SELECT count(*)::integer FROM app.reservas_estoque WHERE status='ACTIVE') active_reservations,(SELECT count(*)::integer FROM app.cursos WHERE status='PUBLISHED') published_courses`,
    );
    return result.rows[0];
  },
  async products({ page, limit, q, status }) {
    const values = [`%${q}%`, status ?? null, limit, (page - 1) * limit];
    const result = await query({
      text: `SELECT p.id,p.nome,p.slug,p.status,p.publicado_em,p.atualizado_em,c.nome categoria,COALESCE(min(v.preco_promocional),min(v.preco)) preco_inicial,COALESCE(sum(v.estoque-v.estoque_reservado),0)::integer estoque_disponivel,count(*) OVER()::integer total FROM app.produtos p LEFT JOIN app.categorias c ON c.id=p.categoria_id LEFT JOIN app.produto_variantes v ON v.produto_id=p.id WHERE ($1='' OR p.nome ILIKE $1 OR p.slug ILIKE $1) AND ($2::text IS NULL OR p.status=$2) GROUP BY p.id,c.nome ORDER BY p.atualizado_em DESC LIMIT $3 OFFSET $4`,
      values,
    });
    return result.rows;
  },
  async createProduct(value) {
    const result = await query({
      text: `INSERT INTO app.produtos(nome,slug,descricao,materiais,medidas,peso_gramas,cuidados,prazo_producao_dias,categoria_id,status,publicado_em) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::varchar,CASE WHEN $10::varchar='ACTIVE' THEN now() ELSE NULL END) RETURNING id`,
      values: [
        value.name,
        value.slug,
        value.description,
        value.materials ?? null,
        value.dimensions ?? null,
        value.weightGrams ?? null,
        value.care ?? null,
        value.productionDays,
        value.categoryId ?? null,
        value.status,
      ],
    });
    return result.rows[0];
  },
  async updateProduct(id, value) {
    const result = await query({
      text: `UPDATE app.produtos SET nome=$1,slug=$2,descricao=$3,materiais=$4,medidas=$5,peso_gramas=$6,cuidados=$7,prazo_producao_dias=$8,categoria_id=$9,status=$10::varchar,publicado_em=CASE WHEN $10::varchar='ACTIVE' THEN COALESCE(publicado_em,now()) ELSE publicado_em END WHERE id=$11 RETURNING id`,
      values: [
        value.name,
        value.slug,
        value.description,
        value.materials ?? null,
        value.dimensions ?? null,
        value.weightGrams ?? null,
        value.care ?? null,
        value.productionDays,
        value.categoryId ?? null,
        value.status,
        id,
      ],
    });
    return result.rows[0];
  },
  async createVariant(productId, value) {
    const result = await query({
      text: `INSERT INTO app.produto_variantes(produto_id,nome,sku,preco,preco_promocional,estoque,ativa,atributos) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      values: [
        productId,
        value.name,
        value.sku,
        value.price,
        value.salePrice ?? null,
        value.stock,
        value.active,
        value.attributes,
      ],
    });
    return result.rows[0];
  },
  async updateVariant(id, value) {
    const result = await query({ text: `UPDATE app.produto_variantes SET nome=$1,sku=$2,preco=$3,preco_promocional=$4,ativa=$5,atributos=$6,peso_gramas=$7,largura_cm=$8,altura_cm=$9,comprimento_cm=$10 WHERE id=$11 RETURNING id`, values: [value.name,value.sku,value.price,value.salePrice??null,value.active,value.attributes,value.weightGrams??null,value.widthCm??null,value.heightCm??null,value.lengthCm??null,id] });
    if (!result.rowCount) throw new AppError(404, "VARIANT_NOT_FOUND", "Variante não encontrada.");
    return result.rows[0];
  },
  async archiveProduct(id) {
    const result = await query({ text: `UPDATE app.produtos SET status='ARCHIVED' WHERE id=$1 RETURNING id,status`, values: [id] });
    if (!result.rowCount) throw new AppError(404, "PRODUCT_NOT_FOUND", "Produto não encontrado.");
    return result.rows[0];
  },
  async deactivateVariant(id) {
    const result = await query({ text: `UPDATE app.produto_variantes SET ativa=FALSE WHERE id=$1 RETURNING id,ativa`, values: [id] });
    if (!result.rowCount) throw new AppError(404, "VARIANT_NOT_FOUND", "Variante não encontrada.");
    return result.rows[0];
  },
  async stock() {
    const result = await query(
      `SELECT v.id,v.sku,v.nome variante,p.nome produto,v.estoque,v.estoque_reservado,(v.estoque-v.estoque_reservado)::integer disponivel FROM app.produto_variantes v JOIN app.produtos p ON p.id=v.produto_id ORDER BY p.nome,v.nome LIMIT 100`,
    );
    return result.rows;
  },
  async adjustStock(id, delta, reason, adminId) {
    return transaction(async (client) => {
      const locked = await client.query({
        text: `SELECT estoque,estoque_reservado FROM app.produto_variantes WHERE id=$1 FOR UPDATE`,
        values: [id],
      });
      if (!locked.rowCount)
        throw new AppError(
          404,
          "VARIANT_NOT_FOUND",
          "Variante não encontrada.",
        );
      const next = locked.rows[0].estoque + delta;
      if (next < locked.rows[0].estoque_reservado)
        throw new AppError(
          409,
          "STOCK_BELOW_RESERVED",
          "Estoque físico não pode ficar abaixo do reservado.",
        );
      await client.query({
        text: `UPDATE app.produto_variantes SET estoque=$1 WHERE id=$2`,
        values: [next, id],
      });
      await client.query({
        text: `INSERT INTO app.movimentos_estoque(variante_id,admin_id,tipo,quantidade,saldo_apos,motivo) VALUES($1,$2,'ADJUSTMENT',$3,$4,$5)`,
        values: [
          id,
          adminId,
          delta,
          next - locked.rows[0].estoque_reservado,
          reason,
        ],
      });
      return {
        stock: next,
        reserved: locked.rows[0].estoque_reservado,
        available: next - locked.rows[0].estoque_reservado,
      };
    });
  },
  async orders({ page, limit, q, status }) {
    const result = await query({
      text: `SELECT p.id,p.codigo_publico,p.criado_em,p.nome_cliente,p.total,p.status,pa.status pagamento_status,count(*) OVER()::integer total_rows FROM app.pedidos p LEFT JOIN LATERAL(SELECT status FROM app.pagamentos WHERE pedido_id=p.id ORDER BY id DESC LIMIT 1)pa ON TRUE WHERE ($1='' OR p.codigo_publico ILIKE $1 OR p.nome_cliente ILIKE $1) AND ($2::text IS NULL OR p.status=$2) ORDER BY p.criado_em DESC LIMIT $3 OFFSET $4`,
      values: [`%${q}%`, status ?? null, limit, (page - 1) * limit],
    });
    return result.rows;
  },
  async order(id) {
    const order = await query({
      text: `SELECT p.*,pa.status pagamento_status,pa.metodo FROM app.pedidos p LEFT JOIN LATERAL(SELECT status,metodo FROM app.pagamentos WHERE pedido_id=p.id ORDER BY id DESC LIMIT 1)pa ON TRUE WHERE p.id=$1`,
      values: [id],
    });
    if (!order.rowCount) return null;
    const [items, history, reservations] = await Promise.all([
      query({
        text: `SELECT * FROM app.pedido_itens WHERE pedido_id=$1 ORDER BY id`,
        values: [id],
      }),
      query({
        text: `SELECT * FROM app.pedido_status_historico WHERE pedido_id=$1 ORDER BY criado_em`,
        values: [id],
      }),
      query({
        text: `SELECT r.*,v.sku FROM app.reservas_estoque r JOIN app.produto_variantes v ON v.id=r.variante_id WHERE pedido_id=$1`,
        values: [id],
      }),
    ]);
    return {
      ...order.rows[0],
      items: items.rows,
      history: history.rows,
      reservations: reservations.rows,
    };
  },
  async updateOrderStatus(id, status, reason, adminId) {
    const transitions = {
      PENDING_PAYMENT: ["CANCELLED"],
      PAID: ["IN_PRODUCTION"],
      IN_PRODUCTION: ["READY_TO_SHIP"],
      READY_TO_SHIP: ["SHIPPED"],
      SHIPPED: ["DELIVERED"],
    };
    return transaction(async (client) => {
      const current = await client.query({
        text: `SELECT status FROM app.pedidos WHERE id=$1 FOR UPDATE`,
        values: [id],
      });
      if (!current.rowCount)
        throw new AppError(404, "ORDER_NOT_FOUND", "Pedido não encontrado.");
      if (!transitions[current.rows[0].status]?.includes(status))
        throw new AppError(
          409,
          "INVALID_STATUS_TRANSITION",
          "Transição de status inválida.",
        );
      if (current.rows[0].status === "PENDING_PAYMENT" && status === "CANCELLED") {
        const reservations = await client.query({ text: `SELECT id,variante_id,quantidade FROM app.reservas_estoque WHERE pedido_id=$1 AND status='ACTIVE' ORDER BY variante_id FOR UPDATE`, values: [id] });
        for (const reservation of reservations.rows) {
          const stock = await client.query({ text: `UPDATE app.produto_variantes SET estoque_reservado=estoque_reservado-$1 WHERE id=$2 AND estoque_reservado >= $1 RETURNING estoque-estoque_reservado saldo`, values: [reservation.quantidade,reservation.variante_id] });
          if (!stock.rowCount) throw new Error("RESERVATION_INVARIANT_VIOLATION");
          await client.query({ text: `UPDATE app.reservas_estoque SET status='RELEASED' WHERE id=$1`, values: [reservation.id] });
          await client.query({ text: `INSERT INTO app.movimentos_estoque(variante_id,pedido_id,admin_id,tipo,quantidade,saldo_apos,motivo) VALUES($1,$2,$3,'RELEASE',$4,$5,$6)`, values: [reservation.variante_id,id,adminId,-reservation.quantidade,stock.rows[0].saldo,reason] });
        }
      }
      await client.query({
        text: `UPDATE app.pedidos SET status=$1 WHERE id=$2`,
        values: [status, id],
      });
      await client.query({
        text: `INSERT INTO app.pedido_status_historico(pedido_id,status_anterior,status_novo,admin_id,motivo)VALUES($1,$2,$3,$4,$5)`,
        values: [id, current.rows[0].status, status, adminId, reason],
      });
      return { status };
    });
  },
  async courses() {
    return (
      await query(
        `SELECT c.id,c.nome,c.slug,c.status,c.destaque,c.publicado_em,c.atualizado_em,count(s.id)::integer sessoes FROM app.cursos c LEFT JOIN app.curso_sessoes s ON s.curso_id=c.id GROUP BY c.id ORDER BY c.atualizado_em DESC LIMIT 100`,
      )
    ).rows;
  },
  async categories() {
    return (
      await query(
        `SELECT id,nome,slug,ativa FROM app.categorias ORDER BY ordem,nome`,
      )
    ).rows;
  },
  async createCategory(value) {
    return (await query({ text: `INSERT INTO app.categorias(nome,slug,descricao,ativa,ordem) VALUES($1,$2,$3,$4,$5) RETURNING id`, values: [value.name,value.slug,value.description??null,value.active,value.order] })).rows[0];
  },
  async updateCategory(id, value) {
    const result=await query({ text: `UPDATE app.categorias SET nome=$1,slug=$2,descricao=$3,ativa=$4,ordem=$5 WHERE id=$6 RETURNING id`, values:[value.name,value.slug,value.description??null,value.active,value.order,id] });
    if(!result.rowCount) throw new AppError(404,"CATEGORY_NOT_FOUND","Categoria não encontrada.");
    return result.rows[0];
  },
  async deactivateCategory(id) {
    const result=await query({ text:`UPDATE app.categorias SET ativa=FALSE WHERE id=$1 RETURNING id,ativa`,values:[id] });
    if(!result.rowCount) throw new AppError(404,"CATEGORY_NOT_FOUND","Categoria não encontrada.");
    return result.rows[0];
  },
  async collections() {
    return (
      await query(
        `SELECT id,nome,slug,ativa,destaque FROM app.colecoes ORDER BY nome`,
      )
    ).rows;
  },
  async createCollection(value) {
    return (await query({ text:`INSERT INTO app.colecoes(nome,slug,descricao,ativa,destaque,publicada_em) VALUES($1,$2,$3,$4,$5,CASE WHEN $4::boolean THEN now() ELSE NULL END) RETURNING id`,values:[value.name,value.slug,value.description??null,value.active,value.featured] })).rows[0];
  },
  async updateCollection(id,value) {
    const result=await query({ text:`UPDATE app.colecoes SET nome=$1,slug=$2,descricao=$3,ativa=$4,destaque=$5,publicada_em=CASE WHEN $4::boolean THEN COALESCE(publicada_em,now()) ELSE publicada_em END WHERE id=$6 RETURNING id`,values:[value.name,value.slug,value.description??null,value.active,value.featured,id] });
    if(!result.rowCount) throw new AppError(404,"COLLECTION_NOT_FOUND","Coleção não encontrada.");
    return result.rows[0];
  },
  async deactivateCollection(id) {
    const result=await query({ text:`UPDATE app.colecoes SET ativa=FALSE WHERE id=$1 RETURNING id,ativa`,values:[id] });
    if(!result.rowCount) throw new AppError(404,"COLLECTION_NOT_FOUND","Coleção não encontrada.");
    return result.rows[0];
  },
  async addImage({ productId, alt, mime, key, url, primary }) {
    return transaction(async (client) => {
      const product = await client.query({
        text: `SELECT id FROM app.produtos WHERE id=$1 FOR UPDATE`,
        values: [productId],
      });
      if (!product.rowCount)
        throw new AppError(404, "PRODUCT_NOT_FOUND", "Produto não encontrado.");
      if (primary)
        await client.query({
          text: `UPDATE app.produto_imagens SET principal=FALSE WHERE produto_id=$1`,
          values: [productId],
        });
      const nextOrder = await client.query({
        text: `SELECT COALESCE(MAX(ordem), -1) + 1 AS ordem FROM app.produto_imagens WHERE produto_id=$1`,
        values: [productId],
      });
      const result = await client.query({
        text: `INSERT INTO app.produto_imagens(produto_id,url,alt_text,mime_type,ordem,principal,storage_key) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id,produto_id,url,alt_text,mime_type,ordem,principal,storage_key`,
        values: [productId, url, alt, mime ?? null, nextOrder.rows[0].ordem, primary, key],
      });
      return result.rows[0];
    });
  },
  async deleteImage(id) {
    const result = await query({
      text: `DELETE FROM app.produto_imagens WHERE id=$1 RETURNING storage_key`,
      values: [id],
    });
    if (!result.rowCount) throw new AppError(404, "IMAGE_NOT_FOUND", "Imagem não encontrada.");
    return result.rows[0];
  },
  async settings() {
    return (
      await query(
        `SELECT chave,valor,descricao FROM app.configuracoes WHERE chave IN ('checkout.reservation_minutes','checkout.enabled') ORDER BY chave`,
      )
    ).rows;
  },
  async updateReservationMinutes(value, adminId) {
    await query({
      text: `UPDATE app.configuracoes SET valor=to_jsonb($1::integer),atualizado_por=$2 WHERE chave='checkout.reservation_minutes'`,
      values: [value, adminId],
    });
    return { reservationMinutes: value };
  },
};
