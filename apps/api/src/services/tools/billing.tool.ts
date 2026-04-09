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
