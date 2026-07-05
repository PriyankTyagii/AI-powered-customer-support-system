export class BillingTool {
  async getInvoiceDetails(userId: string) {
    const { prisma } = await import("../../db");
    return prisma.invoice.findMany({
      where: { userId },
      orderBy: { issuedAt: "desc" },
      take: 5,
      include: {
        order: true,
      },
    });
  }

  /** Fetch a specific order with its invoices and their refunds, ownership-scoped. */
  async findOrderBilling(userId: string, orderNumber: string) {
    const { prisma } = await import("../../db");
    return prisma.order.findFirst({
      where: { userId, orderNumber },
      include: {
        product: true,
        invoices: { include: { refunds: true } },
      },
    });
  }

  /** File a refund request against an invoice. */
  async createRefundRequest(invoiceId: string, amount: number, reason: string) {
    const { prisma } = await import("../../db");
    return prisma.refund.create({
      data: {
        invoiceId,
        amount,
        reason,
        status: "REQUESTED",
      },
    });
  }

  async checkRefundStatus(userId: string) {
    const { prisma } = await import("../../db");
    return prisma.refund.findMany({
      where: {
        invoice: {
          userId,
        },
      },
      orderBy: { requestedAt: "desc" },
      take: 5,
      include: {
        invoice: true,
      },
    });
  }
}
