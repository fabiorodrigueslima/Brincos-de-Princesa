import { query } from "../config/database.js";

export function createAdminAuthRepository(db = query) {
  return {
    async findByEmail(email) {
      const result = await db({
        text: `SELECT id,email,nome,password_hash,papel,ativo,tentativas_login_falhas,bloqueado_ate FROM app.usuarios_admin WHERE lower(email)=lower($1)`,
        values: [email],
      });
      return result.rows[0] ?? null;
    },
    async recordFailure(id) {
      await db({
        text: `UPDATE app.usuarios_admin SET tentativas_login_falhas=tentativas_login_falhas+1,bloqueado_ate=CASE WHEN tentativas_login_falhas+1>=5 THEN now()+interval '15 minutes' ELSE bloqueado_ate END WHERE id=$1`,
        values: [id],
      });
    },
    async recordSuccess(id) {
      await db({
        text: `UPDATE app.usuarios_admin SET tentativas_login_falhas=0,bloqueado_ate=NULL,ultimo_login_em=now() WHERE id=$1`,
        values: [id],
      });
    },
    async createSession(
      adminId,
      tokenHash,
      csrfHash,
      ipHash,
      userAgentHash,
      hours,
    ) {
      await db({
        text: `INSERT INTO app.sessoes(admin_id,token_hash,csrf_secret_hash,ip_hash,user_agent_hash,expira_em) VALUES($1,$2,$3,$4,$5,now()+($6||' hours')::interval)`,
        values: [adminId, tokenHash, csrfHash, ipHash, userAgentHash, hours],
      });
    },
    async findSession(tokenHash) {
      const result = await db({
        text: `SELECT s.id,s.admin_id,s.csrf_secret_hash,s.expira_em,u.email,u.nome,u.papel,u.ativo FROM app.sessoes s JOIN app.usuarios_admin u ON u.id=s.admin_id WHERE s.token_hash=$1 AND s.revogada_em IS NULL AND s.expira_em>now()`,
        values: [tokenHash],
      });
      return result.rows[0] ?? null;
    },
    async revoke(tokenHash) {
      await db({
        text: `UPDATE app.sessoes SET revogada_em=now() WHERE token_hash=$1 AND revogada_em IS NULL`,
        values: [tokenHash],
      });
    },
    async rotateCsrf(id, csrfHash) {
      await db({
        text: `UPDATE app.sessoes SET csrf_secret_hash=$1,ultimo_uso_em=now() WHERE id=$2`,
        values: [csrfHash, id],
      });
    },
    async audit({
      adminId = null,
      action,
      resourceType = null,
      resourceId = null,
      result = "SUCCESS",
      requestId,
      metadata = {},
    }) {
      await db({
        text: `INSERT INTO app.audit_logs(admin_id,acao,tipo_recurso,recurso_id,resultado,request_id,metadados) VALUES($1,$2,$3,$4,$5,$6,$7)`,
        values: [
          adminId,
          action,
          resourceType,
          resourceId,
          result,
          requestId,
          metadata,
        ],
      });
    },
  };
}
export const adminAuthRepository = createAdminAuthRepository();
