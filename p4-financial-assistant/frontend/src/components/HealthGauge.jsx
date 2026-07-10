import { useEffect, useState } from "react";
import { useCountUp } from "../hooks/useCountUp";

// Red (0) -> yellow (~50) -> green (100), via HSL hue interpolation.
function colorForScore(score) {
  const hue = Math.max(0, Math.min(100, score)) * 1.2;
  return `hsl(${hue}, 78%, 55%)`;
}

export default function HealthGauge({ score, size = 160, strokeWidth = 14, showLabel = true }) {
  const [mounted, setMounted] = useState(false);
  const displayScore = useCountUp(mounted ? score : 0, 1100);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = mounted ? score / 100 : 0;
  const offset = circumference * (1 - progress);
  const color = colorForScore(score);

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--bg-inset)" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: "stroke-dashoffset 1.1s cubic-bezier(0.16, 1, 0.3, 1), stroke 0.6s ease",
            filter: `drop-shadow(0 0 10px ${color}88)`,
          }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span style={{ fontSize: size / 4, fontWeight: 800, color, letterSpacing: "-0.02em", lineHeight: 1 }}>
          {Math.round(displayScore)}
        </span>
        {showLabel && (
          <span style={{ fontSize: "0.65rem", color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginTop: 4 }}>
            / 100
          </span>
        )}
      </div>
    </div>
  );
}
