import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { LayoutGrid, Layers, Zap } from "lucide-react";
import { extractDocument, getExtraction, getHistory } from "./api";
import { useToast } from "./ToastContext";
import { useServerStatus } from "./useServerStatus";
import LoginBar from "./components/LoginBar";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Dropzone from "./components/Dropzone";
import BatchDropzone from "./components/BatchDropzone";
import DocTypeSelector from "./components/DocTypeSelector";
import CustomFieldsInput from "./components/CustomFieldsInput";
import Skeleton from "./components/Skeleton";

// Not needed for first paint (only render once an extraction exists / history
// loads), so they're split into their own chunks and fetched on demand.
const ResultsView = lazy(() => import("./components/ResultsView"));
const BatchResults = lazy(() => import("./components/BatchResults"));
const HistoryPanel = lazy(() => import("./components/HistoryPanel"));

const TOKEN_KEY = "doc_intel_token";

function PanelSkeleton({ height = 200 }) {
  return (
    <div className="card" style={{ padding: 20 }}>
      <Skeleton height={height} />
    </div>
  );
}

function App() {
  const toast = useToast();
  const serverStatus = useServerStatus();
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));

  const [mode, setMode] = useState("single"); // "single" | "batch"
  const [docType, setDocType] = useState("auto");
  const [customFields, setCustomFields] = useState("");

  // single-file flow
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState(null);
  const [result, setResult] = useState(null);
  const [resultError, setResultError] = useState(null);
  const [extracting, setExtracting] = useState(false);

  // batch flow
  const [batchFiles, setBatchFiles] = useState([]);
  const [batchItems, setBatchItems] = useState([]);
  const [batchRunning, setBatchRunning] = useState(false);

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  const loadHistory = useCallback(
    async (activeToken) => {
      const useToken = activeToken ?? token;
      if (!useToken) return;
      setHistoryLoading(true);
      setHistoryError(null);
      try {
        const items = await getHistory(useToken);
        setHistory(items);
      } catch (err) {
        if (err.status === 401) {
          handleLogout();
          return;
        }
        setHistoryError(err.message);
      } finally {
        setHistoryLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    if (token) loadHistory(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function handleAuthenticated(newToken) {
    localStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
    toast("Signed in successfully", "success");
  }

  function handleLogout() {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setHistory([]);
    setResult(null);
    setSelectedId(null);
  }

  function handleFileSelected(picked, error) {
    setFile(picked);
    setFileError(error);
    setResult(null);
    setResultError(null);
    if (error) toast(error, "error");
  }

  function requiresFields() {
    return docType === "custom" && customFields.trim().length === 0;
  }

  async function handleExtract() {
    if (!file || !token || requiresFields()) return;
    setExtracting(true);
    setResultError(null);
    setResult(null);
    setSelectedId(null);
    try {
      const data = await extractDocument(docType, file, token, customFields);
      setResult(data);
      setSelectedId(data.id ?? null);
      toast("Extraction complete", "success");
      loadHistory();
    } catch (err) {
      if (err.status === 401) {
        handleLogout();
        return;
      }
      setResultError(err.message);
      toast(`Extraction failed: ${err.message}`, "error", 5000);
    } finally {
      setExtracting(false);
    }
  }

  async function handleSelectHistory(id) {
    setSelectedId(id);
    setResultError(null);
    setExtracting(true);
    try {
      const data = await getExtraction(id, token);
      setResult(data);
    } catch (err) {
      setResultError(err.message);
      toast(err.message, "error");
    } finally {
      setExtracting(false);
    }
  }

  function handleBatchFilesAdded(newFiles) {
    setBatchFiles((prev) => [...prev, ...newFiles]);
  }

  function handleBatchRemove(index) {
    setBatchFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleBatchExtract() {
    if (batchFiles.length === 0 || !token || requiresFields()) return;
    setBatchRunning(true);
    const items = batchFiles.map((f) => ({ file: f, status: "queued", data: null, error: null }));
    setBatchItems(items);

    for (let i = 0; i < items.length; i++) {
      setBatchItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, status: "processing" } : it)));
      try {
        const data = await extractDocument(docType, items[i].file, token, customFields);
        setBatchItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, status: "done", data } : it)));
      } catch (err) {
        if (err.status === 401) {
          handleLogout();
          return;
        }
        setBatchItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, status: "error", error: err.message } : it)));
      }
    }

    setBatchRunning(false);
    toast("Batch extraction complete", "success");
    loadHistory();
  }

  if (!token) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <Header authenticated={false} serverStatus={serverStatus} />
        <div style={{ flex: 1 }}>
          <LoginBar onAuthenticated={handleAuthenticated} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header authenticated={!!token} onLogout={handleLogout} serverStatus={serverStatus} />

      <main style={{ flex: 1, maxWidth: 1180, margin: "0 auto", padding: "36px 20px 20px", width: "100%" }}>
        {/* ── hero / upload section ── */}
        <div className="fade-in" style={{ textAlign: "center", marginBottom: 28 }}>
          <h1 style={{ fontSize: "1.7rem", margin: "0 0 6px", fontWeight: 700 }}>
            Extract structured data from <span className="gradient-text">any document</span>
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.92rem", margin: 0 }}>
            Drop a file, pick a template or write your own fields, get clean JSON back.
          </p>
        </div>

        <div className="card fade-in" style={{ padding: 24, maxWidth: 760, margin: "0 auto 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <DocTypeSelector value={docType} onChange={setDocType} />
            <div style={{ display: "flex", gap: 6, background: "var(--bg-inset)", padding: 4, borderRadius: 10 }}>
              {[
                { id: "single", label: "Single", Icon: LayoutGrid },
                { id: "batch", label: "Batch", Icon: Layers },
              ].map(({ id, label, Icon }) => (
                <button
                  key={id}
                  className="btn"
                  onClick={() => setMode(id)}
                  style={{
                    padding: "6px 14px",
                    fontSize: "0.78rem",
                    background: mode === id ? "var(--accent-grad)" : "transparent",
                    color: mode === id ? "#fff" : "var(--text-muted)",
                    border: "none",
                    boxShadow: mode === id ? "0 4px 14px -4px rgba(99,102,241,0.5)" : "none",
                  }}
                >
                  <Icon size={13} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {docType === "custom" && <CustomFieldsInput value={customFields} onChange={setCustomFields} />}

          {mode === "single" ? (
            <>
              <Dropzone file={file} onFileSelected={handleFileSelected} />
              {fileError && <div style={{ color: "var(--danger)", fontSize: "0.85rem" }}>{fileError}</div>}
              <button
                className="btn btn-primary"
                disabled={!file || extracting || requiresFields()}
                onClick={handleExtract}
                style={{ alignSelf: "center", padding: "12px 32px" }}
              >
                <Zap size={16} />
                {extracting ? "Extracting…" : "Extract document"}
              </button>
            </>
          ) : (
            <>
              <BatchDropzone
                files={batchFiles}
                onFilesAdded={handleBatchFilesAdded}
                onRemove={handleBatchRemove}
                onClear={() => setBatchFiles([])}
                disabled={batchRunning}
              />
              <button
                className="btn btn-primary"
                disabled={batchFiles.length === 0 || batchRunning || requiresFields()}
                onClick={handleBatchExtract}
                style={{ alignSelf: "center", padding: "12px 32px" }}
              >
                <Zap size={16} />
                {batchRunning ? "Extracting…" : `Extract ${batchFiles.length || ""} document(s)`}
              </button>
            </>
          )}
        </div>

        {/* ── results + history ── */}
        <div className="layout-grid">
          <div>
            <Suspense fallback={<PanelSkeleton height={220} />}>
              {mode === "single" ? (
                <ResultsView loading={extracting} error={resultError} result={result} token={token} />
              ) : (
                <BatchResults items={batchItems} running={batchRunning} token={token} />
              )}
            </Suspense>
          </div>

          <Suspense fallback={<PanelSkeleton height={320} />}>
            <HistoryPanel
              items={history}
              loading={historyLoading}
              error={historyError}
              selectedId={selectedId}
              onSelect={handleSelectHistory}
              onRefresh={() => loadHistory()}
            />
          </Suspense>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default App;
