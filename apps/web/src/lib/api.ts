import type { StreamEvent } from "@support/shared";
import type { ChatMessage, ConversationSummary, Product, StoreOrder } from "../types";
import { getIdToken } from "./firebase";

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

/** Build request headers with the current user's Firebase ID token attached. */
async function authHeaders(extra: Record<string, string> = {}): Promise<Record<string, string>> {
  const token = await getIdToken();
  return {
    ...extra,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function listConversations(): Promise<ConversationSummary[]> {
  const response = await fetch(`${baseUrl}/api/chat/conversations`, {
    headers: await authHeaders(),
  });
  if (!response.ok) {
    return [];
  }
  return response.json();
}

export async function getConversationMessages(conversationId: string): Promise<ChatMessage[]> {
  const response = await fetch(`${baseUrl}/api/chat/conversations/${conversationId}`, {
    headers: await authHeaders(),
  });

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as { messages: ChatMessage[] };
  return payload.messages;
}

export async function listProducts(): Promise<Product[]> {
  const response = await fetch(`${baseUrl}/api/store/products`, {
    headers: await authHeaders(),
  });
  if (!response.ok) return [];
  return response.json();
}

export async function listOrders(): Promise<StoreOrder[]> {
  const response = await fetch(`${baseUrl}/api/store/orders`, {
    headers: await authHeaders(),
  });
  if (!response.ok) return [];
  return response.json();
}

async function postJson(path: string, body?: unknown) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: await authHeaders({ "Content-Type": "application/json" }),
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: unknown } | null;
    const message = typeof payload?.error === "string" ? payload.error : "Request failed";
    throw new Error(message);
  }

  return response.json();
}

export function checkout(productId: string, quantity: number) {
  return postJson("/api/store/checkout", { productId, quantity });
}

export function advanceOrder(orderId: string) {
  return postJson(`/api/store/orders/${orderId}/advance`);
}

export function requestRefund(orderId: string, reason: string) {
  return postJson(`/api/store/orders/${orderId}/refund`, { reason });
}

export function advanceRefund(orderId: string) {
  return postJson(`/api/store/orders/${orderId}/refund/advance`);
}

export async function streamAssistantResponse(payload: {
  conversationId?: string;
  content: string;
  onEvent: (event: StreamEvent) => void;
}) {
  const response = await fetch(`${baseUrl}/api/chat/messages`, {
    method: "POST",
    headers: await authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
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
