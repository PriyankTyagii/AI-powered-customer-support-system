import { useEffect, useState, type KeyboardEvent } from "react";

type Props = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  /** When set, the modal shows a text input and passes its value to onConfirm. */
  input?: { placeholder?: string; initialValue?: string };
  onConfirm: (value?: string) => void;
  onCancel: () => void;
};

export function Modal({
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  input,
  onConfirm,
  onCancel,
}: Props) {
  const [value, setValue] = useState(input?.initialValue ?? "");

  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const confirm = () => {
    if (input && !value.trim()) return;
    onConfirm(input ? value.trim() : undefined);
  };

  const handleInputKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") confirm();
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <h3 className="modal-title">{title}</h3>
        {message ? <p className="modal-message">{message}</p> : null}
        {input ? (
          <input
            className="modal-input"
            autoFocus
            placeholder={input.placeholder}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={handleInputKey}
          />
        ) : null}
        <div className="modal-actions">
          <button className="modal-btn secondary" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            className={`modal-btn ${danger ? "danger" : "primary"}`}
            onClick={confirm}
            disabled={input ? !value.trim() : false}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
