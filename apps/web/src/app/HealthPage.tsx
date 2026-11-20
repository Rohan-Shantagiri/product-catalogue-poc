import { useEffect, useState } from "react";
import { getHealth } from "../shared/api/http";

export function HealthPage() {
  const [status, setStatus] = useState<"checking…" | "ok" | "unavailable">(
    "checking…",
  );

  useEffect(() => {
    const controller = new AbortController();

    void getHealth(controller.signal).then(
      (health) => {
        if (!controller.signal.aborted) setStatus(health.status);
      },
      () => {
        if (!controller.signal.aborted) setStatus("unavailable");
      },
    );

    return () => controller.abort();
  }, []);

  return (
    <main>
      <h1>Product catalogue</h1>
      <p role="status">API: {status}</p>
    </main>
  );
}
