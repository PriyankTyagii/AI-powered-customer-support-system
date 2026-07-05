import { FormEvent, useEffect, useMemo, useState } from "react";
import { ConversationList } from "./components/ConversationList";
import { ChatWindow } from "./components/ChatWindow";
import { TypingIndicator } from "./components/TypingIndicator";
import { Login } from "./components/Login";
import { Store } from "./components/Store";
import { useAuth } from "./lib/auth";
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
  const { user, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="login-screen">
        <div className="login-card">
          <p>Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return <ChatApp userName={user.displayName ?? user.email ?? "Account"} onSignOut={signOut} />;
}

function ChatApp({ userName, onSignOut }: { userName: string; onSignOut: () => Promise<void> }) {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | undefined>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [typingLabel, setTypingLabel] = useState<string | undefined>();
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | undefined>();
  const [view, setView] = useState<"chat" | "store">("chat");

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeConversationId),
    [activeConversationId, conversations],
  );

  const loadConversations = async () => {
    const data = await listConversations();
    setConversations(data);

    if (!activeConversationId && data.length) {
      setActiveConversationId(data[0].id);
    }
  };

  const loadConversationMessages = async (conversationId: string) => {
    const data = await getConversationMessages(conversationId);
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
    setSendError(undefined);

    try {
      await streamAssistantResponse({
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
            // Adopt the server-created conversation explicitly (fixes the
            // racy "newest conversation is probably mine" behaviour).
            setActiveConversationId(streamEvent.conversationId);
            loadConversations();
            loadConversationMessages(streamEvent.conversationId);
            return;
          }

          if (streamEvent.type === "error") {
            setIsTyping(false);
            setTypingLabel(undefined);
            setSendError(streamEvent.message);
            // Drop the empty assistant placeholder bubble.
            setMessages((prev) =>
              prev.filter((message) => message.role !== "assistant" || message.content !== ""),
            );
          }
        },
      });
    } catch (error) {
      console.error(error);
      setSendError("Failed to send message. Please check your connection and try again.");
      setMessages((prev) =>
        prev.filter((message) => message.role !== "assistant" || message.content !== ""),
      );
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
          <div className="chat-header-top">
            <h1>AI Support Multi-Agent System</h1>
            <div className="user-menu">
              <nav className="view-tabs">
                <button
                  className={view === "chat" ? "active" : ""}
                  onClick={() => setView("chat")}
                >
                  Chat
                </button>
                <button
                  className={view === "store" ? "active" : ""}
                  onClick={() => setView("store")}
                >
                  Store
                </button>
              </nav>
              <span className="user-name">{userName}</span>
              <button className="signout-btn" onClick={() => onSignOut()}>
                Sign out
              </button>
            </div>
          </div>
          <p>
            {view === "store"
              ? "Buy products to generate real orders, then ask the assistant about them"
              : activeConversation
                ? `Active: ${activeConversation.title}`
                : "Start a new conversation below"}
          </p>
        </header>

        {view === "store" ? (
          <Store />
        ) : (
          <>
            <ChatWindow messages={messages} />
            <TypingIndicator isTyping={isTyping} label={typingLabel} />
            {sendError ? <div className="send-error">{sendError}</div> : null}

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
          </>
        )}
      </section>
    </main>
  );
}
