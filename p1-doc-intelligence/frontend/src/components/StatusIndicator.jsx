import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

const META = {
  connecting: { label: "Connecting to server…", color: "var(--warning)", Icon: Loader2, spin: true },
  ready: { label: "Ready", color: "var(--success)", Icon: CheckCircle2, spin: false },
  error: { label: "Server unreachable", color: "var(--danger)", Icon: AlertCircle, spin: false },
};

export default function StatusIndicator({ status }) {
  const meta = META[status] ?? META.connecting;
  const Icon = meta.Icon;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        fontSize: "0.72rem",
        fontWeight: 600,
        color: meta.color,
        padding: "5px 10px",
        borderRadius: 999,
        border: "1px solid var(--glass-border)",
        background: "rgba(255,255,255,0.02)",
      }}
    >
      <Icon size={12} className={meta.spin ? "spin" : ""} />
      {meta.label}
    </div>
  );
}
