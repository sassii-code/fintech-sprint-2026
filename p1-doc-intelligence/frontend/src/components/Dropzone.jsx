import { useRef, useState } from "react";

export default function Dropzone({ file, onFileSelected }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  function pick(files) {
    const picked = files?.[0];
    if (!picked) return;
    if (!picked.name.toLowerCase().endsWith(".pdf")) {
      onFileSelected(null, "Only PDF files are accepted");
      return;
    }
    onFileSelected(picked, null);
  }

  return (
    <div
      className="card"
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        pick(e.dataTransfer.files);
      }}
      style={{
        padding: "36px 20px",
        textAlign: "center",
        cursor: "pointer",
        borderStyle: "dashed",
        borderColor: dragging ? "var(--accent-a)" : "var(--border)",
        background: dragging ? "rgba(56, 189, 248, 0.06)" : "var(--bg-elevated)",
        transition: "border-color 0.15s ease, background 0.15s ease",
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        hidden
        onChange={(e) => pick(e.target.files)}
      />
      {file ? (
        <>
          <div style={{ fontSize: "1.6rem", marginBottom: 8 }}>📄</div>
          <div style={{ fontWeight: 600 }}>{file.name}</div>
          <div style={{ color: "var(--text-faint)", fontSize: "0.8rem", marginTop: 4 }}>
            {(file.size / 1024).toFixed(1)} KB — click or drop to replace
          </div>
        </>
      ) : (
        <>
          <div style={{ fontSize: "1.8rem", marginBottom: 8 }}>⬆️</div>
          <div style={{ fontWeight: 600 }}>Drag & drop a PDF here</div>
          <div style={{ color: "var(--text-faint)", fontSize: "0.8rem", marginTop: 4 }}>
            or click to browse
          </div>
        </>
      )}
    </div>
  );
}
