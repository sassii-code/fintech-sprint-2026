import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Search, AlertTriangle, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "../AuthContext";
import { listTransactions, getAnomalies, CATEGORIES } from "../api";
import CategoryBadge from "../components/CategoryBadge";
import Skeleton from "../components/Skeleton";

const PAGE_SIZE = 20;

export default function TransactionsPage() {
  const { token } = useAuth();
  const { selectedAccountId } = useOutletContext();

  const [transactions, setTransactions] = useState(null);
  const [anomalyIds, setAnomalyIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortKey, setSortKey] = useState("date");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.allSettled([
      listTransactions(token, { accountId: selectedAccountId, limit: 500 }),
      getAnomalies(token),
    ]).then(([txRes, anomRes]) => {
      if (cancelled) return;
      if (txRes.status === "fulfilled") setTransactions(txRes.value);
      else setError(txRes.reason?.message || "Could not load transactions");
      if (anomRes.status === "fulfilled") setAnomalyIds(new Set(anomRes.value.map((a) => a.id)));
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [token, selectedAccountId]);

  useEffect(() => setPage(1), [search, categoryFilter, dateFrom, dateTo, sortKey, sortDir]);

  const filtered = useMemo(() => {
    if (!transactions) return [];
    let rows = transactions;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter((t) => t.description.toLowerCase().includes(q) || (t.merchant || "").toLowerCase().includes(q));
    }
    if (categoryFilter) rows = rows.filter((t) => t.category === categoryFilter);
    if (dateFrom) rows = rows.filter((t) => t.date >= dateFrom);
    if (dateTo) rows = rows.filter((t) => t.date <= dateTo);

    rows = [...rows].sort((a, b) => {
      const mult = sortDir === "asc" ? 1 : -1;
      if (sortKey === "amount") return (a.amount - b.amount) * mult;
      return a.date.localeCompare(b.date) * mult;
    });
    return rows;
  }, [transactions, search, categoryFilter, dateFrom, dateTo, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function toggleSort(key) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="card fade-in" style={{ padding: 16, display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 220px", minWidth: 180 }}>
          <Search size={15} color="var(--text-faint)" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
          <input
            className="input"
            placeholder="Search description or merchant…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 34 }}
          />
        </div>
        <select className="input" style={{ width: "auto" }} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <input type="date" className="input" style={{ width: "auto" }} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        <span style={{ color: "var(--text-faint)", fontSize: "0.8rem" }}>to</span>
        <input type="date" className="input" style={{ width: "auto" }} value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
      </div>

      <div className="card fade-in" style={{ overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} height={40} />)}
          </div>
        ) : error ? (
          <div style={{ padding: 32, textAlign: "center", color: "var(--negative)" }}>{error}</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-faint)" }}>
            {transactions?.length === 0 ? "No transactions yet — upload a file to get started." : "No transactions match your filters."}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--glass-border)" }}>
                  <th style={{ textAlign: "left", padding: "12px 16px", cursor: "pointer", color: "var(--text-muted)" }} onClick={() => toggleSort("date")}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>Date <ArrowUpDown size={12} /></span>
                  </th>
                  <th style={{ textAlign: "left", padding: "12px 16px", color: "var(--text-muted)" }}>Description</th>
                  <th style={{ textAlign: "left", padding: "12px 16px", color: "var(--text-muted)" }}>Category</th>
                  <th style={{ textAlign: "right", padding: "12px 16px", cursor: "pointer", color: "var(--text-muted)" }} onClick={() => toggleSort("amount")}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>Amount <ArrowUpDown size={12} /></span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((t) => (
                  <tr key={t.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <td style={{ padding: "12px 16px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>{t.date}</td>
                    <td style={{ padding: "12px 16px", maxWidth: 320 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {anomalyIds.has(t.id) && (
                          <span title="Unusually large transaction" style={{ display: "inline-flex", flexShrink: 0 }}>
                            <AlertTriangle size={13} color="var(--warning)" />
                          </span>
                        )}
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{t.merchant || t.description}</span>
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px" }}><CategoryBadge category={t.category} /></td>
                    <td
                      style={{ padding: "12px 16px", textAlign: "right", fontWeight: 700, whiteSpace: "nowrap" }}
                      className={t.type === "income" ? "text-positive" : "text-negative"}
                    >
                      {t.type === "income" ? "+" : "-"}${Math.abs(t.amount).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderTop: "1px solid var(--glass-border)" }}>
            <span style={{ fontSize: "0.78rem", color: "var(--text-faint)" }}>
              {filtered.length} transaction{filtered.length !== 1 ? "s" : ""} — page {page} of {totalPages}
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              <button className="icon-btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="Previous page">
                <ChevronLeft size={16} />
              </button>
              <button className="icon-btn" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} aria-label="Next page">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
