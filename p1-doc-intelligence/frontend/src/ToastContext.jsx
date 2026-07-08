import { createContext, useCallback, useContext, useRef, useState } from "react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";

const ToastContext = createContext(null);

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

const ACCENTS = {
  success: "var(--success)",
  error: "var(--danger)",
  info: "var(--accent-3)",
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message, type = "info", duration = 3000) => {
      const id = ++idRef.current;
      setToasts((prev) => [...prev, { id, message, type }]);
      if (duration > 0) {
        setTimeout(() => dismiss(id), duration);
      }
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div
        style={{
          position: "fixed",
          top: 78,
          right: 20,
          zIndex: 200,
          display: "flex",
          flexDirection: "column",
          gap: 10,
          pointerEvents: "none",
        }}
      >
        {toasts.map((t) => {
          const Icon = ICONS[t.type] ?? Info;
          return (
            <div
              key={t.id}
              className="card"
              style={{
                pointerEvents: "auto",
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "12px 16px",
                minWidth: 240,
                maxWidth: 360,
                animation: "toastIn 0.25s var(--ease) both",
                borderColor: "rgba(255,255,255,0.12)",
              }}
            >
              <Icon size={18} color={ACCENTS[t.type]} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: "0.85rem", flex: 1 }}>{t.message}</span>
              <button
                onClick={() => dismiss(t.id)}
                style={{ background: "none", border: "none", color: "var(--text-faint)", padding: 2 }}
                aria-label="Dismiss"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
