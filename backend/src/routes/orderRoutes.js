import { Router } from "express";
import {
  createOrder,
  createPayment,
  getOrder,
} from "../controllers/orderController.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { requireCustomer } from "../middlewares/customerSecurity.js";
import { sensitiveNoStore } from "../middlewares/adminSecurity.js";
import {
  orderMutationRateLimit,
  orderStatusRateLimit,
} from "../security/httpSecurity.js";
import {
  createOrderSchema,
  createPaymentSchema,
  orderParamsSchema,
  paymentParamsSchema,
} from "../validators/orderValidators.js";

export const orderRouter = Router();
orderRouter.use(sensitiveNoStore);
orderRouter.post(
  "/",
  requireCustomer,
  orderMutationRateLimit,
  validateRequest(createOrderSchema, "body"),
  createOrder,
);
orderRouter.get(
  "/:code",
  orderStatusRateLimit,
  validateRequest(orderParamsSchema, "params"),
  getOrder,
);
orderRouter.post(
  "/:code/payments",
  orderMutationRateLimit,
  validateRequest(paymentParamsSchema, "params"),
  validateRequest(createPaymentSchema, "body"),
  createPayment,
);
