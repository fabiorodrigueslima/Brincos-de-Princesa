import express, { Router } from "express";
import { login, logout, me } from "../controllers/adminAuthController.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { requireAdmin, requireCsrf, sensitiveNoStore } from "../middlewares/adminSecurity.js";
import { adminLoginRateLimit } from "../security/httpSecurity.js";
import { adminLoginSchema } from "../validators/adminValidators.js";
import { requireRole } from "../middlewares/adminSecurity.js";
import {
  adjustStock,
  categories,
  collections,
  courses,
  createProduct,
  createVariant,
  dashboard,
  order,
  orders,
  products,
  settings,
  stock,
  updateOrderStatus,
  updateProduct,
  updateSettings,
  updateVariant,
  archiveProduct,
  deactivateVariant,
  createCategory,
  updateCategory,
  deactivateCategory,
  createCollection,
  updateCollection,
  deactivateCollection,
  uploadImage,
  deleteImage,
} from "../controllers/adminController.js";
import {
  adminListSchema,
  idParamsSchema,
  productSchema,
  settingSchema,
  statusSchema,
  stockSchema,
  variantSchema,
  categorySchema,
  collectionSchema,
  imageUploadQuerySchema,
} from "../validators/adminValidators.js";

export const adminRouter = Router();
adminRouter.use(sensitiveNoStore);
adminRouter.post(
  "/auth/login",
  adminLoginRateLimit,
  validateRequest(adminLoginSchema, "body"),
  login,
);
adminRouter.get("/auth/me", requireAdmin, me);
adminRouter.post("/auth/logout", requireAdmin, requireCsrf, logout);
adminRouter.use(requireAdmin);
adminRouter.get("/dashboard", dashboard);
adminRouter.get(
  "/products",
  validateRequest(adminListSchema, "query"),
  products,
);
adminRouter.post(
  "/products",
  requireCsrf,
  requireRole("OWNER", "MANAGER"),
  validateRequest(productSchema, "body"),
  createProduct,
);
adminRouter.put(
  "/products/:id",
  requireCsrf,
  requireRole("OWNER", "MANAGER"),
  validateRequest(idParamsSchema, "params"),
  validateRequest(productSchema, "body"),
  updateProduct,
);
adminRouter.post(
  "/products/:id/variants",
  requireCsrf,
  requireRole("OWNER", "MANAGER"),
  validateRequest(idParamsSchema, "params"),
  validateRequest(variantSchema, "body"),
  createVariant,
);
adminRouter.put("/variants/:id",requireCsrf,requireRole("OWNER","MANAGER"),validateRequest(idParamsSchema,"params"),validateRequest(variantSchema,"body"),updateVariant);
adminRouter.delete("/variants/:id",requireCsrf,requireRole("OWNER","MANAGER"),validateRequest(idParamsSchema,"params"),deactivateVariant);
adminRouter.delete("/products/:id",requireCsrf,requireRole("OWNER","MANAGER"),validateRequest(idParamsSchema,"params"),archiveProduct);
adminRouter.get("/stock", stock);
adminRouter.post(
  "/stock/:id/adjust",
  requireCsrf,
  requireRole("OWNER", "MANAGER", "FULFILLMENT"),
  validateRequest(idParamsSchema, "params"),
  validateRequest(stockSchema, "body"),
  adjustStock,
);
adminRouter.get("/orders", validateRequest(adminListSchema, "query"), orders);
adminRouter.get(
  "/orders/:id",
  validateRequest(idParamsSchema, "params"),
  order,
);
adminRouter.post(
  "/orders/:id/status",
  requireCsrf,
  requireRole("OWNER", "MANAGER", "FULFILLMENT"),
  validateRequest(idParamsSchema, "params"),
  validateRequest(statusSchema, "body"),
  updateOrderStatus,
);
adminRouter.get("/courses", courses);
adminRouter.get("/categories", categories);
adminRouter.get("/collections", collections);
adminRouter.post("/categories",requireCsrf,requireRole("OWNER","MANAGER"),validateRequest(categorySchema,"body"),createCategory);
adminRouter.put("/categories/:id",requireCsrf,requireRole("OWNER","MANAGER"),validateRequest(idParamsSchema,"params"),validateRequest(categorySchema,"body"),updateCategory);
adminRouter.delete("/categories/:id",requireCsrf,requireRole("OWNER","MANAGER"),validateRequest(idParamsSchema,"params"),deactivateCategory);
adminRouter.post("/collections",requireCsrf,requireRole("OWNER","MANAGER"),validateRequest(collectionSchema,"body"),createCollection);
adminRouter.put("/collections/:id",requireCsrf,requireRole("OWNER","MANAGER"),validateRequest(idParamsSchema,"params"),validateRequest(collectionSchema,"body"),updateCollection);
adminRouter.delete("/collections/:id",requireCsrf,requireRole("OWNER","MANAGER"),validateRequest(idParamsSchema,"params"),deactivateCollection);
adminRouter.post("/images",requireCsrf,requireRole("OWNER","MANAGER"),validateRequest(imageUploadQuerySchema,"query"),express.raw({type:["image/jpeg","image/png","image/webp"],limit:"5mb"}),uploadImage);
adminRouter.delete("/images/:id",requireCsrf,requireRole("OWNER","MANAGER"),validateRequest(idParamsSchema,"params"),deleteImage);
adminRouter.get("/settings", requireRole("OWNER", "MANAGER"), settings);
adminRouter.put(
  "/settings",
  requireCsrf,
  requireRole("OWNER"),
  validateRequest(settingSchema, "body"),
  updateSettings,
);
