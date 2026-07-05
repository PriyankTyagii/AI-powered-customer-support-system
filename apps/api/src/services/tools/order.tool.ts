export class OrderTool {
  async fetchOrderDetails(userId: string, orderNumber?: string) {
    const { prisma } = await import("../../db");
    if (orderNumber) {
      return prisma.order.findFirst({
        where: { userId, orderNumber },
        include: { product: true },
      });
    }

    return prisma.order.findFirst({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      include: { product: true },
    });
  }

  async fetchRecentOrders(userId: string, take = 5) {
    const { prisma } = await import("../../db");
    return prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take,
      include: { product: true },
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
