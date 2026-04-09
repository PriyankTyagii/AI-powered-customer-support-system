import type { AgentResponse, AgentContext } from "./types";
import { BillingTool } from "../tools/billing.tool";

export class BillingAgentService {
  constructor(private readonly billingTool = new BillingTool()) {}

  async handle(context: AgentContext): Promise<AgentResponse> {
    const [invoices, refunds] = await Promise.all([
      this.billingTool.getInvoiceDetails(context.userId),
      this.billingTool.checkRefundStatus(context.userId),
    ]);

    if (!invoices.length) {
      return {
        type: "billing",
        response:
          "I could not find invoice records for your account. If this is a new purchase, it may take a few minutes to sync. Please share the invoice number if available.",
        reasoning: "Billing intent selected but no invoices found.",
      };
    }

    const latestInvoice = invoices[0];
    const latestRefund = refunds[0];

    return {
      type: "billing",
      response: [
        `Latest invoice ${latestInvoice.invoiceNo} is ${latestInvoice.status} for ${latestInvoice.currency} ${latestInvoice.amount.toFixed(2)}.`,
        latestRefund
          ? `Latest refund request is ${latestRefund.status} for ${latestRefund.amount.toFixed(2)}.`
          : "No refund requests found for your account.",
      ].join(" "),
      reasoning: "Billing intent selected based on payment/refund keywords.",
    };
  }
}
