export type ConversationSummary = {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

export type Product = {
  id: string;
  sku: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  imageEmoji: string;
};

export type Refund = {
  id: string;
  amount: number;
  reason: string;
  status: "REQUESTED" | "APPROVED" | "REJECTED" | "COMPLETED";
  requestedAt: string;
};

export type Invoice = {
  id: string;
  invoiceNo: string;
  amount: number;
  currency: string;
  status: "PENDING" | "PAID" | "OVERDUE" | "REFUNDED";
  refunds: Refund[];
};

export type StoreOrder = {
  id: string;
  orderNumber: string;
  quantity: number;
  total: number;
  status: "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED";
  trackingNumber?: string | null;
  eta?: string | null;
  createdAt: string;
  product?: Product | null;
  invoices: Invoice[];
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  agentType?: "support" | "order" | "billing";
  createdAt: string;
};
