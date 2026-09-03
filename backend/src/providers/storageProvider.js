import { mkdir, unlink, writeFile } from "node:fs/promises";
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
export const storageProvider =
  env.STORAGE_PROVIDER === "local"
    ? local
    : env.STORAGE_PROVIDER === "http"
      ? createHttpStorageProvider()
      : disabled;
