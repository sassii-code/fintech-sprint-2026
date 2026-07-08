import { useState } from "react";
import { FileText, Copy, Check, Download, Sheet, Hash, Clock } from "lucide-react";
import { flattenObject, toCSV, downloadCSV, downloadBlob } from "../csv";
import { exportToExcel } from "../api";
import { useToast } from "../ToastContext";
import JsonView from "./JsonView";
import LoadingIndicator from "./LoadingIndicator";

export default function ResultsView({ loading, error, result, token }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);

  if (loading) return <LoadingIndicator />;

  if (error) {
    return (
      <div
        className="card fade-in"
        style={{
          padding: 20,
          borderColor: "rgba(251, 113, 133, 0.35)",
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
      <div className="card" style={{ padding: 40, textAlign: "center", color: "var(--text-faint)" }}>
        <FileText size={26} style={{ opacity: 0.5, marginBottom: 10 }} />
        <div>No extraction yet — upload a document to see results here.</div>
      </div>
    );
  }

  const payload = result.extracted_data ?? result.preview ?? result;
  const dataObject = typeof payload === "object" && payload !== null ? payload : { value: payload };

  function handleCopy() {
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2)).then(() => {
      setCopied(true);
      toast("Copied JSON to clipboard", "success");
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function handleDownloadCSV() {
    const flat = flattenObject(dataObject);
    downloadCSV(`${result.filename || "extraction"}.csv`, toCSV([flat]));
    toast("CSV downloaded", "success");
  }

  async function handleDownloadExcel() {
    setExporting(true);
    try {
      const blob = await exportToExcel(
        [{ filename: result.filename || "extraction", doc_type: result.doc_type ?? null, extracted_data: dataObject }],
        token
      );
      downloadBlob(`${result.filename || "extraction"}.xlsx`, blob);
      toast("Excel file downloaded", "success");
    } catch (err) {
      toast(`Excel export failed: ${err.message}`, "error", 5000);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="split-view slide-in">
      {/* ── document info ── */}
      <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "rgba(139, 92, 246, 0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <FileText size={17} color="var(--accent-3)" />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, wordBreak: "break-word", fontSize: "0.92rem" }}>{result.filename}</div>
            {result.doc_type && (
              <span
                style={{
                  display: "inline-block",
                  marginTop: 6,
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  padding: "3px 9px",
                  borderRadius: 999,
                  border: "1px solid rgba(139, 92, 246, 0.3)",
                  background: "rgba(139, 92, 246, 0.1)",
                  color: "var(--accent-3)",
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                {result.doc_type.replace("_", " ")}
              </span>
            )}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: "0.78rem", color: "var(--text-muted)" }}>
          {result.char_count !== undefined ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Hash size={13} /> {result.char_count} characters extracted
            </div>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Hash size={13} /> Record #{result.id}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Clock size={13} /> {result.created_at ?? "just now"}
              </div>
            </>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
          <button className="btn btn-ghost" style={{ justifyContent: "flex-start", fontSize: "0.82rem" }} onClick={handleCopy}>
            {copied ? <Check size={15} color="var(--success)" /> : <Copy size={15} />}
            {copied ? "Copied!" : "Copy JSON"}
          </button>
          <button className="btn btn-ghost" style={{ justifyContent: "flex-start", fontSize: "0.82rem" }} onClick={handleDownloadCSV}>
            <Download size={15} />
            Download CSV
          </button>
          <button
            className="btn btn-ghost"
            style={{ justifyContent: "flex-start", fontSize: "0.82rem" }}
            onClick={handleDownloadExcel}
            disabled={exporting}
          >
            <Sheet size={15} />
            {exporting ? "Exporting…" : "Download Excel"}
          </button>
        </div>
      </div>

      {/* ── extracted JSON ── */}
      <div className="card" style={{ padding: 20 }}>
        <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>
          Extracted Data
        </div>
        <JsonView data={payload} />
      </div>
    </div>
  );
}
