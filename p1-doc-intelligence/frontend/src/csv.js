// Flatten nested JSON into a single-level object suitable for a spreadsheet row.
// Nested objects become dot-notation keys; arrays are serialized to a single
// readable cell rather than exploded into extra rows (kept simple on purpose —
// arbitrary nested list-of-object data doesn't map cleanly onto flat rows).
export function flattenObject(obj, prefix = "") {
  const out = {};
  for (const [key, value] of Object.entries(obj ?? {})) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      Object.assign(out, flattenObject(value, path));
    } else if (Array.isArray(value)) {
      out[path] = value.map((v) => (typeof v === "object" && v !== null ? JSON.stringify(v) : v)).join("; ");
    } else {
      out[path] = value ?? "";
    }
  }
  return out;
}

function csvEscape(value) {
  const s = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function toCSV(rows) {
  if (!rows || rows.length === 0) return "";
  const headerSet = new Set();
  rows.forEach((row) => Object.keys(row).forEach((k) => headerSet.add(k)));
  const headers = Array.from(headerSet);

  const lines = [headers.map(csvEscape).join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => csvEscape(row[h])).join(","));
  }
  return lines.join("\r\n");
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

export function downloadCSV(filename, csvString) {
  const blob = new Blob(["﻿" + csvString], { type: "text/csv;charset=utf-8;" });
  downloadBlob(filename.toLowerCase().endsWith(".csv") ? filename : `${filename}.csv`, blob);
}
