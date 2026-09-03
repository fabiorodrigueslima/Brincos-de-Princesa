import { query, transaction } from "../config/database.js";
import { AppError } from "../utils/AppError.js";

export const customerRepository = {
  async findByEmail(email) {
    return (
      (
        await query({
          text: `SELECT id,email,nome,telefone,password_hash,ativo,tentativas_login_falhas,bloqueado_ate,anonimizado_em FROM app.clientes WHERE lower(email)=lower($1)`,
          values: [email],
        })
      ).rows[0] ?? null
    );
  },
  async create(value, passwordHash) {
    try {
      return (
        await query({
          text: `INSERT INTO app.clientes(email,nome,sobrenome,telefone,password_hash) VALUES(lower($1),$2,'',$3,$4) RETURNING id,email,nome,telefone`,
          values: [value.email, value.name, value.phone, passwordHash],
        })
      ).rows[0];
    } catch (error) {
      if (error.code === "23505")
        throw new AppError(
          409,
          "ACCOUNT_EXISTS",
          "Já existe uma conta para este e-mail.",
        );
      throw error;
    }
  },
  async updateGuestAccount(id, value, passwordHash) {
    return (
      await query({
        text: `UPDATE app.clientes SET nome=$1,telefone=$2,password_hash=$3 WHERE id=$4 AND password_hash IS NULL RETURNING id,email,nome,telefone`,
        values: [value.name, value.phone, passwordHash, id],
      })
    ).rows[0];
  },
  async findById(id) {
    return (
      (
        await query({
          text: `SELECT id,password_hash FROM app.clientes WHERE id=$1`,
          values: [id],
        })
      ).rows[0] ?? null
    );
  },
  async recordFailure(id) {
    await query({
      text: `UPDATE app.clientes SET tentativas_login_falhas=tentativas_login_falhas+1,bloqueado_ate=CASE WHEN tentativas_login_falhas+1>=5 THEN now()+interval '15 minutes' ELSE bloqueado_ate END WHERE id=$1`,
      values: [id],
    });
  },
  async recordSuccess(id) {
    await query({
      text: `UPDATE app.clientes SET tentativas_login_falhas=0,bloqueado_ate=NULL WHERE id=$1`,
      values: [id],
    });
  },
  async createSession(customerId, tokenHash, csrfHash, hours) {
    await query({
      text: `INSERT INTO app.cliente_sessoes(cliente_id,token_hash,csrf_secret_hash,expira_em) VALUES($1,$2,$3,now()+($4||' hours')::interval)`,
      values: [customerId, tokenHash, csrfHash, hours],
    });
  },
  async findSession(tokenHash) {
    return (
      (
        await query({
          text: `SELECT s.id,s.cliente_id,s.csrf_secret_hash,c.email,c.nome,c.telefone,c.ativo,c.anonimizado_em FROM app.cliente_sessoes s JOIN app.clientes c ON c.id=s.cliente_id WHERE s.token_hash=$1 AND s.revogada_em IS NULL AND s.expira_em>now()`,
          values: [tokenHash],
        })
      ).rows[0] ?? null
    );
  },
  async revoke(tokenHash) {
    await query({
      text: `UPDATE app.cliente_sessoes SET revogada_em=now() WHERE token_hash=$1`,
      values: [tokenHash],
    });
  },
  async rotateCsrf(id, csrfHash) {
    await query({
      text: `UPDATE app.cliente_sessoes SET csrf_secret_hash=$1 WHERE id=$2`,
      values: [csrfHash, id],
    });
  },
  async profile(id) {
    const customer = (
      await query({
        text: `SELECT public_id,email,nome,telefone,criado_em FROM app.clientes WHERE id=$1 AND ativo=TRUE`,
        values: [id],
      })
    ).rows[0];
    if (!customer)
      throw new AppError(404, "CUSTOMER_NOT_FOUND", "Cliente não encontrado.");
    const addresses = (
      await query({
        text: `SELECT id,cep,rua,numero,complemento,bairro,cidade,uf,principal FROM app.enderecos WHERE cliente_id=$1 ORDER BY principal DESC,id`,
        values: [id],
      })
    ).rows;
    return { ...customer, addresses };
  },
  async updateProfile(id, value) {
    return (
      await query({
        text: `UPDATE app.clientes SET nome=$1,telefone=$2 WHERE id=$3 RETURNING email,nome,telefone`,
        values: [value.name, value.phone, id],
      })
    ).rows[0];
  },
  async updatePassword(id, passwordHash) {
    await transaction(async (client) => {
      await client.query({
        text: `UPDATE app.clientes SET password_hash=$1 WHERE id=$2`,
        values: [passwordHash, id],
      });
      await client.query({
        text: `UPDATE app.cliente_sessoes SET revogada_em=now() WHERE cliente_id=$1 AND revogada_em IS NULL`,
        values: [id],
      });
    });
  },
  async createReset(customerId, tokenHash) {
    await query({
      text: `INSERT INTO app.cliente_password_reset_tokens(cliente_id,token_hash,expira_em) VALUES($1,$2,now()+interval '30 minutes')`,
      values: [customerId, tokenHash],
    });
  },
  async consumeReset(tokenHash, passwordHash) {
    return transaction(async (client) => {
      const token = await client.query({
        text: `SELECT id,cliente_id FROM app.cliente_password_reset_tokens WHERE token_hash=$1 AND usado_em IS NULL AND expira_em>now() FOR UPDATE`,
        values: [tokenHash],
      });
      if (!token.rowCount)
        throw new AppError(
          400,
          "RESET_TOKEN_INVALID",
          "Link de redefinição inválido ou expirado.",
        );
      await client.query({
        text: `UPDATE app.cliente_password_reset_tokens SET usado_em=now() WHERE id=$1`,
        values: [token.rows[0].id],
      });
      await client.query({
        text: `UPDATE app.clientes SET password_hash=$1,tentativas_login_falhas=0,bloqueado_ate=NULL WHERE id=$2`,
        values: [passwordHash, token.rows[0].cliente_id],
      });
      await client.query({
        text: `UPDATE app.cliente_sessoes SET revogada_em=now() WHERE cliente_id=$1 AND revogada_em IS NULL`,
        values: [token.rows[0].cliente_id],
      });
      return token.rows[0].cliente_id;
    });
  },
  async orders(id) {
    return (
      await query({
        text: `SELECT codigo_publico,status,subtotal,frete,total,criado_em FROM app.pedidos WHERE cliente_id=$1 ORDER BY criado_em DESC`,
        values: [id],
      })
    ).rows;
  },
  async addAddress(id, value) {
    return transaction(async (client) => {
      if (value.primary)
        await client.query({
          text: `UPDATE app.enderecos SET principal=FALSE WHERE cliente_id=$1`,
          values: [id],
        });
      return (
        await client.query({
          text: `INSERT INTO app.enderecos(cliente_id,cep,rua,numero,complemento,bairro,cidade,uf,destinatario,principal) SELECT $1,$2,$3,$4,NULLIF($5,''),$6,$7,$8,nome,$9 FROM app.clientes WHERE id=$1 RETURNING id`,
          values: [
            id,
            value.postalCode,
            value.street,
            value.number,
            value.complement,
            value.neighborhood,
            value.city,
            value.state,
            value.primary,
          ],
        })
      ).rows[0];
    });
  },
  async updateAddress(customerId, id, value) {
    return transaction(async (client) => {
      if (value.primary)
        await client.query({
          text: `UPDATE app.enderecos SET principal=FALSE WHERE cliente_id=$1`,
          values: [customerId],
        });
      const result = await client.query({
        text: `UPDATE app.enderecos SET cep=$1,rua=$2,numero=$3,complemento=NULLIF($4,''),bairro=$5,cidade=$6,uf=$7,principal=$8 WHERE id=$9 AND cliente_id=$10 RETURNING id`,
        values: [
          value.postalCode,
          value.street,
          value.number,
          value.complement,
          value.neighborhood,
          value.city,
          value.state,
          value.primary,
          id,
          customerId,
        ],
      });
      if (!result.rowCount)
        throw new AppError(
          404,
          "ADDRESS_NOT_FOUND",
          "Endereço não encontrado.",
        );
      return result.rows[0];
    });
  },
  async deleteAddress(customerId, id) {
    const result = await query({
      text: `DELETE FROM app.enderecos WHERE id=$1 AND cliente_id=$2 RETURNING id`,
      values: [id, customerId],
    });
    if (!result.rowCount)
      throw new AppError(404, "ADDRESS_NOT_FOUND", "Endereço não encontrado.");
  },
};
