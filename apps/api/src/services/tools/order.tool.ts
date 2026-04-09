export class OrderTool {
  async fetchOrderDetails(userId: string, orderNumber?: string) {
    const { prisma } = await import("../../db");
    if (orderNumber) {
      return prisma.order.findFirst({
        where: { userId, orderNumber },
      });
    }

    return prisma.order.findFirst({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    });
  }

  async checkDeliveryStatus(userId: string, orderNumber?: string) {
    const order = await this.fetchOrderDetails(userId, orderNumber);
    if (!order) return null;

    return {
      orderNumber: order.orderNumber,
      status: order.status,
      trackingNumber: order.trackingNumber,
      eta: order.eta,
    };
  }
}
