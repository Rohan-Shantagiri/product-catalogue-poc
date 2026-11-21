import { cleanup } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach } from "vitest";
import { electronics, mensClothing } from "./factories";

export function endpoint(path: `/${string}`) {
  return new URL(`/api/v1${path}`, document.baseURI).href;
}

export function catalogueTestServer() {
  const server = setupServer();
  beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
  beforeEach(() => {
    server.use(
      http.get(endpoint("/categories"), () =>
        HttpResponse.json({ items: [electronics, mensClothing] }),
      ),
    );
  });
  afterEach(() => {
    cleanup();
    server.resetHandlers();
  });
  afterAll(() => server.close());
  return server;
}

export function missingResource() {
  return HttpResponse.json(
    { type: "about:blank", title: "Not Found", status: 404, code: "NOT_FOUND" },
    { status: 404, headers: { "content-type": "application/problem+json" } },
  );
}
