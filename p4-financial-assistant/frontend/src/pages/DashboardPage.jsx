import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Legend,
} from "recharts";
import { Wallet, TrendingDown, PiggyBank, Percent, Sparkles, AlertTriangle } from "lucide-react";
import { useAuth } from "../AuthContext";
import {
  getHealthScore, incomeVsExpenses, monthlyTrends, spendingByCategory,
  listTransactions, CATEGORY_COLORS, friendlyErrorMessage,
} from "../api";
import HealthGauge from "../components/HealthGauge";
import StatCard from "../components/StatCard";
import CategoryBadge from "../components/CategoryBadge";
import Skeleton from "../components/Skeleton";

function EmptyState({ message }) {
  return (
    <div style={{ padding: 40, textAlign: "center", color: "var(--text-faint)" }}>
      <div style={{ fontSize: "0.85rem" }}>{message}</div>
    </div>
  );
}

export default function DashboardPage() {
  const { token } = useAuth();
  const { selectedAccountId } = useOutletContext();

  const [health, setHealth] = useState(null);
  const [healthError, setHealthError] = useState(null);
  const [totals, setTotals] = useState(null);
  const [trends, setTrends] = useState(null);
  const [categories, setCategories] = useState(null);
  const [recent, setRecent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setHealthError(null);

    Promise.allSettled([
      getHealthScore(token),
      incomeVsExpenses(token),
      monthlyTrends(token),
      spendingByCategory(token),
      listTransactions(token, { accountId: selectedAccountId, limit: 8 }),
    ]).then(([healthRes, totalsRes, trendsRes, catRes, recentRes]) => {
      if (cancelled) return;
      if (healthRes.status === "fulfilled") setHealth(healthRes.value);
      else setHealthError(healthRes.reason);
      if (totalsRes.status === "fulfilled") setTotals(totalsRes.value);
      if (trendsRes.status === "fulfilled") setTrends(trendsRes.value);
      if (catRes.status === "fulfilled") setCategories(catRes.value);
      if (recentRes.status === "fulfilled") setRecent(recentRes.value);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [token, selectedAccountId]);

  const incomeSpark = trends?.map((t) => ({ value: t.income })) ?? [];
  const expenseSpark = trends?.map((t) => ({ value: t.expenses })) ?? [];
  const netSpark = trends?.map((t) => ({ value: t.net })) ?? [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* ── hero: health score ── */}
      <div className="card fade-in" style={{ padding: 28, display: "flex", alignItems: "center", gap: 28, flexWrap: "wrap" }}>
        {loading ? (
          <Skeleton height={160} width={160} radius="50%" />
        ) : healthError ? (
          <div style={{ width: 160, height: 160, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {healthError.status === 404 ? (
              <Sparkles size={28} color="var(--text-faint)" />
            ) : (
              <AlertTriangle size={28} color="var(--negative)" />
            )}
          </div>
        ) : (
          <HealthGauge score={health?.score ?? 0} size={160} />
        )}
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Sparkles size={15} color="var(--accent-3)" />
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--accent-3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Financial Health
            </span>
          </div>
          {loading ? (
            <>
              <Skeleton height={14} style={{ marginBottom: 8 }} />
              <Skeleton height={14} width="80%" />
            </>
          ) : healthError ? (
            <div style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>
              {healthError.status === 404
                ? "Upload some transactions to see your health score."
                : friendlyErrorMessage(healthError)}
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: "0.92rem", lineHeight: 1.6, color: "var(--text-muted)" }}>{health?.explanation}</p>
          )}
        </div>
      </div>

      {/* ── key metrics ── */}
      <div className="grid grid-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <div key={i} className="card" style={{ padding: 20 }}><Skeleton height={70} /></div>)
        ) : (
          <>
            <StatCard label="Total Income" value={totals?.total_income ?? 0} format="currency" positive trend={incomeSpark} icon={Wallet} delay={0} />
            <StatCard label="Total Expenses" value={Math.abs(totals?.total_expenses ?? 0)} format="currency" positive={false} trend={expenseSpark} icon={TrendingDown} delay={60} />
            <StatCard label="Net Savings" value={totals?.net ?? 0} format="currency" positive={(totals?.net ?? 0) >= 0} trend={netSpark} icon={PiggyBank} delay={120} />
            <StatCard label="Savings Rate" value={(totals?.savings_rate ?? 0) * 100} format="percent" positive={(totals?.savings_rate ?? 0) >= 0} icon={Percent} delay={180} />
          </>
        )}
      </div>

      {/* ── charts ── */}
      <div className="grid grid-2">
        <div className="card fade-in" style={{ padding: 24, "--delay": "220ms" }}>
          <h2 style={{ fontSize: "0.95rem", margin: "0 0 16px", fontWeight: 700 }}>Spending by Category</h2>
          {loading ? (
            <Skeleton height={240} />
          ) : !categories || categories.filter((c) => Math.abs(c.total) > 0).length === 0 ? (
            <EmptyState message="No expense data yet." />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={categories.filter((c) => Math.abs(c.total) > 0).map((c) => ({ ...c, total: Math.abs(c.total) }))}
                  dataKey="total"
                  nameKey="category"
                  innerRadius={62}
                  outerRadius={92}
                  paddingAngle={2}
                  isAnimationActive
                  animationDuration={800}
                >
                  {categories.filter((c) => Math.abs(c.total) > 0).map((c) => (
                    <Cell key={c.category} fill={CATEGORY_COLORS[c.category] || "#94a3b8"} stroke="var(--bg-elevated)" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "#10151d", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, fontSize: "0.8rem" }}
                  formatter={(value, name) => [`$${Number(value).toLocaleString()}`, name]}
                />
                <Legend wrapperStyle={{ fontSize: "0.72rem" }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card fade-in" style={{ padding: 24, "--delay": "260ms" }}>
          <h2 style={{ fontSize: "0.95rem", margin: "0 0 16px", fontWeight: 700 }}>Monthly Income vs Expenses</h2>
          {loading ? (
            <Skeleton height={240} />
          ) : !trends || trends.length === 0 ? (
            <EmptyState message="No monthly data yet." />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={trends} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--text-faint)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--text-faint)" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "#10151d", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, fontSize: "0.8rem" }}
                  formatter={(value) => `$${Number(value).toLocaleString()}`}
                />
                <Legend wrapperStyle={{ fontSize: "0.72rem" }} />
                <Line type="monotone" dataKey="income" stroke="var(--positive)" strokeWidth={2.2} dot={{ r: 3 }} isAnimationActive animationDuration={900} name="Income" />
                <Line type="monotone" dataKey="expenses" stroke="var(--negative)" strokeWidth={2.2} dot={{ r: 3 }} isAnimationActive animationDuration={900} name="Expenses" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── recent transactions ── */}
      <div className="card fade-in" style={{ padding: 24, "--delay": "300ms" }}>
        <h2 style={{ fontSize: "0.95rem", margin: "0 0 16px", fontWeight: 700 }}>Recent Transactions</h2>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} height={44} />)}
          </div>
        ) : !recent || recent.length === 0 ? (
          <EmptyState message="No transactions yet — head to Upload to get started." />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {recent.map((t) => (
              <div
                key={t.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 8px",
                  borderRadius: 10,
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: CATEGORY_COLORS[t.category] || "var(--text-faint)",
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: "0.85rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {t.merchant || t.description}
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-faint)" }}>{t.date}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                  <CategoryBadge category={t.category} />
                  <span className={t.type === "income" ? "text-positive" : "text-negative"} style={{ fontWeight: 700, fontSize: "0.85rem", minWidth: 70, textAlign: "right" }}>
                    {t.type === "income" ? "+" : "-"}${Math.abs(t.amount).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
