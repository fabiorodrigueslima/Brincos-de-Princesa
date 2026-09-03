import { Router } from "express";
import {
  lookupPostalCode,
  quoteCheckout,
} from "../controllers/checkoutController.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { checkoutRateLimit } from "../security/httpSecurity.js";
import {
  checkoutQuoteSchema,
  postalCodeParamsSchema,
} from "../validators/checkoutValidators.js";

export const checkoutRouter = Router();
checkoutRouter.use(checkoutRateLimit);
checkoutRouter.get(
  "/postal-code/:postalCode",
  validateRequest(postalCodeParamsSchema, "params"),
  lookupPostalCode,
);
checkoutRouter.post(
  "/quote",
  validateRequest(checkoutQuoteSchema, "body"),
  quoteCheckout,
);
