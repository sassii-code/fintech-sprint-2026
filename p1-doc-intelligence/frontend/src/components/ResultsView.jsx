import { useState } from "react";
import { flattenObject, toCSV, downloadCSV } from "../csv";

export default function ResultsView({ loading, error, result }) {
  const [copied, setCopied] = useState(false);

  if (loading) {
    return (
      <div className="card" style={{ padding: 32, textAlign: "center", color: "var(--text-muted)" }}>
        Extracting document…
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="card"
        style={{
          padding: 20,
          borderColor: "rgba(248, 113, 113, 0.35)",
          background: "var(--danger-bg)",
          color: "var(--danger)",
        }}
      >
        <strong>Extraction failed:</strong> {error}
      </div>
    );
  }

  if (!result) {
    return (
      <div className="card" style={{ padding: 32, textAlign: "center", color: "var(--text-faint)" }}>
        No extraction yet — upload a document to see results here.
      </div>
    );
  }

  const payload = result.extracted_data ?? result.preview ?? result;

  function handleCopy() {
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function handleDownloadCSV() {
    const flat = flattenObject(typeof payload === "object" ? payload : { value: payload });
    downloadCSV(`${result.filename || "extraction"}.csv`, toCSV([flat]));
  }

  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <div>
          <div style={{ fontWeight: 600 }}>{result.filename}</div>
          {result.char_count !== undefined ? (
            <div style={{ color: "var(--text-faint)", fontSize: "0.8rem" }}>
              {result.char_count} characters extracted
            </div>
          ) : (
            <div style={{ color: "var(--text-faint)", fontSize: "0.8rem" }}>
              #{result.id} · {result.created_at ?? "just now"}
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {result.doc_type && (
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 600,
                padding: "4px 10px",
                borderRadius: 999,
                border: "1px solid var(--border)",
                color: "var(--accent-a)",
                textTransform: "uppercase",
                letterSpacing: 0.4,
              }}
            >
              {result.doc_type.replace("_", " ")}
            </span>
          )}
          <button className="btn btn-ghost" style={{ padding: "6px 12px", fontSize: "0.78rem" }} onClick={handleCopy}>
            {copied ? "Copied ✓" : "Copy JSON"}
          </button>
          <button className="btn btn-ghost" style={{ padding: "6px 12px", fontSize: "0.78rem" }} onClick={handleDownloadCSV}>
            Download CSV
          </button>
        </div>
      </div>
      <pre
        style={{
          margin: 0,
          background: "var(--bg-inset)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: 16,
          overflowX: "auto",
          fontSize: "0.82rem",
          lineHeight: 1.5,
          color: "#c7d2fe",
        }}
      >
        {JSON.stringify(payload, null, 2)}
      </pre>
    </div>
  );
}
