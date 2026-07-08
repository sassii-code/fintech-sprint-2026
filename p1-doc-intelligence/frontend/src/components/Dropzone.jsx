import { useRef, useState } from "react";
import { UploadCloud, FileText, Image, FileType2 } from "lucide-react";
import { ACCEPT_ATTR, ACCEPTED_EXTENSIONS } from "../api";

function extensionOf(name) {
  const i = name.lastIndexOf(".");
  return i === -1 ? "" : name.slice(i).toLowerCase();
}

function IconFor({ name }) {
  const ext = extensionOf(name);
  if ([".jpg", ".jpeg", ".png"].includes(ext)) return <Image size={26} color="var(--accent-3)" />;
  if (ext === ".docx" || ext === ".txt") return <FileType2 size={26} color="var(--accent-3)" />;
  return <FileText size={26} color="var(--accent-3)" />;
}

export default function Dropzone({ file, onFileSelected }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  function pick(files) {
    const picked = files?.[0];
    if (!picked) return;
    if (!ACCEPTED_EXTENSIONS.includes(extensionOf(picked.name))) {
      onFileSelected(null, `Unsupported file type. Accepted: ${ACCEPTED_EXTENSIONS.join(", ")}`);
      return;
    }
    onFileSelected(picked, null);
  }

  return (
    <div
      className={`card card-hover ${!file && !dragging ? "pulse-idle" : ""}`}
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
        padding: "44px 20px",
        textAlign: "center",
        cursor: "pointer",
        borderStyle: "dashed",
        borderWidth: 1.5,
        borderColor: dragging ? "var(--accent-1)" : "var(--glass-border)",
        background: dragging ? "rgba(99, 102, 241, 0.08)" : "var(--glass)",
        transform: dragging ? "scale(1.015)" : "scale(1)",
      }}
    >
      <input ref={inputRef} type="file" accept={ACCEPT_ATTR} hidden onChange={(e) => pick(e.target.files)} />
      {file ? (
        <>
          <div
            style={{
              width: 52,
              height: 52,
              margin: "0 auto 12px",
              borderRadius: 14,
              background: "rgba(139, 92, 246, 0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <IconFor name={file.name} />
          </div>
          <div style={{ fontWeight: 600 }}>{file.name}</div>
          <div style={{ color: "var(--text-faint)", fontSize: "0.8rem", marginTop: 4 }}>
            {(file.size / 1024).toFixed(1)} KB — click or drop to replace
          </div>
        </>
      ) : (
        <>
          <div
            style={{
              width: 52,
              height: 52,
              margin: "0 auto 12px",
              borderRadius: 14,
              background: "rgba(99, 102, 241, 0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "transform 0.25s var(--ease)",
              transform: dragging ? "translateY(-3px) scale(1.08)" : "none",
            }}
          >
            <UploadCloud size={26} color="var(--accent-3)" />
          </div>
          <div style={{ fontWeight: 600 }}>{dragging ? "Drop it here" : "Drag & drop a file here"}</div>
          <div style={{ color: "var(--text-faint)", fontSize: "0.8rem", marginTop: 4 }}>
            or click to browse — PDF, JPG, PNG, DOCX, TXT
          </div>
        </>
      )}
    </div>
  );
}
