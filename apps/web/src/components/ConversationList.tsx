import type { ConversationSummary } from "../types";

type Props = {
  conversations: ConversationSummary[];
  activeId?: string;
  onSelect: (id: string) => void;
};

export function ConversationList({ conversations, activeId, onSelect }: Props) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>Conversations</h2>
      </div>
      <div className="conversation-list">
        {conversations.map((conversation) => (
          <button
            className={`conversation-item ${activeId === conversation.id ? "active" : ""}`}
            key={conversation.id}
            onClick={() => onSelect(conversation.id)}
          >
            <div className="conversation-title">{conversation.title}</div>
            <div className="conversation-date">
              {new Date(conversation.updatedAt).toLocaleString()}
            </div>
          </button>
        ))}
      </div>
    </aside>
  );
}
