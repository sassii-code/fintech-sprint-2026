export default function Skeleton({ height = 16, width = "100%", radius, style }) {
  return <div className="skeleton" style={{ height, width, borderRadius: radius, ...style }} />;
}
