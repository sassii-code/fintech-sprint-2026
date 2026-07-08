import { flattenObject, toCSV, downloadCSV } from "../csv";

const STATUS_STYLE = {
  queued: { label: "Queued", color: "var(--text-faint)" },
  processing: { label: "Processing…", color: "var(--accent-a)" },
  done: { label: "Done", color: "var(--success)" },
  error: { label: "Failed", color: "var(--danger)" },
};

export default function BatchResults({ items, running }) {
  if (items.length === 0) return null;

  const doneCount = items.filter((i) => i.status === "done" || i.status === "error").length;
  const successCount = items.filter((i) => i.status === "done").length;
  const pct = items.length ? Math.round((doneCount / items.length) * 100) : 0;

  function handleDownloadAll() {
    const rows = items
      .filter((i) => i.status === "done")
      .map((i) => ({ filename: i.file.name, doc_type: i.data.doc_type, ...flattenObject(i.data.extracted_data) }));
    downloadCSV("batch-extraction.csv", toCSV(rows));
  }

  return (
    <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
          {running ? `Processing ${doneCount}/${items.length}…` : `${successCount}/${items.length} extracted successfully`}
        </span>
        {!running && successCount > 0 && (
          <button className="btn btn-primary" style={{ padding: "6px 14px", fontSize: "0.78rem" }} onClick={handleDownloadAll}>
            Download CSV (all)
          </button>
        )}
      </div>

      <div style={{ height: 6, background: "var(--bg-inset)", borderRadius: 999, overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: "var(--accent-grad)",
            transition: "width 0.2s ease",
          }}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {items.map((item, i) => {
          const meta = STATUS_STYLE[item.status];
          return (
            <div
              key={`${item.file.name}-${i}`}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: "0.82rem",
                padding: "6px 10px",
                borderRadius: 6,
                background: "var(--bg-inset)",
              }}
            >
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: 12 }}>
                {item.file.name}
              </span>
              <span style={{ color: meta.color, fontWeight: 600, whiteSpace: "nowrap" }}>
                {item.status === "error" ? item.error : meta.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
