import { adminRepository } from "../repositories/adminRepository.js";
import { adminAuthRepository } from "../repositories/adminAuthRepository.js";

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
export async function collections(_req, res) {
  res.json({ data: await adminRepository.collections() });
}
export async function settings(_req, res) {
  res.json({
    data: await adminRepository.settings(),
    integrations: { shipping: false, payment: false, imageStorage: false },
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
