import { useEffect, useState } from "react";
import { PiggyBank, Activity, Scale, ShieldCheck, Lightbulb, Sparkles, AlertTriangle } from "lucide-react";
import { useAuth } from "../AuthContext";
import { getHealthScore, friendlyErrorMessage } from "../api";
import HealthGauge from "../components/HealthGauge";
import Skeleton from "../components/Skeleton";

const COMPONENTS = [
  { key: "savings_rate", label: "Savings Rate", weight: 35, icon: PiggyBank, format: (v) => (v == null ? "—" : `${(v * 100).toFixed(1)}%`) },
  { key: "consistency", label: "Spending Consistency", weight: 25, icon: Activity, format: (v) => (v == null ? "—" : `CV ${v.toFixed(2)}`) },
  { key: "expense_ratio", label: "Expense-to-Income Ratio", weight: 25, icon: Scale, format: (v) => (v == null ? "—" : `${(v * 100).toFixed(1)}%`) },
  { key: "buffer", label: "Emergency Fund Buffer", weight: 15, icon: ShieldCheck, format: (v) => (v == null ? "—" : `${v.toFixed(1)} mo`) },
];

function ComponentBar({ label, weight, score, rawValue, format, Icon, delay }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const id = setTimeout(() => setWidth(score), 150 + delay);
    return () => clearTimeout(id);
  }, [score, delay]);

  return (
    <div className="fade-in" style={{ "--delay": `${delay}ms` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Icon size={15} color="var(--accent-3)" />
          <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>{label}</span>
          <span style={{ fontSize: "0.7rem", color: "var(--text-faint)" }}>({weight}% weight)</span>
        </div>
        <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
          {format(rawValue)} · {Math.round(score)}/100
        </span>
      </div>
      <div style={{ height: 8, background: "var(--bg-inset)", borderRadius: 999, overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${width}%`,
            background: "var(--accent-grad)",
            borderRadius: 999,
            transition: "width 0.9s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        />
      </div>
    </div>
  );
}

export default function HealthScorePage() {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getHealthScore(token)
      .then((d) => !cancelled && setData(d))
      .catch((err) => !cancelled && setError(err));
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (error) {
    const is404 = error.status === 404;
    return (
      <div className="card fade-in" style={{ padding: 56, display: "flex", flexDirection: "column", alignItems: "center", gap: 14, textAlign: "center" }}>
        {is404 ? <Sparkles size={32} color="var(--text-faint)" /> : <AlertTriangle size={32} color="var(--negative)" />}
        <p style={{ margin: 0, fontSize: "0.92rem", color: "var(--text-muted)", maxWidth: 360 }}>
          {is404 ? "Upload some transactions to see your health score." : friendlyErrorMessage(error)}
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div className="card" style={{ padding: 32, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <Skeleton height={220} width={220} radius="50%" />
        </div>
        <div className="card" style={{ padding: 28, display: "flex", flexDirection: "column", gap: 24 }}>
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height={30} />)}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="card fade-in" style={{ padding: 32, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <HealthGauge score={data.score} size={220} strokeWidth={18} />
        <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Your overall financial health score</span>
      </div>

      <div className="card fade-in" style={{ padding: 28, display: "flex", flexDirection: "column", gap: 24 }}>
        <h2 style={{ fontSize: "0.95rem", margin: 0, fontWeight: 700 }}>Score Breakdown</h2>
        {COMPONENTS.map((c, i) => (
          <ComponentBar
            key={c.key}
            label={c.label}
            weight={c.weight}
            score={data.breakdown[c.key]?.score ?? 0}
            rawValue={data.breakdown[c.key]?.value}
            format={c.format}
            Icon={c.icon}
            delay={i * 80}
          />
        ))}
      </div>

      <div className="card card-glow-accent fade-in" style={{ padding: 24, display: "flex", gap: 14 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--accent-grad)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Lightbulb size={17} color="#fff" />
        </div>
        <div>
          <div style={{ fontWeight: 700, marginBottom: 6, fontSize: "0.9rem" }}>AI Explanation</div>
          <p style={{ margin: 0, fontSize: "0.88rem", lineHeight: 1.65, color: "var(--text-muted)" }}>{data.explanation}</p>
        </div>
      </div>
    </div>
  );
}
