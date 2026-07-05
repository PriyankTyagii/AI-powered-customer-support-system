import { useState, type KeyboardEvent } from "react";
import { Modal } from "./Modal";
import type { ConversationSummary } from "../types";

type Props = {
  conversations: ConversationSummary[];
  activeId?: string;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onRename: (id: string, title: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

export function ConversationList({
  conversations,
  activeId,
  onSelect,
  onNewChat,
  onRename,
  onDelete,
}: Props) {
  const [editingId, setEditingId] = useState<string | undefined>();
  const [draftTitle, setDraftTitle] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ConversationSummary | undefined>();

  const startEditing = (conversation: ConversationSummary) => {
    setEditingId(conversation.id);
    setDraftTitle(conversation.title);
  };

  const commitEdit = async () => {
    if (editingId && draftTitle.trim()) {
      await onRename(editingId, draftTitle.trim());
    }
    setEditingId(undefined);
  };

  const handleEditKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") commitEdit();
    if (event.key === "Escape") setEditingId(undefined);
  };

  const confirmDelete = async () => {
    if (deleteTarget) {
      await onDelete(deleteTarget.id);
    }
    setDeleteTarget(undefined);
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>Conversations</h2>
        <button className="new-chat-btn" onClick={onNewChat}>
          + New chat
        </button>
      </div>
      <div className="conversation-list">
        {conversations.map((conversation) => (
          <div
            className={`conversation-item ${activeId === conversation.id ? "active" : ""}`}
            key={conversation.id}
            onClick={() => editingId !== conversation.id && onSelect(conversation.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === "Enter" && editingId !== conversation.id) {
                onSelect(conversation.id);
              }
            }}
          >
            {editingId === conversation.id ? (
              <input
                className="conversation-title-input"
                value={draftTitle}
                autoFocus
                onChange={(event) => setDraftTitle(event.target.value)}
                onBlur={commitEdit}
                onKeyDown={handleEditKey}
                onClick={(event) => event.stopPropagation()}
              />
            ) : (
              <div className="conversation-title">{conversation.title}</div>
            )}
            <div className="conversation-row-bottom">
              <span className="conversation-date">
                {new Date(conversation.updatedAt).toLocaleString()}
              </span>
              <span className="conversation-actions">
                <button
                  className="icon-btn"
                  title="Rename"
                  onClick={(event) => {
                    event.stopPropagation();
                    startEditing(conversation);
                  }}
                >
                  ✏️
                </button>
                <button
                  className="icon-btn"
                  title="Delete"
                  onClick={(event) => {
                    event.stopPropagation();
                    setDeleteTarget(conversation);
                  }}
                >
                  🗑️
                </button>
              </span>
            </div>
          </div>
        ))}
      </div>
      {deleteTarget ? (
        <Modal
          title="Delete conversation?"
          message={`"${deleteTarget.title}" and all its messages will be permanently deleted. This cannot be undone.`}
          confirmLabel="Delete"
          danger
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(undefined)}
        />
      ) : null}
    </aside>
  );
}
