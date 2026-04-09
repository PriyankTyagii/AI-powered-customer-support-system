import type { AgentType } from "@support/shared";

export const agentCapabilities: Record<
  AgentType,
  { type: AgentType; name: string; description: string; tools: string[] }
> = {
  support: {
    type: "support",
    name: "Support Agent",
    description: "Handles troubleshooting and general support requests.",
    tools: ["queryConversationHistory"],
  },
  order: {
    type: "order",
    name: "Order Agent",
    description: "Handles order status, tracking, modifications, and cancellations.",
    tools: ["fetchOrderDetails", "checkDeliveryStatus"],
  },
  billing: {
    type: "billing",
    name: "Billing Agent",
    description: "Handles invoices, refunds, payment issues, and subscriptions.",
    tools: ["getInvoiceDetails", "checkRefundStatus"],
  },
};
