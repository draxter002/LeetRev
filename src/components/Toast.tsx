"use client";

import { useEffect, useState } from "react";

export type ToastVariant = "success" | "error" | "info";

export type ToastMessage = {
  id: number;
  message: string;
  variant: ToastVariant;
};

const VARIANT_STYLES: Record<ToastVariant, string> = {
  success: "bg-teal text-white",
  error: "bg-rose-600 text-white",
  info: "border border-ink/15 bg-white text-ink shadow-md",
};

const ICONS: Record<ToastVariant, string> = {
  success: "✓",
  error: "✕",
  info: "ℹ",
};

/** Individual toast pill — auto-dismisses after `duration` ms */
function ToastPill({
  toast,
  onDismiss,
}: {
  toast: ToastMessage;
  onDismiss: (id: number) => void;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Animate in
    const show = requestAnimationFrame(() => setVisible(true));
    // Auto-dismiss after 3.5 s
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss(toast.id), 300);
    }, 3500);
    return () => {
      cancelAnimationFrame(show);
      clearTimeout(timer);
    };
  }, [toast.id, onDismiss]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium shadow-lg transition-all duration-300 ${
        VARIANT_STYLES[toast.variant]
      } ${visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}
    >
      <span className="text-[15px] leading-none">{ICONS[toast.variant]}</span>
      {toast.message}
      <button
        onClick={() => {
          setVisible(false);
          setTimeout(() => onDismiss(toast.id), 300);
        }}
        className="ml-1 opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}

/** Fixed toast container — renders at bottom-center on mobile, bottom-right on desktop */
export function ToastContainer({ toasts, onDismiss }: {
  toasts: ToastMessage[];
  onDismiss: (id: number) => void;
}) {
  if (toasts.length === 0) return null;
  return (
    <div className="pointer-events-none fixed bottom-20 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2 md:bottom-6 md:left-auto md:right-6 md:translate-x-0 md:items-end">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastPill toast={t} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
}

/** Hook that manages a toast queue */
export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  let nextId = 0;

  const toast = (message: string, variant: ToastVariant = "info") => {
    const id = ++nextId + Date.now();
    setToasts((prev) => [...prev, { id, message, variant }]);
  };

  const dismiss = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return { toasts, toast, dismiss };
}
