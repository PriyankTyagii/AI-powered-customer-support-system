type Props = {
  isTyping: boolean;
  label?: string;
};

export function TypingIndicator({ isTyping, label }: Props) {
  if (!isTyping) return null;

  return (
    <div className="typing-indicator">
      <span>{label ?? "Thinking"}</span>
      <span className="dots">
        <i />
        <i />
        <i />
      </span>
    </div>
  );
}
