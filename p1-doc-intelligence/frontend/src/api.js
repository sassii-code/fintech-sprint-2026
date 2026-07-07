const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://fintech-sprint-2026.onrender.com";

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
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
      detail = body.detail || detail;
    } catch {
      // response wasn't JSON, keep statusText
    }
    throw new ApiError(typeof detail === "string" ? detail : JSON.stringify(detail), res.status);
  }

  return res.json();
}

export const DOC_TYPES = [
  { value: "auto", label: "Auto-detect" },
  { value: "resume", label: "Resume" },
  { value: "invoice", label: "Invoice" },
  { value: "bank_statement", label: "Bank Statement" },
];

const DOC_TYPE_ENDPOINTS = {
  resume: "/extract/resume",
  invoice: "/extract/invoice",
  bank_statement: "/extract/bank-statement",
  auto: "/extract/auto",
};

export function login(clientId, clientSecret) {
  return request("/auth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret }),
  });
}

export function extractDocument(docType, file, token) {
  const formData = new FormData();
  formData.append("file", file);
  return request(DOC_TYPE_ENDPOINTS[docType] ?? DOC_TYPE_ENDPOINTS.auto, {
    method: "POST",
    body: formData,
    token,
  });
}

export function getHistory(token) {
  return request("/extract/history", { token });
}

export function getExtraction(id, token) {
  return request(`/extract/history/${id}`, { token });
}

export { API_BASE_URL };
