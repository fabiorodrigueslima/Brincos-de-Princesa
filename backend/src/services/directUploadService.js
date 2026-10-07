import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';
import { query, transaction } from '../config/database.js';
import { storageProvider } from '../providers/storageProvider.js';
import { AppError } from '../utils/AppError.js';

export function createDirectUploadService({ db = query, tx = transaction, storage = storageProvider } = {}) {
  return {
    async prepare(input) {
      if (env.STORAGE_PROVIDER !== 'cloudinary' && !storage.signUpload) throw new AppError(503,'STORAGE_NOT_CONFIGURED','Upload direto não configurado.');
      const id = randomUUID();
      const signed = storage.signUpload(id);
      const product = await db('SELECT id FROM app.produtos WHERE id=$1', [input.productId]);
      if (!product.rowCount) throw new AppError(404,'PRODUCT_NOT_FOUND','Produto não encontrado.');
      await db(`INSERT INTO app.image_upload_intents(id,product_id,public_id,mime,bytes,alt,is_primary,expires_at)
        VALUES($1,$2,$3,$4,$5,$6,$7,now()+interval '1 hour')`, [id,input.productId,signed.publicId,input.mime,input.bytes,input.alt,input.primary]);
      return { id, ...signed };
    },
    async complete(id) {
      return tx(async client => {
        const found = await client.query('SELECT * FROM app.image_upload_intents WHERE id=$1 FOR UPDATE', [id]);
        const intent = found.rows[0];
        if (!intent) throw new AppError(404,'UPLOAD_NOT_FOUND','Upload não encontrado.');
        if (intent.completed_image_id) return (await client.query('SELECT * FROM app.produto_imagens WHERE id=$1', [intent.completed_image_id])).rows[0];
        if (new Date(intent.expires_at) <= new Date()) throw new AppError(410,'UPLOAD_EXPIRED','Upload expirado.');
        // Authoritative lookup: never trust URL, size, format or ownership from the browser.
        const asset = await storage.inspect(intent.public_id);
        const formats = { 'image/jpeg':'jpg','image/png':'png','image/webp':'webp' };
        if (asset.public_id !== intent.public_id || asset.resource_type !== 'image' || asset.format !== formats[intent.mime] || asset.bytes !== intent.bytes || asset.bytes > 5242880 || !asset.secure_url?.startsWith('https://res.cloudinary.com/')) throw new AppError(422,'IMAGE_INVALID','Imagem enviada não corresponde ao arquivo autorizado.');
        await client.query('SELECT id FROM app.produtos WHERE id=$1 FOR UPDATE', [intent.product_id]);
        if (intent.is_primary) await client.query('UPDATE app.produto_imagens SET principal=FALSE WHERE produto_id=$1', [intent.product_id]);
        const result = await client.query(`INSERT INTO app.produto_imagens(produto_id,url,alt_text,mime_type,ordem,principal,storage_key)
          VALUES($1,$2,$3,$4,(SELECT COALESCE(MAX(ordem),-1)+1 FROM app.produto_imagens WHERE produto_id=$1),$5,$6) RETURNING *`, [intent.product_id,asset.secure_url,intent.alt,intent.mime,intent.is_primary,intent.public_id]);
        await client.query('UPDATE app.image_upload_intents SET completed_image_id=$2 WHERE id=$1', [id,result.rows[0].id]);
        return result.rows[0];
      });
    },
    async cleanup() {
      return tx(async client => {
      const expired = await client.query('SELECT id,public_id FROM app.image_upload_intents WHERE expires_at<now() AND completed_image_id IS NULL ORDER BY expires_at LIMIT 5 FOR UPDATE SKIP LOCKED');
      for (const intent of expired.rows) {
        await storage.delete(intent.public_id);
        await client.query('DELETE FROM app.image_upload_intents WHERE id=$1 AND completed_image_id IS NULL', [intent.id]);
      }
      return expired.rowCount;
      });
    },
  };
}
export const directUploadService = createDirectUploadService();
