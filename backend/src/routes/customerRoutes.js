import { Router } from "express";
import {
  addAddress,
  changePassword,
  deleteAddress,
  forgot,
  login,
  logout,
  me,
  orders,
  profile,
  register,
  reset,
  updateAddress,
  privacyRequest,
  requestActivation,
  activate,
} from "../controllers/customerController.js";
import {
  requireCustomer,
  requireCustomerCsrf,
} from "../middlewares/customerSecurity.js";
import { sensitiveNoStore } from "../middlewares/adminSecurity.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { customerAuthRateLimit, customerRegistrationRateLimit, customerRecoveryRateLimit } from "../security/httpSecurity.js";
import {
  customerAddressSchema,
  customerForgotSchema,
  customerIdParamsSchema,
  customerLoginSchema,
  customerPasswordSchema,
  customerProfileSchema,
  customerRegisterSchema,
  customerResetSchema,
  privacyRequestSchema,
  customerActivationRequestSchema,
  customerActivationSchema,
} from "../validators/customerValidators.js";

export const customerRouter = Router();
customerRouter.use(sensitiveNoStore);
customerRouter.post(
  "/auth/register",
  customerRegistrationRateLimit,
  validateRequest(customerRegisterSchema, "body"),
  register,
);
customerRouter.post(
  "/auth/login",
  customerAuthRateLimit,
  validateRequest(customerLoginSchema, "body"),
  login,
);
customerRouter.post(
  "/auth/forgot",
  customerRecoveryRateLimit,
  validateRequest(customerForgotSchema, "body"),
  forgot,
);
customerRouter.post(
  "/auth/reset",
  customerAuthRateLimit,
  validateRequest(customerResetSchema, "body"),
  reset,
);
customerRouter.post('/auth/activation/request', customerRecoveryRateLimit, validateRequest(customerActivationRequestSchema, 'body'), requestActivation);
customerRouter.post('/auth/activation/confirm', customerAuthRateLimit, validateRequest(customerActivationSchema, 'body'), activate);
customerRouter.use(requireCustomer);
customerRouter.get("/me", me);
customerRouter.post("/auth/logout", requireCustomerCsrf, logout);
customerRouter.put(
  "/profile",
  requireCustomerCsrf,
  validateRequest(customerProfileSchema, "body"),
  profile,
);
customerRouter.put(
  "/password",
  requireCustomerCsrf,
  validateRequest(customerPasswordSchema, "body"),
  changePassword,
);
customerRouter.get("/orders", orders);
customerRouter.post(
  "/addresses",
  requireCustomerCsrf,
  validateRequest(customerAddressSchema, "body"),
  addAddress,
);
customerRouter.put(
  "/addresses/:id",
  requireCustomerCsrf,
  validateRequest(customerIdParamsSchema, "params"),
  validateRequest(customerAddressSchema, "body"),
  updateAddress,
);
customerRouter.delete(
  "/addresses/:id",
  requireCustomerCsrf,
  validateRequest(customerIdParamsSchema, "params"),
  deleteAddress,
);
customerRouter.post("/privacy-requests",customerAuthRateLimit,requireCustomerCsrf,validateRequest(privacyRequestSchema,"body"),privacyRequest);
