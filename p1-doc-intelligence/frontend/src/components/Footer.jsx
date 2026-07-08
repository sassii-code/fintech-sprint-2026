const BADGES = [
  { label: "React", color: "#61dafb" },
  { label: "FastAPI", color: "#009688" },
  { label: "PostgreSQL", color: "#336791" },
  { label: "Gemini 2.5", color: "#8b5cf6" },
  { label: "JWT Auth", color: "#f472b6" },
];

export default function Footer() {
  return (
    <footer
      className="fade-in"
      style={{
        marginTop: 48,
        borderTop: "1px solid var(--glass-border)",
        padding: "28px 20px 40px",
      }}
    >
      <div
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 14,
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8 }}>
          {BADGES.map((b) => (
            <span
              key={b.label}
              style={{
                fontSize: "0.72rem",
                fontWeight: 600,
                padding: "5px 12px",
                borderRadius: 999,
                border: "1px solid var(--glass-border)",
                background: "rgba(255,255,255,0.02)",
                color: "var(--text-muted)",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: 999, background: b.color, display: "inline-block" }} />
              {b.label}
            </span>
          ))}
        </div>
        <div style={{ fontSize: "0.75rem", color: "var(--text-faint)" }}>
          DocSense AI — structured extraction from documents, powered by Gemini.
        </div>
      </div>
    </footer>
  );
}
