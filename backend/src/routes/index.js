import { Router } from "express";
import { env } from '../config/env.js';
import { healthRouter } from "./healthRoutes.js";
import { getReadiness } from "../controllers/healthController.js";
import { catalogRouter } from "./catalogRoutes.js";
import { productRouter } from "./productRoutes.js";
import { cartRouter } from "./cartRoutes.js";
import { courseRouter } from "./courseRoutes.js";
import { checkoutRouter } from "./checkoutRoutes.js";
import { orderRouter } from "./orderRoutes.js";

import { adminRouter } from "./adminRoutes.js";
import { customerRouter } from "./customerRoutes.js";

export const apiRouter = Router();
apiRouter.get('/storefront', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ data: { mode: env.SITE_MODE } });
});
apiRouter.use("/health", healthRouter);
apiRouter.get("/ready", getReadiness);
apiRouter.use("/catalog", catalogRouter);
apiRouter.use("/products", productRouter);
apiRouter.use("/cart", cartRouter);
apiRouter.use("/courses", courseRouter);
apiRouter.use("/checkout", checkoutRouter);
apiRouter.use("/orders", orderRouter);

apiRouter.use("/admin", adminRouter);
apiRouter.use("/customers", customerRouter);
