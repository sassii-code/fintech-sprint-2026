import { useEffect, useMemo, useState } from "react";
import { Repeat, Calendar, ArrowDownAZ, DollarSign } from "lucide-react";
import { useAuth } from "../AuthContext";
import { getRecurring, friendlyErrorMessage } from "../api";
import Skeleton from "../components/Skeleton";

const FREQUENCY_LABEL = { weekly: "Weekly", monthly: "Monthly", yearly: "Yearly" };
const FREQUENCY_COLOR = { weekly: "#38bdf8", monthly: "#a78bfa", yearly: "#f59e0b" };

export default function SubscriptionsPage() {
  const { token } = useAuth();
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState("amount");

  useEffect(() => {
    let cancelled = false;
    getRecurring(token)
      .then((data) => !cancelled && setItems(data))
      .catch((err) => !cancelled && setError(err));
    return () => {
      cancelled = true;
    };
  }, [token]);

  const expenses = useMemo(() => (items ?? []).filter((i) => i.type === "expense"), [items]);

  const monthlyTotal = useMemo(() => {
    return expenses.reduce((sum, i) => {
      const amt = Math.abs(i.amount);
      if (i.frequency === "monthly") return sum + amt;
      if (i.frequency === "weekly") return sum + amt * 4.33;
      if (i.frequency === "yearly") return sum + amt / 12;
      return sum;
    }, 0);
  }, [expenses]);

  const sorted = useMemo(() => {
    const rows = [...expenses];
    if (sortBy === "amount") rows.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
    else rows.sort((a, b) => a.next_expected_date.localeCompare(b.next_expected_date));
    return rows;
  }, [expenses, sortBy]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="card card-glow-accent fade-in" style={{ padding: 24, display: "flex", alignItems: "center", gap: 18 }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: "var(--accent-grad)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Repeat size={22} color="#fff" />
        </div>
        <div>
          <div className="metric-label">Estimated Monthly Subscription Spend</div>
          {items === null && !error ? (
            <Skeleton height={28} width={120} style={{ marginTop: 6 }} />
          ) : (
            <div className="metric-value">${monthlyTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
          )}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button className="btn btn-ghost" style={{ fontSize: "0.78rem", padding: "6px 14px", background: sortBy === "amount" ? "rgba(99,102,241,0.14)" : undefined }} onClick={() => setSortBy("amount")}>
          <DollarSign size={13} /> Amount
        </button>
        <button className="btn btn-ghost" style={{ fontSize: "0.78rem", padding: "6px 14px", background: sortBy === "date" ? "rgba(99,102,241,0.14)" : undefined }} onClick={() => setSortBy("date")}>
          <ArrowDownAZ size={13} /> Next charge
        </button>
      </div>

      {items === null && !error ? (
        <div className="grid grid-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="card" style={{ padding: 20 }}><Skeleton height={90} /></div>)}
        </div>
      ) : error ? (
        <div className="card" style={{ padding: 32, textAlign: "center", color: "var(--negative)" }}>{friendlyErrorMessage(error)}</div>
      ) : sorted.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: "center", color: "var(--text-faint)" }}>
          No recurring subscriptions detected yet. Upload more transaction history to help detect patterns.
        </div>
      ) : (
        <div className="grid grid-3">
          {sorted.map((item, i) => (
            <div key={`${item.merchant}-${i}`} className="card card-hover fade-in" style={{ padding: 20, "--delay": `${i * 50}ms` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: "rgba(139, 92, 246, 0.12)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: "0.95rem",
                    color: "var(--accent-3)",
                    flexShrink: 0,
                  }}
                >
                  {item.merchant.slice(0, 1).toUpperCase()}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.merchant}</div>
                  <span
                    className="badge"
                    style={{
                      marginTop: 3,
                      color: FREQUENCY_COLOR[item.frequency],
                      background: `${FREQUENCY_COLOR[item.frequency]}1a`,
                      border: `1px solid ${FREQUENCY_COLOR[item.frequency]}40`,
                    }}
                  >
                    {FREQUENCY_LABEL[item.frequency]}
                  </span>
                </div>
              </div>
              <div className="metric-value" style={{ fontSize: "1.4rem" }}>${Math.abs(item.amount).toLocaleString()}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, fontSize: "0.78rem", color: "var(--text-faint)" }}>
                <Calendar size={12} /> Next: {item.next_expected_date}
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-faint)", marginTop: 4 }}>
                {item.occurrence_count} charges · ${Math.abs(item.total_spent_lifetime).toLocaleString()} lifetime
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
