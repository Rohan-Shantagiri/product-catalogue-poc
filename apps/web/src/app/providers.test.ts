import { describe, expect, it } from "vitest";
import { ApiError } from "../shared/api/api-error";
import { createAppQueryClient } from "./providers";

describe("P4-01: catalogue query defaults", () => {
  it("keeps results fresh for a minute and retries only transient query errors twice", () => {
    const defaults = createAppQueryClient().getDefaultOptions();
    expect(defaults.queries?.staleTime).toBe(60_000);
    expect(defaults.queries?.refetchOnWindowFocus).toBe(false);
    expect(defaults.mutations?.retry).toBe(false);
    const retry = defaults.queries?.retry;
    if (typeof retry !== "function")
      throw new Error("Expected a retry predicate");
    const offline = new ApiError({
      status: 0,
      code: "NETWORK_ERROR",
      title: "Network error",
    });
    const unavailable = new ApiError({
      status: 502,
      code: "UPSTREAM_UNAVAILABLE",
      title: "Unavailable",
    });
    const missing = new ApiError({
      status: 404,
      code: "NOT_FOUND",
      title: "Not found",
    });
    expect(retry(0, offline)).toBe(true);
    expect(retry(1, unavailable)).toBe(true);
    expect(retry(2, unavailable)).toBe(false);
    expect(retry(0, missing)).toBe(false);
    expect(retry(0, new Error("Unknown failure"))).toBe(false);
  });
});
