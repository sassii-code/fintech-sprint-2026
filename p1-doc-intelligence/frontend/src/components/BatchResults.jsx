import { useState } from "react";
import { Download, Sheet, CheckCircle2, XCircle, Loader2, Clock } from "lucide-react";
import { flattenObject, toCSV, downloadCSV, downloadBlob } from "../csv";
import { exportToExcel } from "../api";
import { useToast } from "../ToastContext";

const STATUS_META = {
  queued: { label: "Queued", color: "var(--text-faint)", Icon: Clock },
  processing: { label: "Processing…", color: "var(--accent-3)", Icon: Loader2, spin: true },
  done: { label: "Done", color: "var(--success)", Icon: CheckCircle2 },
  error: { label: "Failed", color: "var(--danger)", Icon: XCircle },
};

export default function BatchResults({ items, running }) {
  const toast = useToast();
  const [exporting, setExporting] = useState(false);

  if (items.length === 0) return null;

  const doneCount = items.filter((i) => i.status === "done" || i.status === "error").length;
  const successCount = items.filter((i) => i.status === "done").length;
  const pct = items.length ? Math.round((doneCount / items.length) * 100) : 0;

  function handleDownloadCSV() {
    const rows = items
      .filter((i) => i.status === "done")
      .map((i) => ({ filename: i.file.name, doc_type: i.data.doc_type, ...flattenObject(i.data.extracted_data) }));
    downloadCSV("batch-extraction.csv", toCSV(rows));
    toast("CSV downloaded", "success");
  }

  async function handleDownloadExcel() {
    setExporting(true);
    try {
      const records = items
        .filter((i) => i.status === "done")
        .map((i) => ({ filename: i.file.name, doc_type: i.data.doc_type ?? null, extracted_data: i.data.extracted_data }));
      const blob = await exportToExcel(records);
      downloadBlob("batch-extraction.xlsx", blob);
      toast("Excel file downloaded", "success");
    } catch (err) {
      toast(`Excel export failed: ${err.message}`, "error", 5000);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="card slide-in" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
          {running ? `Processing ${doneCount}/${items.length}…` : `${successCount}/${items.length} extracted successfully`}
        </span>
        {!running && successCount > 0 && (
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-ghost" style={{ padding: "6px 14px", fontSize: "0.78rem" }} onClick={handleDownloadCSV}>
              <Download size={14} />
              CSV (all)
            </button>
            <button
              className="btn btn-primary"
              style={{ padding: "6px 14px", fontSize: "0.78rem" }}
              onClick={handleDownloadExcel}
              disabled={exporting}
            >
              <Sheet size={14} />
              {exporting ? "Exporting…" : "Excel (all)"}
            </button>
          </div>
        )}
      </div>

      <div style={{ height: 6, background: "var(--bg-inset)", borderRadius: 999, overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: "var(--accent-grad)",
            borderRadius: 999,
            transition: "width 0.3s var(--ease)",
          }}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {items.map((item, i) => {
          const meta = STATUS_META[item.status];
          const Icon = meta.Icon;
          return (
            <div
              key={`${item.file.name}-${i}`}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: "0.82rem",
                padding: "8px 12px",
                borderRadius: 8,
                background: "var(--bg-inset)",
              }}
            >
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: 12 }}>
                {item.file.name}
              </span>
              <span style={{ color: meta.color, fontWeight: 600, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6 }}>
                <Icon size={13} className={meta.spin ? "spin" : ""} />
                {item.status === "error" ? item.error : meta.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
