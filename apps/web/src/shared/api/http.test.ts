// @vitest-environment jsdom
import { productListResponseSchema } from "@catalogue/contracts";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { ApiError } from "./api-error";
import { requestJson } from "./http";

const categoriesPath = "/collections/top-rated";
const endpoint = new URL("/api/v1" + categoriesPath, document.baseURI).href;
const server = setupServer();

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("P4-01: shared browser API boundary", () => {
  it("reads validated JSON through the same-origin versioned API", async () => {
    server.use(
      http.get(endpoint, ({ request }) => {
        expect(request.headers.get("accept")).toContain("application/json");
        return HttpResponse.json({ items: [] });
      }),
    );
    expect(
      await requestJson(categoriesPath, productListResponseSchema),
    ).toEqual({ items: [] });
  });

  it("exposes structured problems, the request ID and Retry-After", async () => {
    server.use(
      http.get(endpoint, () =>
        HttpResponse.json(
          {
            type: "about:blank",
            title: "Too Many Requests",
            status: 429,
            code: "RATE_LIMITED",
            requestId: "retry-example",
            errors: [{ path: "q", message: "Try again soon" }],
          },
          {
            status: 429,
            headers: {
              "content-type": "application/problem+json",
              "retry-after": "120",
            },
          },
        ),
      ),
    );
    const response = requestJson(categoriesPath, productListResponseSchema);
    await expect(response).rejects.toBeInstanceOf(ApiError);
    await expect(response).rejects.toMatchObject({
      status: 429,
      code: "RATE_LIMITED",
      title: "Too Many Requests",
      requestId: "retry-example",
      fieldErrors: [{ path: "q", message: "Try again soon" }],
      retryAfterSeconds: 120,
    });
  });

  it("normalises transport failures to status zero", async () => {
    server.use(http.get(endpoint, () => HttpResponse.error()));
    await expect(
      requestJson(categoriesPath, productListResponseSchema),
    ).rejects.toMatchObject({
      status: 0,
      code: "NETWORK_ERROR",
    });
  });

  it("does not expose the contents of a non-JSON gateway failure", async () => {
    server.use(
      http.get(endpoint, () =>
        HttpResponse.text("private gateway detail", {
          status: 502,
          headers: { "x-request-id": "fallback-example" },
        }),
      ),
    );
    await expect(
      requestJson(categoriesPath, productListResponseSchema),
    ).rejects.toMatchObject({
      status: 502,
      code: "INTERNAL_ERROR",
      title: "Request failed",
      requestId: "fallback-example",
    });
  });

  it("rejects a successful response with the wrong shape", async () => {
    server.use(http.get(endpoint, () => HttpResponse.json({ products: [] })));
    await expect(
      requestJson(categoriesPath, productListResponseSchema),
    ).rejects.toMatchObject({
      status: 200,
      code: "INTERNAL_ERROR",
      title: "Unexpected response",
    });
  });
});
