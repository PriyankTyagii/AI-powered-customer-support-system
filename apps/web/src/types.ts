export type ConversationSummary = {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  agentType?: "support" | "order" | "billing";
  createdAt: string;
};
