import { healthResponseSchema } from "@catalogue/contracts";

export async function getHealth(signal: AbortSignal) {
  const response = await fetch("/api/health", { signal });
  if (!response.ok) throw new Error("Health check failed");

  return healthResponseSchema.parse(await response.json());
}
