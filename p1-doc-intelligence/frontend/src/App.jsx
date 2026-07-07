import { useCallback, useEffect, useState } from "react";
import { API_BASE_URL, extractDocument, getExtraction, getHistory } from "./api";
import LoginBar from "./components/LoginBar";
import Dropzone from "./components/Dropzone";
import DocTypeSelector from "./components/DocTypeSelector";
import ResultsView from "./components/ResultsView";
import HistoryPanel from "./components/HistoryPanel";

const TOKEN_KEY = "doc_intel_token";

function App() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));

  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState(null);
  const [docType, setDocType] = useState("auto");

  const [result, setResult] = useState(null);
  const [resultError, setResultError] = useState(null);
  const [extracting, setExtracting] = useState(false);

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
  }

  async function handleExtract() {
    if (!file || !token) return;
    setExtracting(true);
    setResultError(null);
    setResult(null);
    setSelectedId(null);
    try {
      const data = await extractDocument(docType, file, token);
      setResult(data);
      setSelectedId(data.id ?? null);
      loadHistory();
    } catch (err) {
      if (err.status === 401) {
        handleLogout();
        return;
      }
      setResultError(err.message);
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
    } finally {
      setExtracting(false);
    }
  }

  if (!token) {
    return <LoginBar onAuthenticated={handleAuthenticated} />;
  }

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto", padding: "32px 20px 60px" }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 28,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.4rem", margin: 0 }}>
            <span className="gradient-text">Document Intelligence</span>
          </h1>
          <div style={{ fontSize: "0.75rem", color: "var(--text-faint)", marginTop: 2 }}>
            {API_BASE_URL}
          </div>
        </div>
        <button className="btn btn-ghost" onClick={handleLogout}>
          Sign out
        </button>
      </header>

      <div className="layout-grid">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
            <DocTypeSelector value={docType} onChange={setDocType} />
            <Dropzone file={file} onFileSelected={handleFileSelected} />
            {fileError && <div style={{ color: "var(--danger)", fontSize: "0.85rem" }}>{fileError}</div>}
            <button
              className="btn btn-primary"
              disabled={!file || extracting}
              onClick={handleExtract}
              style={{ alignSelf: "flex-start" }}
            >
              {extracting ? "Extracting…" : "Extract document"}
            </button>
          </div>

          <ResultsView loading={extracting} error={resultError} result={result} />
        </div>

        <HistoryPanel
          items={history}
          loading={historyLoading}
          error={historyError}
          selectedId={selectedId}
          onSelect={handleSelectHistory}
          onRefresh={() => loadHistory()}
        />
      </div>
    </div>
  );
}

export default App;
