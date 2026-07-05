import { Hono } from "hono";
import { StoreController } from "../controllers/store.controller";

const controller = new StoreController();

export const storeRoutes = new Hono()
  .get("/products", controller.listProducts)
  .post("/checkout", controller.checkout)
  .get("/orders", controller.listOrders)
  .post("/orders/:id/advance", controller.advanceOrder)
  .post("/orders/:id/refund", controller.requestRefund)
  .post("/orders/:id/refund/advance", controller.advanceRefund);
