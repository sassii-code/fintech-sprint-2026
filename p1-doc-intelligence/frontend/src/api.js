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
  { value: "custom", label: "Custom Fields" },
];

// Preset field lists for the template library — selecting one pre-fills
// the custom-fields input so users don't have to type them by hand.
export const TEMPLATES = [
  {
    id: "invoice",
    label: "Invoice",
    fields: ["vendor_name", "invoice_number", "invoice_date", "due_date", "line_items", "subtotal", "tax", "total_amount"],
  },
  {
    id: "resume",
    label: "Resume",
    fields: ["name", "email", "phone", "education", "experience", "skills"],
  },
  {
    id: "bank_statement",
    label: "Bank Statement",
    fields: ["account_holder", "account_number", "bank_name", "transactions", "opening_balance", "closing_balance"],
  },
  {
    id: "receipt",
    label: "Receipt",
    fields: ["merchant_name", "date", "items", "subtotal", "tax", "total", "payment_method"],
  },
  {
    id: "tax_form",
    label: "Tax Form",
    fields: ["taxpayer_name", "tax_id", "tax_year", "gross_income", "deductions", "tax_owed", "tax_paid"],
  },
  {
    id: "contract",
    label: "Contract",
    fields: ["parties", "effective_date", "term_length", "payment_terms", "termination_clause", "governing_law"],
  },
];

export const ACCEPTED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png", ".docx", ".txt"];
export const ACCEPT_ATTR = ".pdf,.jpg,.jpeg,.png,.docx,.txt,application/pdf,image/jpeg,image/png,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

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

export function extractCustom(file, fields, token) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("fields", Array.isArray(fields) ? fields.join(",") : fields);
  return request("/extract/custom", { method: "POST", body: formData, token });
}

export function extractDocument(docType, file, token, customFields) {
  if (docType === "custom") {
    return extractCustom(file, customFields ?? "", token);
  }
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

// Returns a Blob (an .xlsx file), not JSON — can't go through request().
export async function exportToExcel(records, token) {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let res;
  try {
    res = await fetch(`${API_BASE_URL}/extract/export`, {
      method: "POST",
      headers,
      body: JSON.stringify({ records }),
    });
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

  return res.blob();
}

export { API_BASE_URL };
