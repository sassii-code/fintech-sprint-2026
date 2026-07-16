import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import DashboardPage from "./pages/DashboardPage";
import UploadPage from "./pages/UploadPage";
import TransactionsPage from "./pages/TransactionsPage";
import InsightsPage from "./pages/InsightsPage";
import SubscriptionsPage from "./pages/SubscriptionsPage";
import HealthScorePage from "./pages/HealthScorePage";
import ExportPage from "./pages/ExportPage";
import SettingsPage from "./pages/SettingsPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/insights" element={<InsightsPage />} />
          <Route path="/subscriptions" element={<SubscriptionsPage />} />
          <Route path="/health-score" element={<HealthScorePage />} />
          <Route path="/export" element={<ExportPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
