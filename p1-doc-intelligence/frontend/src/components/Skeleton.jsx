export default function Skeleton({ height = 16, width = "100%", radius }) {
  return (
    <div
      className="skeleton"
      style={{
        height,
        width,
        borderRadius: radius,
      }}
    />
  );
}
