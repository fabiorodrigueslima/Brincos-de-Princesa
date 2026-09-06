import { randomBytes } from "node:crypto";
import { storageProvider } from "../providers/storageProvider.js";
import { adminRepository } from "../repositories/adminRepository.js";
import { AppError } from "../utils/AppError.js";

const types = {
  "image/jpeg": {
    ext: "jpg",
    magic: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  "image/png": {
    ext: "png",
    magic: (b) =>
      b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
  },
  "image/webp": {
    ext: "webp",
    magic: (b) =>
      b.subarray(0, 4).toString() === "RIFF" &&
      b.subarray(8, 12).toString() === "WEBP",
  },
};
export const imageService = {
  async upload({ productId, alt, mime, buffer, primary }) {
    const type = types[mime];
    if (!type || !buffer?.length || !type.magic(buffer))
      throw new AppError(400, "IMAGE_INVALID", "Imagem inválida.");
    const key = `${randomBytes(24).toString("hex")}.${type.ext}`;
    const stored = await storageProvider.put({ key, buffer, mime });
    try {
      return await adminRepository.addImage({
        productId,
        alt,
        mime,
        key: stored.providerAssetId ?? key,
        url: stored.url,
        primary,
      });
    } catch (error) {
      const cleanupKey = stored.providerAssetId ?? key;
      try {
        await storageProvider.delete(cleanupKey);
      } catch (cleanupError) {
        console.error({
          event: "IMAGE_UPLOAD_COMPENSATION_FAILED",
          providerAssetId: cleanupKey,
          errorCode: cleanupError.code ?? "STORAGE_PROVIDER_ERROR",
        });
      }
      throw error;
    }
  },
  async delete(id) {
    const image = await adminRepository.deleteImage(id);
    if (image?.storage_key) await storageProvider.delete(image.storage_key);
  },
};
