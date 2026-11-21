import { toCents } from "../../../domain/money.js";
import type { Product } from "../../../domain/product.js";
import { toCategory } from "../../../domain/slug.js";
import type { FakeStoreProduct } from "./fakestore-schema.js";

export function mapFakeStoreProduct(
  raw: FakeStoreProduct,
  currency: string,
): Product {
  return {
    id: String(raw.id),
    title: raw.title,
    description: raw.description,
    price: { amountCents: toCents(raw.price), currency },
    category: toCategory(raw.category),
    imageSourceUrl: raw.image,
    rating: { average: raw.rating.rate, count: raw.rating.count },
  };
}
