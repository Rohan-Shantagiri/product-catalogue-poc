import type { Product } from "../src/domain/product.js";

export function makeProduct(
  id: string,
  overrides: Partial<Product> = {},
): Product {
  return {
    id,
    title: `Product ${id}`,
    description: "Description",
    price: { amountCents: 10995, currency: "AUD" },
    category: { slug: "electronics", name: "Electronics" },
    imageSourceUrl: "https://images.example.com/product.png",
    rating: null,
    ...overrides,
  };
}
