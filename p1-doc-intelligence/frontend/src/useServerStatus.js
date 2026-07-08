import { useEffect, useState } from "react";
import { API_BASE_URL } from "./api";

// Pings /health as soon as the app mounts — before login — so a cold Render
// instance starts waking up immediately rather than waiting for the user's
// first extraction request to trigger the cold start.
export function useServerStatus() {
  const [status, setStatus] = useState("connecting"); // "connecting" | "ready" | "error"

  useEffect(() => {
    let cancelled = false;

    async function ping() {
      try {
        const res = await fetch(`${API_BASE_URL}/health`);
        if (!cancelled) setStatus(res.ok ? "ready" : "error");
      } catch {
        if (!cancelled) setStatus("error");
      }
    }

    ping();
    return () => {
      cancelled = true;
    };
  }, []);

  return status;
}
