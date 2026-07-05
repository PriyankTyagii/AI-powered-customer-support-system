import { generateText } from "ai";
import { agentTypeSchema, type AgentType } from "@support/shared";
import { aiProvider } from "./ai-provider";
import { BillingAgentService } from "./agents/billing-agent.service";
import { OrderAgentService } from "./agents/order-agent.service";
import { SupportAgentService } from "./agents/support-agent.service";
import type { AgentResponse } from "./agents/types";

/**
 * Deterministic fast path: reference-number patterns and word-boundary
 * keyword matches. Word boundaries prevent false positives like "billboard"
 * matching "bill".
 */
const ORDER_NUMBER = /\bORD-[A-Z0-9]+\b/i;
const INVOICE_NUMBER = /\bINV-[A-Z0-9]+\b/i;

const BILLING_KEYWORDS =
  /\b(bill|billing|payment|payments|pay|paid|invoice|invoices|refund|refunds|refunded|charge|charged|charges|subscription|subscriptions|receipt)\b/i;
const ORDER_KEYWORDS =
  /\b(order|orders|track|tracking|delivery|deliver|delivered|shipping|shipment|shipped|package|parcel|eta|cost|costs|price|priced|pricing)\b/i;

export class RouterService {
  constructor(
    private readonly supportAgent = new SupportAgentService(),
    private readonly orderAgent = new OrderAgentService(),
    private readonly billingAgent = new BillingAgentService(),
  ) {}

  /**
   * Keyword/pattern classification. Returns undefined when nothing matches,
   * signalling that the LLM fallback should decide.
   */
  classifyIntent(content: string): AgentType | undefined {
    // Billing signals win over a bare order number: "refund for ORD-123"
    // is a billing conversation about an order.
    if (INVOICE_NUMBER.test(content) || BILLING_KEYWORDS.test(content)) {
      return "billing";
    }

    if (ORDER_NUMBER.test(content) || ORDER_KEYWORDS.test(content)) {
      return "order";
    }

    return undefined;
  }

  /**
   * LLM fallback for messages the keyword pass can't place, e.g.
   * "status of ORD-..." phrased unusually, or "I was charged twice but
   * the app also crashes". Falls back to support when no provider is
   * configured or the model answers garbage.
   */
  private async classifyWithModel(content: string): Promise<AgentType> {
    if (!aiProvider) {
      return "support";
    }

    try {
      const result = await generateText({
        model: aiProvider.client(aiProvider.model),
        system:
          "Classify the customer message into exactly one category. " +
          "Reply with a single word: support, order, or billing. " +
          "order = order status, tracking, shipping, cancellations of orders. " +
          "billing = payments, invoices, refunds, charges, subscriptions. " +
          "support = everything else (troubleshooting, account help, general questions).",
        prompt: content,
        maxTokens: 4,
        temperature: 0,
      });

      const parsed = agentTypeSchema.safeParse(result.text.trim().toLowerCase());
      return parsed.success ? parsed.data : "support";
    } catch (error) {
      console.error("LLM intent classification failed, defaulting to support:", error);
      return "support";
    }
  }

  async resolveIntent(content: string): Promise<AgentType> {
    return this.classifyIntent(content) ?? (await this.classifyWithModel(content));
  }

  async delegate(input: { userId: string; content: string }): Promise<AgentResponse> {
    const intent = await this.resolveIntent(input.content);

    if (intent === "order") {
      return this.orderAgent.handle(input);
    }

    if (intent === "billing") {
      return this.billingAgent.handle(input);
    }

    return this.supportAgent.handle(input);
  }
}
