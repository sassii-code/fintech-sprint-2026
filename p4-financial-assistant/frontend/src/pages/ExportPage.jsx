import { useEffect, useState } from "react";
import { FileDown, CheckCircle2, Eye } from "lucide-react";
import { useAuth } from "../AuthContext";
import { useToast } from "../ToastContext";
import { listTransactions, exportAccounting, downloadBlob } from "../api";
import Skeleton from "../components/Skeleton";

const FORMATS = [
  { id: "quickbooks", label: "QuickBooks", description: "Date, Description, Amount, Category" },
  { id: "xero", label: "Xero", description: "Date, Amount, Payee, Description, Reference, Account Code" },
];

export default function ExportPage() {
  const { token } = useAuth();
  const toast = useToast();
  const [format, setFormat] = useState("quickbooks");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setPreviewLoading(true);
    listTransactions(token, { limit: 500 })
      .then((rows) => {
        if (cancelled) return;
        const filtered = rows.filter((r) => (!dateFrom || r.date >= dateFrom) && (!dateTo || r.date <= dateTo));
        setPreview({
          count: filtered.length,
          categories: [...new Set(filtered.map((r) => r.category).filter(Boolean))],
        });
      })
      .catch(() => !cancelled && setPreview({ count: 0, categories: [] }))
      .finally(() => !cancelled && setPreviewLoading(false));
    return () => {
      cancelled = true;
    };
  }, [token, dateFrom, dateTo]);

  async function handleDownload() {
    setDownloading(true);
    setDone(false);
    try {
      const blob = await exportAccounting(token, format, dateFrom || undefined, dateTo || undefined);
      downloadBlob(`transactions-${format}.csv`, blob);
      setDone(true);
      toast(`Exported ${preview?.count ?? 0} transactions as ${format}`, "success");
      setTimeout(() => setDone(false), 2500);
    } catch (err) {
      toast(`Export failed: ${err.message}`, "error", 5000);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="card fade-in" style={{ padding: 28, display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <div className="metric-label" style={{ marginBottom: 10 }}>Format</div>
          <div style={{ display: "flex", gap: 10 }}>
            {FORMATS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFormat(f.id)}
                className="card card-hover"
                style={{
                  flex: 1,
                  padding: 16,
                  textAlign: "left",
                  border: format === f.id ? "1px solid rgba(99,102,241,0.5)" : undefined,
                  background: format === f.id ? "rgba(99,102,241,0.1)" : undefined,
                }}
              >
                <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>{f.label}</div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-faint)", marginTop: 4 }}>{f.description}</div>
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div className="metric-label" style={{ marginBottom: 6 }}>From</div>
            <input type="date" className="input" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <div className="metric-label" style={{ marginBottom: 6 }}>To</div>
            <input type="date" className="input" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
        </div>

        <div style={{ background: "var(--bg-inset)", borderRadius: 12, padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
            <Eye size={13} color="var(--text-faint)" />
            <span style={{ fontSize: "0.72rem", color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Preview</span>
          </div>
          {previewLoading ? (
            <Skeleton height={40} />
          ) : (
            <>
              <div style={{ fontSize: "0.9rem", fontWeight: 700 }}>{preview.count} transaction{preview.count !== 1 ? "s" : ""} will be exported</div>
              {preview.categories.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                  {preview.categories.map((c) => (
                    <span key={c} className="badge" style={{ color: "var(--text-muted)", background: "rgba(255,255,255,0.05)", border: "1px solid var(--glass-border)" }}>
                      {c}
                    </span>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <button
          className="btn btn-primary"
          onClick={handleDownload}
          disabled={downloading || previewLoading || !preview?.count}
          style={{ alignSelf: "center", padding: "12px 32px" }}
        >
          {done ? <CheckCircle2 size={16} /> : <FileDown size={16} />}
          {downloading ? "Preparing…" : done ? "Downloaded!" : "Download CSV"}
        </button>
      </div>
    </div>
  );
}
