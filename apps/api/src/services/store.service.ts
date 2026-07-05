import { prisma } from "../db";
import { HttpError } from "../middleware/error-handler";

/** Number of days until estimated delivery once an order ships. */
const SHIPPING_DAYS = 3;

function generateOrderNumber() {
  return `ORD-${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 100)
    .toString()
    .padStart(2, "0")}`;
}

function generateInvoiceNumber() {
  return `INV-${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 100)
    .toString()
    .padStart(2, "0")}`;
}

function generateTrackingNumber() {
  return `TRK-${Math.floor(100000 + Math.random() * 900000)}`;
}

export class StoreService {
  async listProducts() {
    return prisma.product.findMany({
      where: { active: true },
      orderBy: { price: "asc" },
    });
  }

  /**
   * "Purchase" a product: creates a real Order plus its paid Invoice in one
   * transaction. Payment is simulated (this is where a Stripe checkout
   * session would slot in later).
   */
  async checkout(input: { userId: string; productId: string; quantity: number }) {
    const product = await prisma.product.findFirst({
      where: { id: input.productId, active: true },
    });

    if (!product) {
      throw new HttpError(404, "Product not found");
    }

    const total = Number((product.price * input.quantity).toFixed(2));

    return prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          userId: input.userId,
          productId: product.id,
          quantity: input.quantity,
          total,
          status: "PROCESSING",
        },
        include: { product: true },
      });

      const invoice = await tx.invoice.create({
        data: {
          invoiceNo: generateInvoiceNumber(),
          userId: input.userId,
          orderId: order.id,
          amount: total,
          currency: product.currency,
          status: "PAID",
          issuedAt: new Date(),
          dueAt: new Date(),
        },
      });

      return { order, invoice };
    });
  }

  async listOrders(userId: string) {
    return prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        product: true,
        invoices: { include: { refunds: true } },
      },
    });
  }

  /**
   * Demo fulfillment: advances an order one step through its lifecycle.
   * PROCESSING -> SHIPPED (assigns tracking + ETA) -> DELIVERED.
   * In production this would be driven by a fulfillment provider webhook.
   */
  async advanceOrder(userId: string, orderId: string) {
    const order = await prisma.order.findFirst({ where: { id: orderId, userId } });

    if (!order) {
      throw new HttpError(404, "Order not found");
    }

    if (order.status === "PROCESSING") {
      return prisma.order.update({
        where: { id: order.id },
        data: {
          status: "SHIPPED",
          trackingNumber: generateTrackingNumber(),
          eta: new Date(Date.now() + SHIPPING_DAYS * 24 * 60 * 60 * 1000),
        },
        include: { product: true },
      });
    }

    if (order.status === "SHIPPED") {
      return prisma.order.update({
        where: { id: order.id },
        data: { status: "DELIVERED", eta: new Date() },
        include: { product: true },
      });
    }

    throw new HttpError(409, `Order is already ${order.status.toLowerCase()} and cannot advance further`);
  }

  /** File a refund request against the order's paid invoice. */
  async requestRefund(input: { userId: string; orderId: string; reason: string }) {
    const order = await prisma.order.findFirst({
      where: { id: input.orderId, userId: input.userId },
      include: { invoices: { include: { refunds: true } } },
    });

    if (!order) {
      throw new HttpError(404, "Order not found");
    }

    const invoice = order.invoices.find((entry) => entry.status === "PAID");
    if (!invoice) {
      throw new HttpError(409, "No paid invoice found for this order");
    }

    const pending = invoice.refunds.find(
      (refund) => refund.status === "REQUESTED" || refund.status === "APPROVED",
    );
    if (pending) {
      throw new HttpError(409, "A refund request is already in progress for this order");
    }

    return prisma.refund.create({
      data: {
        invoiceId: invoice.id,
        amount: invoice.amount,
        reason: input.reason,
        status: "REQUESTED",
      },
    });
  }

  /**
   * Demo refund processing: REQUESTED -> APPROVED -> COMPLETED.
   * Completion stamps resolvedAt and marks the invoice REFUNDED.
   * In production a payments provider (e.g. Stripe) would drive this.
   */
  async advanceRefund(userId: string, orderId: string) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, userId },
      include: { invoices: { include: { refunds: true } } },
    });

    if (!order) {
      throw new HttpError(404, "Order not found");
    }

    const refunds = order.invoices.flatMap((invoice) => invoice.refunds);
    const active = refunds.find((r) => r.status === "REQUESTED" || r.status === "APPROVED");

    if (!active) {
      throw new HttpError(409, "No refund in progress for this order");
    }

    if (active.status === "REQUESTED") {
      return prisma.refund.update({
        where: { id: active.id },
        data: { status: "APPROVED" },
      });
    }

    const [completed] = await prisma.$transaction([
      prisma.refund.update({
        where: { id: active.id },
        data: { status: "COMPLETED", resolvedAt: new Date() },
      }),
      prisma.invoice.update({
        where: { id: active.invoiceId },
        data: { status: "REFUNDED" },
      }),
    ]);

    return completed;
  }
}
