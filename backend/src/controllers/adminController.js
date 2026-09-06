import { adminRepository } from "../repositories/adminRepository.js";
import { adminAuthRepository } from "../repositories/adminAuthRepository.js";
import { imageService } from "../services/imageService.js";
import { env } from "../config/env.js";

async function audited(req, action, type, work) {
  try {
    const data = await work();
    await adminAuthRepository.audit({
      adminId: req.admin.admin_id,
      action,
      resourceType: type,
      resourceId: req.validated?.params?.id
        ? String(req.validated.params.id)
        : null,
      requestId: req.requestId,
    });
    return data;
  } catch (error) {
    await adminAuthRepository.audit({
      adminId: req.admin.admin_id,
      action,
      resourceType: type,
      result: "FAILED",
      requestId: req.requestId,
      metadata: { code: error.code ?? "INTERNAL" },
    });
    throw error;
  }
}
export async function dashboard(_req, res) {
  res.json({ data: await adminRepository.dashboard() });
}
export async function products(req, res) {
  res.json({ data: await adminRepository.products(req.validated.query) });
}
export async function createProduct(req, res) {
  res
    .status(201)
    .json({
      data: await audited(req, "PRODUCT_CREATE", "PRODUCT", () =>
        adminRepository.createProduct(req.validated.body),
      ),
    });
}
export async function updateProduct(req, res) {
  res.json({
    data: await audited(req, "PRODUCT_UPDATE", "PRODUCT", () =>
      adminRepository.updateProduct(
        req.validated.params.id,
        req.validated.body,
      ),
    ),
  });
}
export async function createVariant(req, res) {
  res
    .status(201)
    .json({
      data: await audited(req, "VARIANT_CREATE", "VARIANT", () =>
        adminRepository.createVariant(
          req.validated.params.id,
          req.validated.body,
        ),
      ),
    });
}
export async function updateVariant(req,res){res.json({data:await audited(req,"VARIANT_UPDATE","VARIANT",()=>adminRepository.updateVariant(req.validated.params.id,req.validated.body))});}
export async function archiveProduct(req,res){res.json({data:await audited(req,"PRODUCT_ARCHIVE","PRODUCT",()=>adminRepository.archiveProduct(req.validated.params.id))});}
export async function deactivateVariant(req,res){res.json({data:await audited(req,"VARIANT_DEACTIVATE","VARIANT",()=>adminRepository.deactivateVariant(req.validated.params.id))});}
export async function stock(_req, res) {
  res.json({ data: await adminRepository.stock() });
}
export async function adjustStock(req, res) {
  res.json({
    data: await audited(req, "STOCK_ADJUST", "VARIANT", () =>
      adminRepository.adjustStock(
        req.validated.params.id,
        req.validated.body.delta,
        req.validated.body.reason,
        req.admin.admin_id,
      ),
    ),
  });
}
export async function orders(req, res) {
  res.json({ data: await adminRepository.orders(req.validated.query) });
}
export async function order(req, res) {
  res.json({ data: await adminRepository.order(req.validated.params.id) });
}
export async function updateOrderStatus(req, res) {
  res.json({
    data: await audited(req, "ORDER_STATUS_UPDATE", "ORDER", () =>
      adminRepository.updateOrderStatus(
        req.validated.params.id,
        req.validated.body.status,
        req.validated.body.reason,
        req.admin.admin_id,
      ),
    ),
  });
}
export async function courses(_req, res) {
  res.json({ data: await adminRepository.courses() });
}
export async function categories(_req, res) {
  res.json({ data: await adminRepository.categories() });
}
export async function createCategory(req,res){res.status(201).json({data:await audited(req,"CATEGORY_CREATE","CATEGORY",()=>adminRepository.createCategory(req.validated.body))});}
export async function updateCategory(req,res){res.json({data:await audited(req,"CATEGORY_UPDATE","CATEGORY",()=>adminRepository.updateCategory(req.validated.params.id,req.validated.body))});}
export async function deactivateCategory(req,res){res.json({data:await audited(req,"CATEGORY_DEACTIVATE","CATEGORY",()=>adminRepository.deactivateCategory(req.validated.params.id))});}
export async function collections(_req, res) {
  res.json({ data: await adminRepository.collections() });
}
export async function createCollection(req,res){res.status(201).json({data:await audited(req,"COLLECTION_CREATE","COLLECTION",()=>adminRepository.createCollection(req.validated.body))});}
export async function updateCollection(req,res){res.json({data:await audited(req,"COLLECTION_UPDATE","COLLECTION",()=>adminRepository.updateCollection(req.validated.params.id,req.validated.body))});}
export async function deactivateCollection(req,res){res.json({data:await audited(req,"COLLECTION_DEACTIVATE","COLLECTION",()=>adminRepository.deactivateCollection(req.validated.params.id))});}
export async function settings(_req, res) {
  res.json({
    data: await adminRepository.settings(),
    integrations: { shipping: env.SHIPPING_PROVIDER !== "disabled", payment: env.PAYMENT_PROVIDER !== "disabled", imageStorage: env.STORAGE_PROVIDER !== "disabled" },
  });
}
export async function updateSettings(req, res) {
  res.json({
    data: await audited(req, "SETTINGS_UPDATE", "SETTINGS", () =>
      adminRepository.updateReservationMinutes(
        req.validated.body.reservationMinutes,
        req.admin.admin_id,
      ),
    ),
  });
}
export async function uploadImage(req,res){res.status(201).json({data:await audited(req,"IMAGE_UPLOAD","IMAGE",()=>imageService.upload({productId:req.validated.query.productId,alt:req.validated.query.alt,primary:req.validated.query.primary,mime:req.get("content-type")?.split(";",1)[0],buffer:req.body}))});}
export async function deleteImage(req,res){await audited(req,"IMAGE_DELETE","IMAGE",()=>imageService.delete(req.validated.params.id));res.status(204).end();}
