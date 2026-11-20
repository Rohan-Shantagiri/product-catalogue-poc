// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { HealthPage } from "./HealthPage";

const server = setupServer();
const healthUrl = new URL("/api/health", document.baseURI).href;

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => server.close());

describe("P1-05: web shell displays API health", () => {
  it("shows a loading status then confirms a valid health response", async () => {
    server.use(http.get(healthUrl, () => HttpResponse.json({ status: "ok" })));

    render(<HealthPage />);
    expect(
      screen.getByRole("heading", { name: "Product catalogue" }),
    ).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe("API: checking…");
    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toBe("API: ok"),
    );
  });

  it.each([
    ["HTTP error", () => HttpResponse.json({}, { status: 503 })],
    ["invalid contract", () => HttpResponse.json({ status: "healthy" })],
    ["network failure", () => HttpResponse.error()],
  ] as const)("shows unavailable for a %s", async (_failure, respond) => {
    server.use(http.get(healthUrl, respond));

    render(<HealthPage />);
    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toBe("API: unavailable"),
    );
  });
});
