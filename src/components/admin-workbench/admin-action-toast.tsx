"use client";

type AdminActionToastProps = {
  message: string;
  actionLabel: string;
  onAction: () => void;
  onDismiss: () => void;
};

export function AdminActionToast({
  message,
  actionLabel,
  onAction,
  onDismiss,
}: AdminActionToastProps) {
  return (
    <div className="admin-action-toast" role="status">
      <span className="admin-action-toast-text">{message}</span>
      <div className="admin-action-toast-actions">
        <button type="button" className="admin-action-toast-primary" onClick={onAction}>
          {actionLabel}
        </button>
        <button type="button" className="admin-action-toast-dismiss" onClick={onDismiss} aria-label="Dismiss">
          ×
        </button>
      </div>
    </div>
  );
}
