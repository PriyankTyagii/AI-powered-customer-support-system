export class ConversationHistoryTool {
  async queryConversationHistory(userId: string) {
    const { prisma } = await import("../../db");
    const conversations = await prisma.conversation.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 3,
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });

    return conversations;
  }
}
