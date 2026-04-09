import type { AgentResponse, AgentContext } from "./types";
import { ConversationHistoryTool } from "../tools/conversation-history.tool";

export class SupportAgentService {
  constructor(private readonly historyTool = new ConversationHistoryTool()) {}

  async handle(context: AgentContext): Promise<AgentResponse> {
    const recentConversations = (await this.historyTool.queryConversationHistory(context.userId)) as Array<{
      messages: Array<{ content: string }>;
    }>;
    const references = recentConversations.flatMap((conversation) =>
      conversation.messages.map((message) => message.content),
    );

    const response = [
      "I can help with troubleshooting, product usage, and account questions.",
      references.length
        ? `From your recent chats, I found relevant context: \"${references[0]}\".`
        : "I do not see prior messages yet, so I will guide you from scratch.",
      "Please share any error message or step where the issue starts.",
    ].join(" ");

    return {
      type: "support",
      response,
      reasoning: "General support intent detected.",
    };
  }
}
