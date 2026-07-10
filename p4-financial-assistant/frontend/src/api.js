export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

// The backend forwards Gemini's raw error text on 502/504 (rate limits, timeouts,
// safety blocks, etc.) — useful in logs, not something to show a user directly.
export function friendlyErrorMessage(err) {
  if (!err) return "Something went wrong.";
  if (err.status === 504) return "The AI is taking too long to respond. Please try again in a moment.";
  if (err.status === 502) {
    if (/quota|rate limit/i.test(err.message)) return "AI usage limit reached for now — please try again shortly.";
    return "The AI service is temporarily unavailable. Please try again.";
  }
  if (err.status === 404) return err.message;
  if (err.status === 0) return "Could not reach the server. Check your connection and try again.";
  return err.message || "Something went wrong.";
}

async function request(path, { token, headers, ...options } = {}) {
  const finalHeaders = new Headers(headers || {});
  if (token) finalHeaders.set("Authorization", `Bearer ${token}`);

  let res;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers: finalHeaders });
  } catch {
    throw new ApiError(`Could not reach the API at ${API_BASE_URL}`, 0);
  }

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {
      // not JSON, keep statusText
    }
    throw new ApiError(typeof detail === "string" ? detail : JSON.stringify(detail), res.status);
  }

  if (res.status === 204) return null;
  return res.json();
}

// ── auth ──
export function login(clientId, clientSecret) {
  return request("/auth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret }),
  });
}

// ── transactions ──
// Uses XHR (not fetch) specifically so we can report real upload progress.
export function uploadTransactions(file, accountName, token, onProgress) {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("account_name", accountName || "Default Account");

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE_URL}/transactions/upload`);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };

    xhr.onload = () => {
      let body;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        body = null;
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(body);
      } else {
        reject(new ApiError(body?.detail ?? xhr.statusText, xhr.status));
      }
    };
    xhr.onerror = () => reject(new ApiError(`Could not reach the API at ${API_BASE_URL}`, 0));
    xhr.send(formData);
  });
}

export function listAccounts(token) {
  return request("/transactions/accounts", { token });
}

export function listTransactions(token, { accountId, category, limit = 500 } = {}) {
  const params = new URLSearchParams();
  if (accountId != null) params.set("account_id", accountId);
  if (category) params.set("category", category);
  params.set("limit", limit);
  return request(`/transactions?${params}`, { token });
}

export function getTransaction(id, token) {
  return request(`/transactions/${id}`, { token });
}

export function getRecurring(token) {
  return request("/transactions/recurring", { token });
}

// ── analytics ──
export function spendingByCategory(token) {
  return request("/analytics/spending-by-category", { token });
}

export function monthlyTrends(token) {
  return request("/analytics/monthly-trends", { token });
}

export function incomeVsExpenses(token) {
  return request("/analytics/income-vs-expenses", { token });
}

export function topMerchants(token, limit = 10) {
  return request(`/analytics/top-merchants?limit=${limit}`, { token });
}

export function getAnomalies(token) {
  return request("/analytics/anomalies", { token });
}

export function getAnalyticsInsights(token) {
  return request("/analytics/insights", { method: "POST", token });
}

// ── insights ──
export function queryInsights(question, token) {
  return request("/insights/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
    token,
  });
}

export function getHealthScore(token) {
  return request("/insights/health-score", { token });
}

// ── export ──
export async function exportAccounting(token, format, dateFrom, dateTo) {
  const params = new URLSearchParams({ format });
  if (dateFrom) params.set("date_from", dateFrom);
  if (dateTo) params.set("date_to", dateTo);

  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let res;
  try {
    res = await fetch(`${API_BASE_URL}/export/accounting?${params}`, { headers });
  } catch {
    throw new ApiError(`Could not reach the API at ${API_BASE_URL}`, 0);
  }

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {
      // not JSON
    }
    throw new ApiError(typeof detail === "string" ? detail : JSON.stringify(detail), res.status);
  }

  return res.blob();
}

export function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ── shared constants ──
export const CATEGORIES = [
  "Food", "Rent", "Transport", "Subscriptions", "Income",
  "Shopping", "Utilities", "Entertainment", "Other",
];

export const CATEGORY_COLORS = {
  Food: "#34d399",
  Rent: "#f59e0b",
  Transport: "#38bdf8",
  Subscriptions: "#a78bfa",
  Income: "#22c55e",
  Shopping: "#f472b6",
  Utilities: "#fb923c",
  Entertainment: "#818cf8",
  Other: "#94a3b8",
};
