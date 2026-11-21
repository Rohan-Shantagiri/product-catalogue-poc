import {
  categoryListResponseSchema,
  categoryProductsResponseSchema,
  problemDetailsSchema,
  productDtoSchema,
  productListResponseSchema,
} from "@catalogue/contracts";
import supertest from "supertest";
import { describe, expect, it, vi } from "vitest";
import { composeApi } from "../src/composition-root.js";
import { createLogger } from "../src/logger.js";
import { recordedProducts } from "./recorded-products.js";

const expectedSearch = [
  ["men", ["2", "3", "4", "1"]],
  ["MENS", ["2", "3", "4", "1"]],
  ["women's", ["5", "15", "16", "17", "18", "19", "20"]],
  ["jackets", ["3", "15", "16", "17"]],
  ["shirts", ["2", "20"]],
  ["t-shirt", ["2", "20"]],
  ["rings", ["7"]],
  ["gold ring", ["7"]],
  ["ssd", ["10", "11"]],
  ["(", []],
  ["xyz123", []],
  ["dress", []],
] as const;

function upstream(url: Parameters<typeof globalThis.fetch>[0]) {
  const href =
    typeof url === "string" ? url : url instanceof URL ? url.href : url.url;
  const path = new URL(href).pathname;
  if (path === "/products")
    return Promise.resolve(new Response(recordedProducts()));
  if (path.startsWith("/img/") || path.startsWith("/f/")) {
    return Promise.resolve(
      new Response(Uint8Array.of(137, 80, 78, 71), {
        headers: { "content-type": "image/png" },
      }),
    );
  }
  return Promise.reject(new Error("Unexpected upstream path"));
}

describe.each([
  ["fixture", "image/svg+xml"],
  ["fakestore", "image/png"],
] as const)(
  "P2-04 and P2-05: catalogue HTTP in %s mode",
  (source, contentType) => {
    function start() {
      const request = vi.fn(upstream);
      const { app } = composeApi(
        { PRODUCT_SOURCE: source, LOG_LEVEL: "silent" },
        { request },
      );
      return { api: supertest(app.callback()), request };
    }

    it("loads only after use and exposes home and category lists with cache policy", async () => {
      const { api, request } = start();
      await api.get("/api/health").expect(200);
      expect(request).not.toHaveBeenCalled();
      const home = await api
        .get("/api/v1/collections/top-rated")
        .expect(200)
        .expect("Cache-Control", "public, max-age=60")
        .expect("X-Content-Type-Options", "nosniff");
      expect(
        productListResponseSchema.parse(home.body).items.map(({ id }) => id),
      ).toEqual(["3", "5", "11", "12", "18"]);
      const categories = await api
        .get("/api/v1/categories")
        .expect(200)
        .expect("Cache-Control", "public, max-age=60");
      expect(
        categoryListResponseSchema
          .parse(categories.body)
          .items.map(({ slug }) => slug),
      ).toEqual([
        "electronics",
        "jewelery",
        "mens-clothing",
        "womens-clothing",
      ]);
      expect(request).toHaveBeenCalledTimes(source === "fixture" ? 0 : 1);
    });

    it.each([
      ["electronics", ["11", "12"], ["9", "10", "13", "14"]],
      ["jewelery", ["5"], ["6", "7", "8"]],
      ["mens-clothing", ["3"], ["1", "2", "4"]],
      ["womens-clothing", ["18"], ["15", "16", "17", "19", "20"]],
    ] as const)("splits %s without overlap", async (slug, chosen, others) => {
      const { api } = start();
      const result = await api
        .get(`/api/v1/categories/${slug}/products`)
        .expect(200)
        .expect("Cache-Control", "public, max-age=60");
      const response = categoryProductsResponseSchema.parse(result.body);
      expect(response.category.slug).toBe(slug);
      expect(response.topRated.map(({ id }) => id)).toEqual(chosen);
      expect(response.others.map(({ id }) => id)).toEqual(others);
    });

    it.each(expectedSearch)(
      "returns the agreed result for %s",
      async (q, expected) => {
        const { api } = start();
        const result = await api
          .get("/api/v1/products")
          .query({ q })
          .expect(200)
          .expect("Cache-Control", "public, max-age=60");
        expect(
          productListResponseSchema
            .parse(result.body)
            .items.map(({ id }) => id),
        ).toEqual(expected);
      },
    );

    it("publishes the backend image URL and serves it with the right media type", async () => {
      const { api, request } = start();
      const result = await api
        .get("/api/v1/products/1")
        .expect(200)
        .expect("Cache-Control", "public, max-age=60");
      const product = productDtoSchema.parse(result.body);
      expect(product.id).toBe("1");
      expect(product.imageUrl).toBe("/api/v1/products/1/image");
      expect(result.text).not.toContain("imageSourceUrl");
      await api
        .get(product.imageUrl)
        .expect(200)
        .expect("Content-Type", contentType)
        .expect("Cache-Control", "public, max-age=86400");
      expect(request).toHaveBeenCalledTimes(source === "fixture" ? 0 : 2);
    });
  },
);

describe("P2-04: catalogue failures are safe RFC 9457 problems", () => {
  const { app } = composeApi({
    PRODUCT_SOURCE: "fixture",
    LOG_LEVEL: "silent",
  });
  const api = supertest(app.callback());

  it.each(["", "?q=%20", "?q=" + "x".repeat(101), "?q=one&q=two"])(
    "rejects invalid search text",
    async (query) => {
      const result = await api
        .get("/api/v1/products" + query)
        .set("X-Request-Id", "test-search")
        .expect(400)
        .expect("Content-Type", /application\/problem\+json/)
        .expect("X-Request-Id", "test-search");
      const problem = problemDetailsSchema.parse(result.body);
      expect(problem).toMatchObject({
        status: 400,
        code: "VALIDATION_FAILED",
        requestId: "test-search",
      });
      expect(problem.errors?.map(({ path }) => path)).toEqual(["q"]);
    },
  );

  it.each([
    "/api/v1/products/abc",
    "/api/v1/products/999",
    "/api/v1/products/a%2Fb",
    "/api/v1/products/999/image",
    "/api/v1/categories/unknown/products",
    "/api/v1/categories/Mens-Clothing/products",
    "/api/v1/collections/unknown",
    "/api/v1/no-such-route",
  ])("returns a 404 for %s", async (path) => {
    const result = await api
      .get(path)
      .expect(404)
      .expect("Content-Type", /application\/problem\+json/);
    expect(problemDetailsSchema.parse(result.body)).toMatchObject({
      status: 404,
      code: "NOT_FOUND",
    });
  });

  it("maps an unavailable provider to 502 and logs only the registered route template", async () => {
    const lines: string[] = [];
    const logger = createLogger("info", { write: (line) => lines.push(line) });
    const request = vi
      .fn()
      .mockRejectedValue(new Error("sensitive low-level failure"));
    const { app: failing } = composeApi(
      { PRODUCT_SOURCE: "fakestore" },
      { request, logger },
    );
    const result = await supertest(failing.callback())
      .get("/api/v1/products/private-id?q=secret")
      .expect(502)
      .expect("Content-Type", /application\/problem\+json/);
    expect(problemDetailsSchema.parse(result.body)).toMatchObject({
      status: 502,
      code: "UPSTREAM_UNAVAILABLE",
    });
    expect(result.text).not.toContain("sensitive low-level failure");
    expect(lines.join("")).toContain('"route":"/api/v1/products/:id"');
    expect(lines.join("")).not.toMatch(/private-id|secret|low-level failure/);
  });
});
