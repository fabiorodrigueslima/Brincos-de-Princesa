import { mkdir, unlink, writeFile } from "node:fs/promises";
import { createHash, randomBytes } from "node:crypto";
import { resolve } from "node:path";
import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";

const localRoot = resolve(process.cwd(), "uploads");
const disabled = {
  async put() {
    throw new AppError(
      503,
      "STORAGE_NOT_CONFIGURED",
      "Armazenamento de imagens não configurado.",
    );
  },
  async delete() {},
};
const local = {
  async put({ key, buffer }) {
    await mkdir(localRoot, { recursive: true });
    await writeFile(resolve(localRoot, key), buffer, { flag: "wx" });
    return { url: `/uploads/${key}` };
  },
  async delete(key) {
    await unlink(resolve(localRoot, key)).catch(() => {});
  },
};
export function createHttpStorageProvider({
  fetchImpl = fetch,
  config = env,
} = {}) {
  return {
    async put({ key, buffer, mime }) {
      const response = await fetchImpl(
        `${config.STORAGE_HTTP_URL}/${encodeURIComponent(key)}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${config.STORAGE_HTTP_TOKEN}`,
            "Content-Type": mime,
          },
          body: buffer,
          signal: AbortSignal.timeout(config.EXTERNAL_REQUEST_TIMEOUT_MS),
        },
      );
      if (!response.ok)
        throw new AppError(
          502,
          "STORAGE_PROVIDER_ERROR",
          "Falha ao armazenar imagem.",
        );
      return {
        url: `${config.STORAGE_PUBLIC_URL.replace(/\/$/, "")}/${encodeURIComponent(key)}`,
      };
    },
    async delete(key) {
      const response = await fetchImpl(
        `${config.STORAGE_HTTP_URL}/${encodeURIComponent(key)}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${config.STORAGE_HTTP_TOKEN}` },
          signal: AbortSignal.timeout(config.EXTERNAL_REQUEST_TIMEOUT_MS),
        },
      );
      if (!response.ok && response.status !== 404)
        throw new AppError(
          502,
          "STORAGE_PROVIDER_ERROR",
          "Falha ao excluir imagem.",
        );
    },
  };
}

const cloudinarySignature = (params, apiSecret) => {
  const payload = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  return createHash("sha1").update(`${payload}${apiSecret}`).digest("hex");
};

export function createCloudinaryStorageProvider({
  fetchImpl = fetch,
  config = env,
  now = () => Math.floor(Date.now() / 1000),
  random = () => randomBytes(24).toString("hex"),
} = {}) {
  const folder = config.CLOUDINARY_FOLDER;

  const requiredConfig = () => {
    if (!config.CLOUDINARY_CLOUD_NAME || !config.CLOUDINARY_API_KEY || !config.CLOUDINARY_API_SECRET || !folder)
      throw new AppError(503, "STORAGE_NOT_CONFIGURED", "Cloudinary não está configurado.");
  };

  return {
    async put({ buffer, mime }) {
      requiredConfig();
      const timestamp = now();
      const publicId = random();
      const signedParams = { folder, public_id: publicId, timestamp };
      const form = new FormData();
      form.append("file", new Blob([buffer], { type: mime }), `${publicId}.${mime.split("/")[1]}`);
      form.append("api_key", config.CLOUDINARY_API_KEY);
      form.append("timestamp", String(timestamp));
      form.append("folder", folder);
      form.append("public_id", publicId);
      form.append("signature", cloudinarySignature(signedParams, config.CLOUDINARY_API_SECRET));
      const response = await fetchImpl(
        `https://api.cloudinary.com/v1_1/${encodeURIComponent(config.CLOUDINARY_CLOUD_NAME)}/image/upload`,
        { method: "POST", body: form, signal: AbortSignal.timeout(config.EXTERNAL_REQUEST_TIMEOUT_MS) },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.secure_url)
        throw new AppError(502, "STORAGE_PROVIDER_ERROR", "Falha ao armazenar imagem no Cloudinary.");
      return { url: payload.secure_url, providerAssetId: payload.public_id ?? `${folder}/${publicId}` };
    },
    async delete(publicId) {
      requiredConfig();
      if (!publicId) return;
      const timestamp = now();
      const signedParams = { public_id: publicId, timestamp };
      const form = new FormData();
      form.append("api_key", config.CLOUDINARY_API_KEY);
      form.append("timestamp", String(timestamp));
      form.append("public_id", publicId);
      form.append("invalidate", "true");
      form.append("signature", cloudinarySignature(signedParams, config.CLOUDINARY_API_SECRET));
      const response = await fetchImpl(
        `https://api.cloudinary.com/v1_1/${encodeURIComponent(config.CLOUDINARY_CLOUD_NAME)}/image/destroy`,
        { method: "POST", body: form, signal: AbortSignal.timeout(config.EXTERNAL_REQUEST_TIMEOUT_MS) },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !["ok", "not found"].includes(payload.result))
        throw new AppError(502, "STORAGE_PROVIDER_ERROR", "Falha ao excluir imagem do Cloudinary.");
    },
  };
}

export const storageProvider =
  env.STORAGE_PROVIDER === "local"
    ? local
    : env.STORAGE_PROVIDER === "http"
      ? createHttpStorageProvider()
      : env.STORAGE_PROVIDER === "cloudinary"
        ? createCloudinaryStorageProvider()
        : disabled;
