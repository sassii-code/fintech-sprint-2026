import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Maximize2, Minimize2, ChevronsDownUp, ChevronsUpDown } from "lucide-react";

function JsonNode({ value, indent = 0 }) {
  const pad = "  ".repeat(indent);

  if (value === null || value === undefined) {
    return <span style={{ color: "var(--json-null)" }}>null</span>;
  }
  if (typeof value === "boolean") {
    return <span style={{ color: "var(--json-bool)" }}>{String(value)}</span>;
  }
  if (typeof value === "number") {
    return <span style={{ color: "var(--json-number)" }}>{value}</span>;
  }
  if (typeof value === "string") {
    return <span style={{ color: "var(--json-string)" }}>"{value}"</span>;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return <span style={{ color: "var(--json-punct)" }}>[]</span>;
    return (
      <>
        <span style={{ color: "var(--json-punct)" }}>[{"\n"}</span>
        {value.map((v, i) => (
          <span key={i}>
            {pad}
            {"  "}
            <JsonNode value={v} indent={indent + 1} />
            {i < value.length - 1 ? "," : ""}
            {"\n"}
          </span>
        ))}
        {pad}
        <span style={{ color: "var(--json-punct)" }}>]</span>
      </>
    );
  }
  if (typeof value === "object") {
    const keys = Object.keys(value);
    if (keys.length === 0) return <span style={{ color: "var(--json-punct)" }}>{"{}"}</span>;
    return (
      <>
        <span style={{ color: "var(--json-punct)" }}>{"{\n"}</span>
        {keys.map((k, i) => (
          <span key={k}>
            {pad}
            {"  "}
            <span style={{ color: "var(--json-key)" }}>"{k}"</span>
            <span style={{ color: "var(--json-punct)" }}>: </span>
            <JsonNode value={value[k]} indent={indent + 1} />
            {i < keys.length - 1 ? "," : ""}
            {"\n"}
          </span>
        ))}
        {pad}
        <span style={{ color: "var(--json-punct)" }}>{"}"}</span>
      </>
    );
  }
  return null;
}

export default function JsonView({ data, collapsedMaxHeight = 360 }) {
  const [expanded, setExpanded] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    if (!fullscreen) return;
    function onKey(e) {
      if (e.key === "Escape") setFullscreen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen]);

  const pre = (
    <pre
      style={{
        margin: 0,
        resize: fullscreen ? "none" : "both",
        overflowY: "auto",
        overflowX: "auto",
        whiteSpace: "pre-wrap",
        wordWrap: "break-word",
        overflowWrap: "break-word",
        maxHeight: fullscreen ? "none" : expanded ? "80vh" : collapsedMaxHeight,
        height: fullscreen ? "100%" : undefined,
        minWidth: 0,
        maxWidth: "100%",
        minHeight: 100,
        width: "100%",
        background: "var(--bg-inset)",
        border: "1px solid var(--glass-border)",
        borderRadius: 10,
        padding: 16,
        fontSize: "0.82rem",
        lineHeight: 1.65,
        boxSizing: "border-box",
      }}
    >
      <JsonNode value={data} />
    </pre>
  );

  const controls = (
    <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginBottom: 8 }}>
      {!fullscreen && (
        <button
          className="btn btn-ghost"
          style={{ padding: "4px 10px", fontSize: "0.72rem" }}
          onClick={() => setExpanded((e) => !e)}
        >
          {expanded ? <ChevronsDownUp size={13} /> : <ChevronsUpDown size={13} />}
          {expanded ? "Collapse" : "Expand"}
        </button>
      )}
      <button
        className="btn btn-ghost"
        style={{ padding: "4px 10px", fontSize: "0.72rem" }}
        onClick={() => setFullscreen((f) => !f)}
      >
        {fullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
        {fullscreen ? "Exit fullscreen" : "Fullscreen"}
      </button>
    </div>
  );

  if (fullscreen) {
    // Rendered via portal directly under <body> — an animated ancestor
    // (e.g. .slide-in) can leave a lingering CSS `transform`, which per spec
    // creates a containing block for `position: fixed` descendants and would
    // otherwise trap this overlay inside that ancestor's box instead of the
    // viewport.
    return createPortal(
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 100,
          background: "rgba(5, 7, 14, 0.88)",
          backdropFilter: "blur(8px)",
          padding: 28,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {controls}
        <div style={{ flex: 1, minHeight: 0 }}>{pre}</div>
      </div>,
      document.body
    );
  }

  return (
    <div>
      {controls}
      {pre}
      <div style={{ color: "var(--text-faint)", fontSize: "0.7rem", marginTop: 6, textAlign: "right" }}>
        Drag the bottom-right corner to resize
      </div>
    </div>
  );
}
