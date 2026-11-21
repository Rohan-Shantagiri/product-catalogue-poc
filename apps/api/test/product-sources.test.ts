import { describe, expect, it, vi } from "vitest";
import { CachedProductLoader } from "../src/adapters/products/cached-loader.js";
import { FakeStoreClient } from "../src/adapters/products/fakestore/fakestore-client.js";
import { mapFakeStoreProduct } from "../src/adapters/products/fakestore/fakestore-mapper.js";
import { fakeStoreProductSchema } from "../src/adapters/products/fakestore/fakestore-schema.js";
import { loadFixtureProducts } from "../src/adapters/products/fixture/fixture-loader.js";
import { InMemoryProductRepository } from "../src/adapters/products/in-memory-product-repository.js";
import { JsonMerchandisingSource } from "../src/adapters/merchandising/json-merchandising-source.js";
import { UpstreamUnavailableError } from "../src/domain/errors.js";
import { selectCategoryTopRated } from "../src/services/top-rated.js";
import type { ProductRepository } from "../src/ports/product-repository.js";
import { makeProduct } from "./make-product.js";
import { recordedProducts, upstreamProduct } from "./recorded-products.js";

function client(request: typeof globalThis.fetch, onInvalid = vi.fn()) {
  return new FakeStoreClient({
    baseUrl: "https://catalogue.example.com/",
    currency: "AUD",
    timeoutMs: 20,
    request,
    onInvalid,
  });
}

describe("P2-03: Fake Store transport and mapping", () => {
  it("maps a validated item without leaking upstream types", () => {
    const raw = fakeStoreProductSchema.parse(upstreamProduct);
    expect(mapFakeStoreProduct(raw, "AUD")).toEqual({
      id: "3",
      title: upstreamProduct.title,
      description: upstreamProduct.description,
      price: { amountCents: 10995, currency: "AUD" },
      category: { slug: "mens-clothing", name: "Men's Clothing" },
      imageSourceUrl: upstreamProduct.image,
      rating: { average: 4.8, count: 3 },
    });
  });

  it("retries a 5xx once, only requests the full collection, and skips malformed and duplicate rows", async () => {
    const request = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(
        Response.json([upstreamProduct, { id: "bad" }, upstreamProduct]),
      );
    const invalid = vi.fn<(index: number) => void>();
    const products = await client(request, invalid).loadProducts();

    expect(products.map(({ id }) => id)).toEqual(["3"]);
    expect(request.mock.calls.map(([url]) => url)).toEqual([
      "https://catalogue.example.com/products",
      "https://catalogue.example.com/products",
    ]);
    expect(invalid.mock.calls.map(([index]) => index)).toEqual([1, 2]);
  });

  it("retries a timed-out request with a fresh signal", async () => {
    const request = vi
      .fn<typeof globalThis.fetch>()
      .mockImplementationOnce(
        (_input, init) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener(
              "abort",
              () => reject(new Error("Timed out")),
              { once: true },
            );
          }),
      )
      .mockResolvedValueOnce(Response.json([upstreamProduct]));
    expect(await client(request).loadProducts()).toHaveLength(1);
    const first = request.mock.calls[0]?.[1]?.signal;
    const second = request.mock.calls[1]?.[1]?.signal;
    expect(first?.aborted).toBe(true);
    expect(second).toBeInstanceOf(AbortSignal);
    expect(second).not.toBe(first);
  });

  it.each([
    ["a 4xx", () => new Response(null, { status: 404 })],
    ["a non-array payload", () => Response.json({ products: [] })],
    ["invalid JSON", () => new Response("not JSON")],
    ["an entirely invalid array", () => Response.json([{ id: "bad" }])],
  ])(
    "maps %s to an upstream failure without retrying",
    async (_label, respond) => {
      const request = vi.fn(() => Promise.resolve(respond()));
      await expect(client(request).loadProducts()).rejects.toBeInstanceOf(
        UpstreamUnavailableError,
      );
      expect(request).toHaveBeenCalledTimes(1);
    },
  );

  it("fails after two unsuccessful network attempts", async () => {
    const request = vi.fn().mockRejectedValue(new Error("Network unavailable"));
    await expect(client(request).loadProducts()).rejects.toBeInstanceOf(
      UpstreamUnavailableError,
    );
    expect(request).toHaveBeenCalledTimes(2);
  });
});

describe("P2-03: single-flight cache and availability", () => {
  it("shares the in-flight request and serves the cached data until it expires", async () => {
    let now = 0;
    const first = [makeProduct("first")];
    const next = [makeProduct("next")];
    const load = vi
      .fn()
      .mockResolvedValueOnce(first)
      .mockResolvedValueOnce(next);
    const cache = new CachedProductLoader(load, 100, () => now);
    const flight = cache.load();
    expect(cache.load()).toBe(flight);
    expect(await flight).toEqual(first);
    now = 99;
    expect(await cache.load()).toEqual(first);
    now = 100;
    expect(await cache.load()).toEqual(next);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("does not remember failures and serves stale good data until recovery", async () => {
    let now = 0;
    const good = [makeProduct("good")];
    const replacement = [makeProduct("replacement")];
    const stale = vi.fn();
    const load = vi
      .fn()
      .mockRejectedValueOnce(new UpstreamUnavailableError())
      .mockResolvedValueOnce(good)
      .mockRejectedValueOnce(new UpstreamUnavailableError())
      .mockResolvedValueOnce(replacement);
    const cache = new CachedProductLoader(load, 10, () => now, stale);
    await expect(cache.load()).rejects.toBeInstanceOf(UpstreamUnavailableError);
    expect(await cache.load()).toEqual(good);
    now = 10;
    expect(await cache.load()).toEqual(good);
    expect(stale).toHaveBeenCalledTimes(1);
    expect(await cache.load()).toEqual(replacement);
  });
});

describe("P2-03: merchandising validates its file at boot", () => {
  it("reads the seed configuration", async () => {
    const source = new JsonMerchandisingSource(
      new URL("../config/merchandising.json", import.meta.url),
    );
    expect(await source.getConfig()).toEqual({
      topRatedProductIds: ["3", "5", "11", "12", "18"],
      categoryFallbackCount: 3,
    });
  });

  it.each([
    '{"topRatedProductIds":["3","3"],"categoryFallbackCount":3}',
    '{"topRatedProductIds":["a/b"],"categoryFallbackCount":3}',
    '{"topRatedProductIds":["3"],"categoryFallbackCount":13}',
    '{"topRatedProductIds":[],"categoryFallbackCount":3}',
  ])(
    "rejects invalid merchandising configuration during construction",
    (json) => {
      expect(
        () => new JsonMerchandisingSource("test.json", () => json),
      ).toThrow("Invalid merchandising configuration");
    },
  );
});

function runProductRepositoryContract(makeRepo: () => ProductRepository) {
  it("sorts categories and returns null for unknown category or product", async () => {
    const repo = makeRepo();
    expect((await repo.listCategories()).map(({ slug }) => slug)).toEqual([
      "electronics",
      "jewelery",
      "mens-clothing",
      "womens-clothing",
    ]);
    expect(
      (await repo.listByCategory("mens-clothing"))?.map(({ id }) => id),
    ).toEqual(["1", "2", "3", "4"]);
    expect(await repo.listByCategory("missing")).toBeNull();
    expect(await repo.getById("missing")).toBeNull();
  });

  it.each([
    ["electronics", ["12", "11", "9"]],
    ["jewelery", ["5", "6", "7"]],
    ["mens-clothing", ["3"]],
    ["womens-clothing", ["18", "19", "17"]],
  ] as const)(
    "preserves the agreed fallback ordering in %s",
    async (slug, expected) => {
      const products = await makeRepo().listByCategory(slug);
      if (!products) throw new Error(`Missing category ${slug}`);
      const selection = selectCategoryTopRated(products, ["3"], 3);
      expect(selection.topRated.map(({ id }) => id)).toEqual(expected);
      expect(selection.mode).toBe(
        slug === "mens-clothing" ? "chosen" : "fallback",
      );
    },
  );

  it("uses opaque IDs, preserves requested order, and searches with source ordering", async () => {
    const repo = makeRepo();
    expect((await repo.getById("3"))?.id).toBe("3");
    expect(await repo.getById("003")).toBeNull();
    expect(
      (await repo.getByIds(["12", "missing", "3"])).map(({ id }) => id),
    ).toEqual(["12", "3"]);
    expect((await repo.search("men")).map(({ id }) => id)).toEqual([
      "2",
      "3",
      "4",
      "1",
    ]);
  });
}

describe("P2-03: repository contract over fixture", () => {
  runProductRepositoryContract(
    () => new InMemoryProductRepository(() => loadFixtureProducts("AUD")),
  );
});

describe("P2-03: repository contract over Fake Store", () => {
  runProductRepositoryContract(() => {
    const stub = client(() =>
      Promise.resolve(new Response(recordedProducts())),
    );
    return new InMemoryProductRepository(
      new CachedProductLoader(() => stub.loadProducts(), 500).load,
    );
  });
});

describe("P2-02: repository accepts opaque IDs from future sources", () => {
  it("preserves nonnumeric IDs through lookup", async () => {
    const product = makeProduct("SKU_A-2");
    const repo = new InMemoryProductRepository(() =>
      Promise.resolve([product]),
    );
    expect(await repo.getById("SKU_A-2")).toEqual(product);
    expect(await repo.getById("sku_a-2")).toBeNull();
  });
});
