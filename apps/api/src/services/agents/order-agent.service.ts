import type { AgentResponse, AgentContext } from "./types";
import { OrderTool } from "../tools/order.tool";

function extractOrderNumber(content: string) {
  const match = content.match(/ORD-\d+/i);
  return match?.[0]?.toUpperCase();
}

export class OrderAgentService {
  constructor(private readonly orderTool = new OrderTool()) {}

  async handle(context: AgentContext): Promise<AgentResponse> {
    const orderNumber = extractOrderNumber(context.content);
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

    return {
      type: "order",
      response: [
        `Order ${order.orderNumber} is currently ${order.status}.`,
        delivery?.trackingNumber ? `Tracking number: ${delivery.trackingNumber}.` : "Tracking number not assigned yet.",
        delivery?.eta ? `Estimated delivery: ${new Date(delivery.eta).toDateString()}.` : "ETA is not available yet.",
      ].join(" "),
      reasoning: "Order workflow selected.",
    };
  }
}
