import { checkoutSchema, refundRequestSchema } from "@support/shared";
import type { Context } from "hono";
import { StoreService } from "../services/store.service";

export class StoreController {
  constructor(private readonly storeService = new StoreService()) {}

  listProducts = async (c: Context) => {
    const products = await this.storeService.listProducts();
    return c.json(products);
  };

  checkout = async (c: Context) => {
    const parsed = checkoutSchema.safeParse(await c.req.json());
    if (!parsed.success) {
      return c.json({ error: parsed.error.flatten() }, 400);
    }

    const result = await this.storeService.checkout({
      userId: c.get("userId"),
      productId: parsed.data.productId,
      quantity: parsed.data.quantity,
    });

    return c.json(result, 201);
  };

  listOrders = async (c: Context) => {
    const orders = await this.storeService.listOrders(c.get("userId"));
    return c.json(orders);
  };

  advanceOrder = async (c: Context) => {
    const orderId = c.req.param("id");
    if (!orderId) {
      return c.json({ error: "order id is required" }, 400);
    }

    const order = await this.storeService.advanceOrder(c.get("userId"), orderId);
    return c.json(order);
  };

  advanceRefund = async (c: Context) => {
    const orderId = c.req.param("id");
    if (!orderId) {
      return c.json({ error: "order id is required" }, 400);
    }

    const refund = await this.storeService.advanceRefund(c.get("userId"), orderId);
    return c.json(refund);
  };

  requestRefund = async (c: Context) => {
    const orderId = c.req.param("id");
    if (!orderId) {
      return c.json({ error: "order id is required" }, 400);
    }

    const parsed = refundRequestSchema.safeParse(await c.req.json());
    if (!parsed.success) {
      return c.json({ error: parsed.error.flatten() }, 400);
    }

    const refund = await this.storeService.requestRefund({
      userId: c.get("userId"),
      orderId,
      reason: parsed.data.reason,
    });

    return c.json(refund, 201);
  };
}
