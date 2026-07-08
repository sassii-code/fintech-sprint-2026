import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

const MESSAGES = ["Analyzing document…", "Extracting fields…", "Formatting results…"];

export default function LoadingIndicator() {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setMsgIndex((i) => (i + 1) % MESSAGES.length), 1400);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="card fade-in"
      style={{
        padding: "48px 32px",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 18,
      }}
    >
      <Loader2 className="spin" size={30} color="var(--accent-3)" />
      <div style={{ fontWeight: 600, fontSize: "0.95rem", minHeight: "1.2em" }}>{MESSAGES[msgIndex]}</div>
      <div style={{ height: 5, width: 220, background: "var(--bg-inset)", borderRadius: 999, overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: "45%",
            background: "var(--accent-grad)",
            borderRadius: 999,
            animation: "loadingBar 1.3s ease-in-out infinite",
          }}
        />
      </div>
    </div>
  );
}
