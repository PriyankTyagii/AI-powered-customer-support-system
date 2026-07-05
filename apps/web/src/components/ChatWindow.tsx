import type { ChatMessage } from "../types";

type Props = {
  messages: ChatMessage[];
};

export function ChatWindow({ messages }: Props) {
  return (
    <div className="chat-window">
      {messages.map((message) => (
        <div className={`message-row ${message.role}`} key={message.id}>
          <div className="message-bubble">
            <div className="message-meta">
              <strong>{message.role === "user" ? "You" : "Assistant"}</strong>
              {message.agentType ? <span>{message.agentType}</span> : null}
            </div>
            {message.role === "assistant" && message.content === "" ? (
              <span className="dots" aria-label="Assistant is thinking">
                <i />
                <i />
                <i />
              </span>
            ) : (
              <p>{message.content}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
