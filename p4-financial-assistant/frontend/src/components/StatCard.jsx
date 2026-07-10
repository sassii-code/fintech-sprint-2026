import { ResponsiveContainer, AreaChart, Area } from "recharts";
import { useCountUp } from "../hooks/useCountUp";

function formatValue(value, format) {
  if (format === "currency") {
    const sign = value < 0 ? "-" : "";
    return `${sign}$${Math.abs(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  }
  if (format === "percent") {
    return `${value.toFixed(1)}%`;
  }
  return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export default function StatCard({ label, value, format = "currency", trend, positive, delay = 0, icon: Icon }) {
  const display = useCountUp(value);
  const color = positive === true ? "var(--positive)" : positive === false ? "var(--negative)" : "var(--text)";

  return (
    <div
      className="card card-hover fade-in"
      style={{ padding: "20px 20px 14px", display: "flex", flexDirection: "column", gap: 10, "--delay": `${delay}ms` }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span className="metric-label">{label}</span>
        {Icon && (
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: "rgba(139, 92, 246, 0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon size={14} color="var(--accent-3)" />
          </div>
        )}
      </div>
      <span className="metric-value" style={{ color }}>
        {formatValue(display, format)}
      </span>
      {trend && trend.length > 1 && (
        <div style={{ height: 36, margin: "0 -20px -14px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`spark-${label}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={1.8}
                fill={`url(#spark-${label})`}
                isAnimationActive
                animationDuration={900}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
