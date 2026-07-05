import { streamSSE } from "hono/streaming";
import { createMessageSchema, streamEventSchema } from "@support/shared";
import type { Context } from "hono";
import { ConversationService } from "../services/conversation.service";
import { RouterService } from "../services/router.service";
import { AiStreamService } from "../services/ai-stream.service";

const thinkingWords = ["Thinking", "Searching", "Analyzing", "Reviewing context", "Routing"];

export class ChatController {
  constructor(
    private readonly conversationService = new ConversationService(),
    private readonly routerService = new RouterService(),
    private readonly aiStreamService = new AiStreamService(),
  ) {}

  postMessage = async (c: Context) => {
    const body = await c.req.json();
    const parsed = createMessageSchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ error: parsed.error.flatten() }, 400);
    }

    const userId = c.get("userId");
    const { content } = parsed.data;
    let { conversationId } = parsed.data;

    // Only accept a conversation the authenticated user actually owns;
    // otherwise start a fresh one.
    if (conversationId) {
      const existing = await this.conversationService.getConversation(conversationId, userId);
      if (!existing) {
        conversationId = undefined;
      }
    }

    if (!conversationId) {
      const created = await this.conversationService.createConversation(userId, content);
      conversationId = created.id;
    }

    const resolvedConversationId = conversationId;

    await this.conversationService.addMessage({
      conversationId: resolvedConversationId,
      role: "user",
      content,
    });

    const routed = await this.routerService.delegate({ userId, content });

    return streamSSE(c, async (stream) => {
      try {
        const typing = streamEventSchema.parse({
          type: "typing",
          value: true,
          label: thinkingWords[Math.floor(Math.random() * thinkingWords.length)],
        });

        await stream.writeSSE({ event: "message", data: JSON.stringify(typing) });

        let fullResponse = "";

        for await (const delta of this.aiStreamService.streamResponse(routed)) {
          fullResponse += delta;
          const deltaPayload = streamEventSchema.parse({
            type: "delta",
            text: delta,
          });
          await stream.writeSSE({ event: "message", data: JSON.stringify(deltaPayload) });
        }

        const assistantMessage = await this.conversationService.addMessage({
          conversationId: resolvedConversationId,
          role: "assistant",
          content: fullResponse.trim(),
          agentType: routed.type,
        });

        const stopTyping = streamEventSchema.parse({ type: "typing", value: false });
        await stream.writeSSE({ event: "message", data: JSON.stringify(stopTyping) });

        const done = streamEventSchema.parse({
          type: "done",
          messageId: assistantMessage.id,
          conversationId: resolvedConversationId,
        });
        await stream.writeSSE({ event: "message", data: JSON.stringify(done) });
      } catch (error) {
        // Once the SSE stream is open the global error handler can't help;
        // emit a typed error event so the client can recover gracefully.
        console.error(`Stream failed for conversation ${resolvedConversationId}:`, error);
        const errorPayload = streamEventSchema.parse({
          type: "error",
          message: "Something went wrong while generating the response. Please try again.",
        });
        await stream.writeSSE({ event: "message", data: JSON.stringify(errorPayload) });
      }
    });
  };

  getConversation = async (c: Context) => {
    const conversationId = c.req.param("id");
    const userId = c.get("userId");

    if (!conversationId) {
      return c.json({ error: "conversation id is required" }, 400);
    }

    const conversation = await this.conversationService.getConversation(conversationId, userId);
    if (!conversation) {
      return c.json({ error: "Conversation not found" }, 404);
    }

    return c.json(conversation);
  };

  listConversations = async (c: Context) => {
    const userId = c.get("userId");
    const conversations = await this.conversationService.listConversations(userId);
    return c.json(conversations);
  };

  deleteConversation = async (c: Context) => {
    const conversationId = c.req.param("id");
    const userId = c.get("userId");

    if (!conversationId) {
      return c.json({ error: "conversation id is required" }, 400);
    }

    const removed = await this.conversationService.deleteConversation(conversationId, userId);
    if (!removed) {
      return c.json({ error: "Conversation not found" }, 404);
    }

    return c.json({ ok: true });
  };
}
