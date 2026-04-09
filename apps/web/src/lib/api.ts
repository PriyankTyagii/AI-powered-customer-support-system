import type { StreamEvent } from "@support/shared";
import type { ChatMessage, ConversationSummary } from "../types";

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

export async function listConversations(userId: string): Promise<ConversationSummary[]> {
  const response = await fetch(`${baseUrl}/api/chat/conversations?userId=${encodeURIComponent(userId)}`);
  if (!response.ok) {
    return [];
  }
  return response.json();
}

export async function getConversationMessages(input: {
  userId: string;
  conversationId: string;
}): Promise<ChatMessage[]> {
  const response = await fetch(
    `${baseUrl}/api/chat/conversations/${input.conversationId}?userId=${encodeURIComponent(input.userId)}`,
  );

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as { messages: ChatMessage[] };
  return payload.messages;
}

export async function streamAssistantResponse(payload: {
  userId: string;
  conversationId?: string;
  content: string;
  onEvent: (event: StreamEvent) => void;
}) {
  const response = await fetch(`${baseUrl}/api/chat/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userId: payload.userId,
      conversationId: payload.conversationId,
      content: payload.content,
    }),
  });

  if (!response.ok || !response.body) {
    throw new Error("Unable to stream assistant response");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";

    for (const eventBlock of events) {
      const dataLine = eventBlock
        .split("\n")
        .find((line) => line.startsWith("data:"));

      if (!dataLine) continue;

      const eventData = dataLine.replace("data:", "").trim();
      if (!eventData) continue;

      const parsed = JSON.parse(eventData) as StreamEvent;
      payload.onEvent(parsed);
    }
  }
}
