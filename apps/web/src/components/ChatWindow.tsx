import type { ReactNode } from "react";
import type { ChatMessage } from "../types";

type Props = {
  messages: ChatMessage[];
};

/** Render markdown-style [label](url) links (e.g. [Open the Store](#store)) as anchors. */
function renderWithLinks(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = linkPattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(
      <a className="message-link" href={match[2]} key={match.index}>
        {match[1]}
      </a>,
    );
    lastIndex = match.index + match[0].length;
  }

  parts.push(text.slice(lastIndex));
  return parts;
}

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
              <p>{renderWithLinks(message.content)}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
