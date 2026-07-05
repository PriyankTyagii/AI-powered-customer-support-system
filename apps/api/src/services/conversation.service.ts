import type { AgentType } from "@support/shared";
import { prisma } from "../db";

type MessageRole = "user" | "assistant";

export class ConversationService {
  async createConversation(userId: string, initialContent: string) {
    return prisma.conversation.create({
      data: {
        userId,
        title: initialContent.slice(0, 60),
      },
    });
  }

  async getConversation(conversationId: string, userId: string) {
    return prisma.conversation.findFirst({
      where: { id: conversationId, userId },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });
  }

  async listConversations(userId: string) {
    return prisma.conversation.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 50,
    });
  }

  async renameConversation(conversationId: string, userId: string, title: string) {
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, userId },
    });

    if (!conversation) {
      return null;
    }

    return prisma.conversation.update({
      where: { id: conversationId },
      data: { title },
    });
  }

  async deleteConversation(conversationId: string, userId: string) {
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, userId },
    });

    if (!conversation) {
      return null;
    }

    await prisma.conversation.delete({ where: { id: conversationId } });
    return conversation;
  }

  async addMessage(input: {
    conversationId: string;
    role: MessageRole;
    content: string;
    agentType?: AgentType;
  }) {
    return prisma.message.create({
      data: {
        conversationId: input.conversationId,
        role: input.role,
        content: input.content,
        agentType: input.agentType,
      },
    });
  }

  async getRecentMessages(conversationId: string, take = 8) {
    return prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "desc" },
      take,
    });
  }
}
