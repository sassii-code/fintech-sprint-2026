import { Wand2 } from "lucide-react";
import { TEMPLATES } from "../api";

export default function CustomFieldsInput({ value, onChange }) {
  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <input
        className="input"
        placeholder="e.g. invoice_number, vendor_name, total_amount"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
        <span style={{ fontSize: "0.75rem", color: "var(--text-faint)", display: "flex", alignItems: "center", gap: 4 }}>
          <Wand2 size={12} /> Templates:
        </span>
        {TEMPLATES.map((tpl) => (
          <button
            key={tpl.id}
            type="button"
            onClick={() => onChange(tpl.fields.join(", "))}
            className="btn btn-ghost"
            style={{ padding: "4px 10px", fontSize: "0.75rem" }}
          >
            {tpl.label}
          </button>
        ))}
      </div>
    </div>
  );
}
