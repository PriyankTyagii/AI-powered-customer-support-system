import type { AgentResponse, AgentContext } from "./types";
import { BillingTool } from "../tools/billing.tool";

const ORDER_REF = /\bORD-[A-Z0-9]+\b/i;

function wantsList(content: string) {
  return /\b(all|list|every|history)\b/i.test(content) || /\b(refunds|invoices)\b/i.test(content);
}

function isRefundFocused(content: string) {
  return /\brefund(s|ed)?\b/i.test(content);
}

function isInvoiceFocused(content: string) {
  return /\b(invoice|invoices|bill|billing|receipt)\b/i.test(content);
}

function asksForStatus(content: string) {
  return /\b(status|update|progress|where|when|track)\b/i.test(content);
}

export class BillingAgentService {
  constructor(private readonly billingTool = new BillingTool()) {}

  /** Refund question scoped to a specific order: report on it, or file one. */
  private async handleOrderRefund(context: AgentContext, orderNumber: string): Promise<AgentResponse> {
    const order = await this.billingTool.findOrderBilling(context.userId, orderNumber);

    if (!order) {
      return {
        type: "billing",
        response: `I could not find order ${orderNumber} on your account. Please double-check the order number.`,
        reasoning: "Refund question referenced an unknown order.",
      };
    }

    const invoices = order.invoices;
    const allRefunds = invoices.flatMap((invoice) => invoice.refunds);
    const activeRefund = allRefunds.find((r) => r.status === "REQUESTED" || r.status === "APPROVED");
    const completedRefund = allRefunds.find((r) => r.status === "COMPLETED");
    const item = order.product ? `${order.quantity} x ${order.product.name}` : "your purchase";

    // Existing refund activity always takes precedence in the answer.
    if (activeRefund) {
      return {
        type: "billing",
        response: `A refund of ${activeRefund.amount.toFixed(2)} for order ${orderNumber} (${item}) is already ${activeRefund.status}. I'll keep you posted as it progresses.`,
        reasoning: "Refund already in progress for the referenced order.",
      };
    }

    if (completedRefund) {
      return {
        type: "billing",
        response: `Order ${orderNumber} (${item}) was already refunded: ${completedRefund.amount.toFixed(2)} completed${completedRefund.resolvedAt ? ` on ${new Date(completedRefund.resolvedAt).toDateString()}` : ""}.`,
        reasoning: "Refund already completed for the referenced order.",
      };
    }

    // Status question with no refund on file.
    if (asksForStatus(context.content)) {
      return {
        type: "billing",
        response: `There is no refund on file for order ${orderNumber} (${item}). If you'd like one, just say "request a refund for ${orderNumber}".`,
        reasoning: "Refund status asked but none exists for the order.",
      };
    }

    // Action: file the refund against the paid invoice.
    const paidInvoice = invoices.find((invoice) => invoice.status === "PAID");
    if (!paidInvoice) {
      return {
        type: "billing",
        response: `Order ${orderNumber} (${item}) has no paid invoice to refund${invoices.length ? ` — its invoice is ${invoices[0].status}` : ""}.`,
        reasoning: "Refund requested but no refundable invoice.",
      };
    }

    const refund = await this.billingTool.createRefundRequest(
      paidInvoice.id,
      paidInvoice.amount,
      `Requested via support chat for ${orderNumber}`,
    );

    return {
      type: "billing",
      response: `Done — I've filed a refund request for order ${orderNumber} (${item}): ${paidInvoice.currency} ${refund.amount.toFixed(2)} on invoice ${paidInvoice.invoiceNo}. Status: ${refund.status}. You'll see it move to APPROVED and then COMPLETED as it's processed.`,
      reasoning: "Refund request filed against the order's paid invoice.",
    };
  }

  async handle(context: AgentContext): Promise<AgentResponse> {
    // Refund questions that name an order are handled against that order —
    // including actually filing the refund when asked.
    const orderNumber = context.content.match(ORDER_REF)?.[0]?.toUpperCase();
    if (orderNumber && isRefundFocused(context.content)) {
      return this.handleOrderRefund(context, orderNumber);
    }

    const [invoices, refunds] = await Promise.all([
      this.billingTool.getInvoiceDetails(context.userId),
      this.billingTool.checkRefundStatus(context.userId),
    ]);

    // Refund-focused questions get refund answers — not invoice summaries.
    if (isRefundFocused(context.content)) {
      if (!refunds.length) {
        return {
          type: "billing",
          response:
            "You have no refund requests on file. If you want a refund for an order, tell me the order number and I can guide you.",
          reasoning: "Refund question but no refunds exist.",
        };
      }

      if (wantsList(context.content)) {
        const lines = refunds.map((refund) => {
          const resolved = refund.resolvedAt
            ? ` (resolved ${new Date(refund.resolvedAt).toDateString()})`
            : "";
          return `${refund.invoice.currency} ${refund.amount.toFixed(2)} on ${refund.invoice.invoiceNo} — ${refund.status}${resolved}, reason: ${refund.reason}`;
        });

        return {
          type: "billing",
          response: `You have ${refunds.length} refund request${refunds.length > 1 ? "s" : ""}: ${lines.join("; ")}.`,
          reasoning: "Refund list requested; summarizing all refunds.",
        };
      }

      const latest = refunds[0];
      return {
        type: "billing",
        response: [
          `Your most recent refund of ${latest.invoice.currency} ${latest.amount.toFixed(2)} on invoice ${latest.invoice.invoiceNo} is ${latest.status}.`,
          latest.resolvedAt
            ? `It was resolved on ${new Date(latest.resolvedAt).toDateString()}.`
            : "It is still being processed.",
        ].join(" "),
        reasoning: "Latest refund status requested.",
      };
    }

    if (!invoices.length) {
      return {
        type: "billing",
        response:
          "I could not find invoice records for your account. If you haven't purchased anything yet, [visit the Store](#store) — invoices appear here as soon as you buy something.",
        reasoning: "Billing intent selected but no invoices found.",
      };
    }

    // Invoice list questions enumerate instead of only showing the latest.
    if (isInvoiceFocused(context.content) && wantsList(context.content)) {
      const lines = invoices.map(
        (invoice) =>
          `${invoice.invoiceNo} — ${invoice.currency} ${invoice.amount.toFixed(2)}, ${invoice.status}`,
      );

      return {
        type: "billing",
        response: `You have ${invoices.length} invoice${invoices.length > 1 ? "s" : ""}: ${lines.join("; ")}.`,
        reasoning: "Invoice list requested; summarizing all invoices.",
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
      reasoning: "Billing summary selected based on payment keywords.",
    };
  }
}
