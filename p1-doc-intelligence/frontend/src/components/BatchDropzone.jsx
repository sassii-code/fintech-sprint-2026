import { useRef, useState } from "react";
import { UploadCloud, X, Files } from "lucide-react";
import { ACCEPT_ATTR, ACCEPTED_EXTENSIONS } from "../api";

function extensionOf(name) {
  const i = name.lastIndexOf(".");
  return i === -1 ? "" : name.slice(i).toLowerCase();
}

export default function BatchDropzone({ files, onFilesAdded, onRemove, onClear, disabled }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [rejected, setRejected] = useState(null);

  function addFiles(fileList) {
    const incoming = Array.from(fileList ?? []);
    if (incoming.length === 0) return;
    const valid = incoming.filter((f) => ACCEPTED_EXTENSIONS.includes(extensionOf(f.name)));
    const invalidCount = incoming.length - valid.length;
    setRejected(invalidCount > 0 ? `Skipped ${invalidCount} unsupported file(s)` : null);
    if (valid.length > 0) onFilesAdded(valid);
  }

  return (
    <div>
      <div
        className={`card card-hover ${!disabled && files.length === 0 ? "pulse-idle" : ""}`}
        onClick={() => !disabled && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!disabled) addFiles(e.dataTransfer.files);
        }}
        style={{
          padding: "40px 20px",
          textAlign: "center",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.6 : 1,
          borderStyle: "dashed",
          borderWidth: 1.5,
          borderColor: dragging ? "var(--accent-1)" : "var(--glass-border)",
          background: dragging ? "rgba(99, 102, 241, 0.08)" : "var(--glass)",
          transform: dragging ? "scale(1.015)" : "scale(1)",
          transition: "transform 0.2s var(--ease), border-color 0.2s var(--ease), background 0.2s var(--ease)",
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_ATTR}
          multiple
          hidden
          disabled={disabled}
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <div
          style={{
            width: 48,
            height: 48,
            margin: "0 auto 10px",
            borderRadius: 14,
            background: "rgba(99, 102, 241, 0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <UploadCloud size={24} color="var(--accent-3)" />
        </div>
        <div style={{ fontWeight: 600 }}>Drag & drop multiple files here</div>
        <div style={{ color: "var(--text-faint)", fontSize: "0.8rem", marginTop: 4 }}>
          or click to browse — PDF, JPG, PNG, DOCX, TXT
        </div>
      </div>

      {rejected && (
        <div style={{ color: "var(--danger)", fontSize: "0.8rem", marginTop: 8 }}>{rejected}</div>
      )}

      {files.length > 0 && (
        <div className="card fade-in" style={{ marginTop: 12, padding: 14, display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
              <Files size={13} /> {files.length} file(s) selected
            </span>
            {!disabled && (
              <button className="btn btn-ghost" style={{ padding: "2px 10px", fontSize: "0.72rem" }} onClick={onClear}>
                Clear all
              </button>
            )}
          </div>
          {files.map((f, i) => (
            <div
              key={`${f.name}-${i}`}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: "0.82rem",
                padding: "6px 4px",
              }}
            >
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
              {!disabled && (
                <button
                  onClick={() => onRemove(i)}
                  style={{ background: "none", border: "none", color: "var(--text-faint)", display: "flex" }}
                  aria-label={`Remove ${f.name}`}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
