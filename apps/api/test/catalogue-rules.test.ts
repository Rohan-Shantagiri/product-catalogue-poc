import { describe, expect, it, vi } from "vitest";
import { NotFoundError } from "../src/domain/errors.js";
import { toCents } from "../src/domain/money.js";
import { searchProducts } from "../src/domain/search.js";
import { toCategory } from "../src/domain/slug.js";
import { CatalogueService } from "../src/services/catalogue-service.js";
import { selectCategoryTopRated } from "../src/services/top-rated.js";
import { makeProduct } from "./make-product.js";
import type { ProductRepository } from "../src/ports/product-repository.js";

describe("P2-02: D5 money and D7 category display", () => {
  it.each([
    [109.95, 10995],
    [0.29, 29],
    [0, 0],
  ])("maps %s to %s cents", (price, cents) => {
    expect(toCents(price)).toBe(cents);
  });

  it.each([
    ["men's clothing", "mens-clothing", "Men's Clothing"],
    ["jewelery", "jewelery", "Jewelery"],
    ["Électronique", "electronique", "Électronique"],
  ])("derives category information from %s", (source, slug, name) => {
    expect(toCategory(source)).toEqual({ slug, name });
  });
});

describe("P2-02: D2 search matches complete query tokens by prefix", () => {
  const products = [
    makeProduct("women", {
      title: "Women's jackets",
      description: "Genuine rings",
    }),
    makeProduct("desc", {
      title: "Canvas",
      description: "Men's shirts and café rings",
    }),
    makeProduct("men", { title: "Men’s shirts" }),
    makeProduct("tee", { title: "Cotton T Shirt" }),
    makeProduct("jacket", { title: "Jacket", description: "Genuine gold" }),
    makeProduct("category", {
      category: { slug: "mens-clothing", name: "Men's Clothing" },
    }),
  ];

  it.each([
    ["men", ["men", "desc", "category"]],
    ["MENS", ["men", "desc", "category"]],
    ["women's", ["women"]],
    ["jackets", ["women", "jacket"]],
    ["rings", ["women", "desc"]],
    ["CAFE ring", ["desc"]],
    ["t-shirt", ["tee"]],
    ["gold jacket", ["jacket"]],
    ["dress", []],
    ["(", []],
  ])("returns the expected ordered products for %s", (query, expected) => {
    expect(searchProducts(products, query).map(({ id }) => id)).toEqual(
      expected,
    );
  });
});

describe("P2-02: D1 chosen products and stable fallback", () => {
  const products = [
    makeProduct("a", { rating: { average: 4.8, count: 9 } }),
    makeProduct("b", { rating: { average: 4.8, count: 10 } }),
    makeProduct("c", { rating: { average: 4.8, count: 10 } }),
    makeProduct("d"),
  ];

  it("keeps curated and remaining order without overlap or padding", () => {
    expect(selectCategoryTopRated(products, ["c", "unknown", "a"], 3)).toEqual({
      topRated: [products[2], products[0]],
      others: [products[1], products[3]],
      mode: "chosen",
    });
  });

  it("ties by count and then source order and keeps rest in source order", () => {
    expect(selectCategoryTopRated(products, ["unknown"], 2)).toEqual({
      topRated: [products[1], products[2]],
      others: [products[0], products[3]],
      mode: "fallback",
    });
  });

  it("returns curated items, reports unknown IDs and fallback, and never fetches a missing image", async () => {
    const [a, b] = products;
    if (!a || !b) throw new Error("Missing test products");
    const repo: ProductRepository = {
      listCategories: () => Promise.resolve([a.category]),
      listByCategory: () => Promise.resolve([b]),
      getById: () => Promise.resolve(null),
      getByIds: () => Promise.resolve([a]),
      search: () => Promise.resolve([]),
    };
    const report = vi.fn();
    const fetchImage = vi.fn();
    const catalogue = new CatalogueService(
      repo,
      {
        getConfig: () =>
          Promise.resolve({
            topRatedProductIds: ["a", "missing"],
            categoryFallbackCount: 3,
          }),
      },
      { fetch: fetchImage },
      report,
    );

    expect(await catalogue.getTopRated()).toEqual([a]);
    expect(await catalogue.getCategoryPage("electronics")).toEqual({
      category: b.category,
      topRated: [b],
      others: [],
    });
    expect(report).toHaveBeenNthCalledWith(1, {
      type: "merchandising.unknown_id",
      id: "missing",
    });
    expect(report).toHaveBeenNthCalledWith(2, {
      type: "catalogue.top_rated_fallback",
      slug: "electronics",
    });
    await expect(catalogue.getProductImage("missing")).rejects.toBeInstanceOf(
      NotFoundError,
    );
    expect(fetchImage).not.toHaveBeenCalled();
  });
});
