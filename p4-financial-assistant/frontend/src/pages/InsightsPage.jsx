import { useEffect, useRef, useState } from "react";
import { Send, Sparkles, User, BarChart3 } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Cell } from "recharts";
import { useAuth } from "../AuthContext";
import { queryInsights, CATEGORY_COLORS, friendlyErrorMessage } from "../api";

const SUGGESTED_QUESTIONS = [
  "What's my biggest expense category?",
  "Am I overspending on subscriptions?",
  "How much did I spend last month?",
  "What's my savings rate?",
];

const TYPING_MS_PER_CHAR = 12;

function AnswerText({ text }) {
  const [shown, setShown] = useState("");

  useEffect(() => {
    setShown("");
    let i = 0;
    const id = setInterval(() => {
      i += 3;
      setShown(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, TYPING_MS_PER_CHAR);
    return () => clearInterval(id);
  }, [text]);

  return <p style={{ margin: 0, lineHeight: 1.6, whiteSpace: "pre-wrap", overflowWrap: "break-word" }}>{shown}</p>;
}

function InlineChart({ dataUsed }) {
  const categories = dataUsed?.spending_by_category;
  if (!categories || categories.length === 0) return null;
  const top = categories.slice(0, 5);

  return (
    <div style={{ marginTop: 12, height: 140 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
        <BarChart3 size={12} color="var(--text-faint)" />
        <span style={{ fontSize: "0.7rem", color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
          Spending by category
        </span>
      </div>
      <ResponsiveContainer width="100%" height={110}>
        <BarChart data={top} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="category" tick={{ fontSize: 10, fill: "var(--text-faint)" }} axisLine={false} tickLine={false} width={90} />
          <Bar dataKey="total" radius={[0, 6, 6, 0]} isAnimationActive animationDuration={700}>
            {top.map((c) => <Cell key={c.category} fill={CATEGORY_COLORS[c.category] || "#94a3b8"} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function InsightsPage() {
  const { token } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  async function ask(question) {
    if (!question.trim() || thinking) return;
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setInput("");
    setThinking(true);
    try {
      const result = await queryInsights(question, token);
      setMessages((prev) => [...prev, { role: "assistant", content: result.answer, dataUsed: result.data_used }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: "assistant", content: friendlyErrorMessage(err), error: true }]);
    } finally {
      setThinking(false);
    }
  }

  return (
    <div className="card fade-in" style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 140px)", overflow: "hidden" }}>
      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
        {messages.length === 0 && (
          <div style={{ margin: "auto", textAlign: "center", maxWidth: 420 }}>
            <div
              style={{
                width: 52,
                height: 52,
                margin: "0 auto 16px",
                borderRadius: 16,
                background: "var(--accent-grad)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 8px 24px -8px rgba(99,102,241,0.6)",
              }}
            >
              <Sparkles size={24} color="#fff" />
            </div>
            <h2 style={{ fontSize: "1.1rem", margin: "0 0 6px" }}>Ask about your finances</h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", margin: "0 0 20px" }}>
              I can only answer from your actual uploaded transactions — no guessing.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
              {SUGGESTED_QUESTIONS.map((q) => (
                <button key={q} className="btn btn-ghost" style={{ fontSize: "0.78rem", padding: "8px 14px" }} onClick={() => ask(q)}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", flexDirection: m.role === "user" ? "row-reverse" : "row" }}>
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: "50%",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: m.role === "user" ? "rgba(255,255,255,0.08)" : "var(--accent-grad)",
              }}
            >
              {m.role === "user" ? <User size={14} /> : <Sparkles size={14} color="#fff" />}
            </div>
            <div
              className="card"
              style={{
                padding: "12px 16px",
                maxWidth: "78%",
                minWidth: 0,
                fontSize: "0.88rem",
                background: m.role === "user" ? "rgba(99,102,241,0.1)" : "var(--glass)",
                borderColor: m.error ? "rgba(251,113,133,0.35)" : undefined,
                overflowWrap: "break-word",
              }}
            >
              {m.role === "assistant" ? <AnswerText text={m.content} /> : <p style={{ margin: 0 }}>{m.content}</p>}
              {m.role === "assistant" && !m.error && <InlineChart dataUsed={m.dataUsed} />}
            </div>
          </div>
        ))}

        {thinking && (
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--accent-grad)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Sparkles size={14} color="#fff" />
            </div>
            <div className="card" style={{ padding: "12px 16px" }}>
              <div className="thinking-dots"><span /><span /><span /></div>
            </div>
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
        style={{ display: "flex", gap: 10, padding: 16, borderTop: "1px solid var(--glass-border)" }}
      >
        <input
          className="input"
          placeholder="Ask a question about your transactions…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={thinking}
        />
        <button className="btn btn-primary" type="submit" disabled={thinking || !input.trim()} style={{ flexShrink: 0 }}>
          <Send size={15} />
        </button>
      </form>
    </div>
  );
}
