import { CATEGORY_COLORS } from "../api";

export default function CategoryBadge({ category }) {
  const color = CATEGORY_COLORS[category] || "var(--text-faint)";
  return (
    <span
      className="badge"
      style={{
        color,
        background: `${color}1a`,
        border: `1px solid ${color}40`,
      }}
    >
      {category || "Uncategorized"}
    </span>
  );
}
