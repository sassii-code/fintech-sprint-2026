import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { useAuth } from "../AuthContext";
import { listAccounts } from "../api";

const PAGE_TITLES = {
  "/": "Dashboard",
  "/upload": "Upload Transactions",
  "/transactions": "Transactions",
  "/insights": "AI Insights",
  "/subscriptions": "Subscriptions",
  "/health-score": "Financial Health Score",
  "/export": "Export",
  "/settings": "Settings",
};

export default function Layout() {
  const { token } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState(null);

  useEffect(() => {
    if (!token) return;
    listAccounts(token).then(setAccounts).catch(() => {});
  }, [token]);

  const title = PAGE_TITLES[location.pathname] || "FinSight AI";

  return (
    <div className="app-shell">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <div className="main-content">
        <Topbar
          title={title}
          accounts={accounts}
          selectedAccountId={selectedAccountId}
          onSelectAccount={setSelectedAccountId}
        />
        <div className="page-container">
          <Outlet context={{ accounts, selectedAccountId }} />
        </div>
      </div>
    </div>
  );
}
