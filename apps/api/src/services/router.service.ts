import type { AgentType } from "@support/shared";
import { BillingAgentService } from "./agents/billing-agent.service";
import { OrderAgentService } from "./agents/order-agent.service";
import { SupportAgentService } from "./agents/support-agent.service";
import type { AgentResponse } from "./agents/types";

const ORDER_KEYWORDS = ["order", "track", "delivery", "shipping", "cancel", "modify", "eta"];
const BILLING_KEYWORDS = ["bill", "payment", "invoice", "refund", "charge", "subscription"];

export class RouterService {
  constructor(
    private readonly supportAgent = new SupportAgentService(),
    private readonly orderAgent = new OrderAgentService(),
    private readonly billingAgent = new BillingAgentService(),
  ) {}

  classifyIntent(content: string): AgentType {
    const lower = content.toLowerCase();

    if (ORDER_KEYWORDS.some((keyword) => lower.includes(keyword))) {
      return "order";
    }

    if (BILLING_KEYWORDS.some((keyword) => lower.includes(keyword))) {
      return "billing";
    }

    return "support";
  }

  async delegate(input: { userId: string; content: string }): Promise<AgentResponse> {
    const intent = this.classifyIntent(input.content);

    if (intent === "order") {
      return this.orderAgent.handle(input);
    }

    if (intent === "billing") {
      return this.billingAgent.handle(input);
    }

    return this.supportAgent.handle(input);
  }
}
