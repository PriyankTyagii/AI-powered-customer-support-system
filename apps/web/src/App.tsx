import { FormEvent, useEffect, useMemo, useState } from "react";
import { ConversationList } from "./components/ConversationList";
import { ChatWindow } from "./components/ChatWindow";
import { TypingIndicator } from "./components/TypingIndicator";
import {
  getConversationMessages,
  listConversations,
  streamAssistantResponse,
} from "./lib/api";
import type { ChatMessage, ConversationSummary } from "./types";

function createTempMessage(content: string): ChatMessage {
  return {
    id: crypto.randomUUID(),
    conversationId: "",
    role: "assistant",
    content,
    createdAt: new Date().toISOString(),
  };
}

export default function App() {
  const userId = "user_001";
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | undefined>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [typingLabel, setTypingLabel] = useState<string | undefined>();
  const [isSending, setIsSending] = useState(false);

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeConversationId),
    [activeConversationId, conversations],
  );

  const loadConversations = async () => {
    const data = await listConversations(userId);
    setConversations(data);

    if (!activeConversationId && data.length) {
      setActiveConversationId(data[0].id);
    }
  };

  const loadConversationMessages = async (conversationId: string) => {
    const data = await getConversationMessages({
      conversationId,
      userId,
    });
    setMessages(data);
  };

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      return;
    }

    loadConversationMessages(activeConversationId);
  }, [activeConversationId]);

  async function handleSend(event: FormEvent) {
    event.preventDefault();
    if (!input.trim() || isSending) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      conversationId: activeConversationId ?? "pending",
      role: "user",
      content: input,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage, createTempMessage("")]);
    const content = input;
    setInput("");
    setIsSending(true);

    try {
      await streamAssistantResponse({
        userId,
        conversationId: activeConversationId,
        content,
        onEvent: (streamEvent) => {
          if (streamEvent.type === "typing") {
            setIsTyping(streamEvent.value);
            setTypingLabel(streamEvent.label);
            return;
          }

          if (streamEvent.type === "delta") {
            setMessages((prev) => {
              const next = [...prev];
              const lastAssistantIndex = [...next]
                .reverse()
                .findIndex((message) => message.role === "assistant");

              if (lastAssistantIndex === -1) return prev;

              const realIndex = next.length - 1 - lastAssistantIndex;
              next[realIndex] = {
                ...next[realIndex],
                content: next[realIndex].content + streamEvent.text,
              };
              return next;
            });
            return;
          }

          if (streamEvent.type === "done") {
            setIsTyping(false);
            setTypingLabel(undefined);
            loadConversations();
            if (activeConversationId) {
              loadConversationMessages(activeConversationId);
            }
          }
        },
      });
    } catch (error) {
      console.error(error);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <main className="layout">
      <ConversationList
        conversations={conversations}
        activeId={activeConversationId}
        onSelect={setActiveConversationId}
      />
      <section className="chat-panel">
        <header className="chat-header">
          <h1>AI Support Multi-Agent System</h1>
          <p>
            {activeConversation
              ? `Active: ${activeConversation.title}`
              : "Start a new conversation below"}
          </p>
        </header>

        <ChatWindow messages={messages} />
        <TypingIndicator isTyping={isTyping} label={typingLabel} />

        <form className="composer" onSubmit={handleSend}>
          <input
            placeholder="Ask about support, orders, billing, refunds..."
            value={input}
            onChange={(event) => setInput(event.target.value)}
          />
          <button disabled={isSending} type="submit">
            {isSending ? "Sending..." : "Send"}
          </button>
        </form>
      </section>
    </main>
  );
}
