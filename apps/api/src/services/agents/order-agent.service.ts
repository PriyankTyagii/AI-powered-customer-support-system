import type { AgentResponse, AgentContext } from "./types";
import { OrderTool } from "../tools/order.tool";

function extractOrderNumber(content: string) {
  const match = content.match(/ORD-[A-Z0-9]+/i);
  return match?.[0]?.toUpperCase();
}

function wantsOrderList(content: string) {
  return /\b(all|list|every|history)\b/i.test(content) || /\borders\b/i.test(content);
}

export class OrderAgentService {
  constructor(private readonly orderTool = new OrderTool()) {}

  async handle(context: AgentContext): Promise<AgentResponse> {
    const orderNumber = extractOrderNumber(context.content);

    if (!orderNumber && wantsOrderList(context.content)) {
      const orders = await this.orderTool.fetchRecentOrders(context.userId);

      if (!orders.length) {
        return {
          type: "order",
          response:
            "You have no orders yet. Once you place one, I can report its status, tracking, and delivery estimate.",
          reasoning: "Order list requested but no orders exist.",
        };
      }

      const lines = orders.map((order) => {
        const item = order.product ? `${order.quantity} x ${order.product.name}` : "item unavailable";
        const tracking = order.trackingNumber ? `, tracking ${order.trackingNumber}` : "";
        return `${order.orderNumber} (${item}) — ${order.status}${tracking}`;
      });

      return {
        type: "order",
        response: `You have ${orders.length} recent order${orders.length > 1 ? "s" : ""}: ${lines.join("; ")}.`,
        reasoning: "Order list requested; summarizing recent orders.",
      };
    }

    const order = await this.orderTool.fetchOrderDetails(context.userId, orderNumber);

    if (!order) {
      return {
        type: "order",
        response:
          "I could not find an order for your account. Please share the order number (for example ORD-1001) so I can check status, tracking, changes, or cancellation options.",
        reasoning: "Order intent detected but no matching order found.",
      };
    }

    const delivery = await this.orderTool.checkDeliveryStatus(context.userId, order.orderNumber);
    const itemSummary = order.product
      ? `${order.quantity} x ${order.product.name}`
      : undefined;

    return {
      type: "order",
      response: [
        `Order ${order.orderNumber}${itemSummary ? ` (${itemSummary})` : ""} is currently ${order.status}.`,
        delivery?.trackingNumber ? `Tracking number: ${delivery.trackingNumber}.` : "Tracking number not assigned yet.",
        delivery?.eta ? `Estimated delivery: ${new Date(delivery.eta).toDateString()}.` : "ETA is not available yet.",
      ].join(" "),
      reasoning: "Order workflow selected.",
    };
  }
}
