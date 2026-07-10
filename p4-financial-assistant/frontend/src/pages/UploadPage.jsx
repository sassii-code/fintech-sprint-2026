import { useRef, useState } from "react";
import { UploadCloud, FileSpreadsheet, CheckCircle2 } from "lucide-react";
import { useAuth } from "../AuthContext";
import { useToast } from "../ToastContext";
import { uploadTransactions } from "../api";

const ACCEPT_ATTR = ".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const ACCEPTED_EXT = [".csv", ".xlsx", ".xls"];

function extensionOf(name) {
  const i = name.lastIndexOf(".");
  return i === -1 ? "" : name.slice(i).toLowerCase();
}

export default function UploadPage() {
  const { token } = useAuth();
  const toast = useToast();
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState(null);
  const [accountName, setAccountName] = useState("Default Account");
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);

  function pick(files) {
    const picked = files?.[0];
    if (!picked) return;
    if (!ACCEPTED_EXT.includes(extensionOf(picked.name))) {
      setFileError(`Unsupported file type. Accepted: ${ACCEPTED_EXT.join(", ")}`);
      setFile(null);
      return;
    }
    setFileError(null);
    setFile(picked);
    setResult(null);
  }

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setProgress(0);
    setResult(null);
    try {
      const data = await uploadTransactions(file, accountName, token, setProgress);
      setResult(data);
      const categoryCount = new Set(data.transactions.map((t) => t.category)).size;
      toast(`${data.uploaded_count} transactions processed, ${categoryCount} categories detected`, "success", 5000);
    } catch (err) {
      toast(`Upload failed: ${err.message}`, "error", 6000);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="card fade-in" style={{ padding: 28, display: "flex", flexDirection: "column", gap: 18 }}>
        <div>
          <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Account name
          </label>
          <input
            className="input"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            style={{ marginTop: 6 }}
            disabled={uploading}
          />
        </div>

        <div
          className={`card card-hover ${!file && !dragging ? "pulse-idle" : ""}`}
          onClick={() => !uploading && inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            if (!uploading) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (!uploading) pick(e.dataTransfer.files);
          }}
          style={{
            padding: "48px 20px",
            textAlign: "center",
            cursor: uploading ? "not-allowed" : "pointer",
            opacity: uploading ? 0.7 : 1,
            borderStyle: "dashed",
            borderWidth: 1.5,
            borderColor: dragging ? "var(--accent-1)" : "var(--glass-border)",
            background: dragging ? "rgba(99, 102, 241, 0.08)" : "var(--glass)",
            transform: dragging ? "scale(1.015)" : "scale(1)",
            transition: "transform 0.2s var(--ease), border-color 0.2s var(--ease), background 0.2s var(--ease)",
          }}
        >
          <input ref={inputRef} type="file" accept={ACCEPT_ATTR} hidden onChange={(e) => pick(e.target.files)} disabled={uploading} />
          <div
            style={{
              width: 56,
              height: 56,
              margin: "0 auto 14px",
              borderRadius: 16,
              background: "rgba(99, 102, 241, 0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {file ? <FileSpreadsheet size={26} color="var(--accent-3)" /> : <UploadCloud size={26} color="var(--accent-3)" />}
          </div>
          {file ? (
            <>
              <div style={{ fontWeight: 700 }}>{file.name}</div>
              <div style={{ color: "var(--text-faint)", fontSize: "0.8rem", marginTop: 4 }}>
                {(file.size / 1024).toFixed(1)} KB — click or drop to replace
              </div>
            </>
          ) : (
            <>
              <div style={{ fontWeight: 700 }}>{dragging ? "Drop it here" : "Drag & drop your transactions file"}</div>
              <div style={{ color: "var(--text-faint)", fontSize: "0.8rem", marginTop: 4 }}>
                or click to browse — CSV, XLSX, XLS
              </div>
            </>
          )}
        </div>

        {fileError && <div style={{ color: "var(--negative)", fontSize: "0.85rem" }}>{fileError}</div>}

        {uploading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", color: "var(--text-muted)" }}>
              <span>Uploading & categorizing…</span>
              <span>{progress}%</span>
            </div>
            <div style={{ height: 6, background: "var(--bg-inset)", borderRadius: 999, overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  width: `${progress}%`,
                  background: "var(--accent-grad)",
                  borderRadius: 999,
                  transition: "width 0.2s var(--ease)",
                }}
              />
            </div>
          </div>
        )}

        <button className="btn btn-primary" disabled={!file || uploading} onClick={handleUpload} style={{ alignSelf: "center", padding: "12px 32px" }}>
          {uploading ? "Processing…" : "Upload & Categorize"}
        </button>
      </div>

      {result && (
        <div className="card card-glow-positive fade-in" style={{ padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <CheckCircle2 size={20} color="var(--positive)" />
            <span style={{ fontWeight: 700 }}>
              {result.uploaded_count} transactions processed into "{result.account_name}"
            </span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {[...new Set(result.transactions.map((t) => t.category))].map((c) => (
              <span key={c} className="badge" style={{ color: "var(--text-muted)", background: "rgba(255,255,255,0.05)", border: "1px solid var(--glass-border)" }}>
                {c}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
