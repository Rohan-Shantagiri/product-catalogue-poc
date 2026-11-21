import { describe, expect, it } from "vitest";
import {
  categoryListResponseSchema,
  categoryProductsResponseSchema,
  categorySlugSchema,
  productDtoSchema,
  productIdSchema,
  productListResponseSchema,
} from "./index.js";
import type { ProductDto } from "./index.js";

const category = { slug: "mens-clothing", name: "Men’s Clothing" };
const product: ProductDto = {
  id: "SKU_A-2",
  title: "Canvas jacket",
  description: "A lightweight jacket.",
  price: { amountCents: 10995, currency: "AUD" },
  category,
  imageUrl: "/api/v1/products/SKU_A-2/image",
  rating: { average: 4.8, count: 19 },
};

describe("P2-01: shared catalogue response contracts", () => {
  it("keeps the opaque ID, exact cents, and proxied image path", () => {
    expect(productDtoSchema.parse(product)).toEqual(product);
    expect(
      productDtoSchema.parse({ ...product, rating: null }).rating,
    ).toBeNull();
  });

  it("validates product identifiers and category slugs independently", () => {
    expect(productIdSchema.parse("SKU_A-2")).toBe("SKU_A-2");
    expect(categorySlugSchema.parse("mens-clothing")).toBe("mens-clothing");
    expect(productIdSchema.safeParse(42).success).toBe(false);
    expect(productIdSchema.safeParse("a/b").success).toBe(false);
    expect(productIdSchema.safeParse("x".repeat(65)).success).toBe(false);
    expect(categorySlugSchema.safeParse("Men's Clothing").success).toBe(false);
    expect(categorySlugSchema.safeParse("Men-Clothing").success).toBe(false);
  });

  it.each([
    ["fractional cents", { price: { amountCents: 10.95, currency: "AUD" } }],
    ["negative cents", { price: { amountCents: -1, currency: "AUD" } }],
    ["invalid currency", { price: { amountCents: 10995, currency: "aud" } }],
    ["invalid rating", { rating: { average: 6, count: 19 } }],
    ["fractional review count", { rating: { average: 4.8, count: 1.5 } }],
    ["external image", { imageUrl: "https://example.com/jacket.png" }],
    ["upstream field", { imageSourceUrl: "https://example.com/jacket.png" }],
  ])("rejects %s", (_label, invalid) => {
    expect(productDtoSchema.safeParse({ ...product, ...invalid }).success).toBe(
      false,
    );
  });

  it("validates both list envelopes and the category's two product groups", () => {
    expect(productListResponseSchema.parse({ items: [] })).toEqual({
      items: [],
    });
    expect(categoryListResponseSchema.parse({ items: [category] })).toEqual({
      items: [category],
    });
    expect(productListResponseSchema.safeParse([product]).success).toBe(false);
    expect(
      categoryListResponseSchema.safeParse({ items: [product] }).success,
    ).toBe(false);

    const group = { category, topRated: [product], others: [] };
    expect(categoryProductsResponseSchema.parse(group)).toEqual(group);
    expect(
      categoryProductsResponseSchema.safeParse({
        category,
        topRated: [product],
      }).success,
    ).toBe(false);
  });
});
