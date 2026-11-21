import { z } from "zod";
import { UpstreamUnavailableError } from "../../../domain/errors.js";
import { toCents } from "../../../domain/money.js";
import type { Product } from "../../../domain/product.js";
import { toCategory } from "../../../domain/slug.js";
import { mapFakeStoreProduct } from "./fakestore-mapper.js";

const isCategory = (value: string) =>
  /^[a-z0-9-]{1,64}$/.test(toCategory(value).slug);

export const fakeStoreProductSchema = z.object({
  id: z.int().positive(),
  title: z.string().min(1),
  price: z
    .number()
    .nonnegative()
    .refine((price) => Number.isSafeInteger(toCents(price))),
  description: z.string(),
  category: z.string().refine(isCategory),
  image: z.url({ protocol: /^https?$/ }),
  rating: z.object({
    rate: z.number().min(0).max(5),
    count: z.int().nonnegative(),
  }),
});

export type FakeStoreProduct = z.infer<typeof fakeStoreProductSchema>;

const upstreamArray = z.array(z.unknown());

export function decodeFakeStoreProducts(
  raw: unknown,
  currency: string,
  onInvalid?: (index: number) => void,
): Product[] {
  const array = upstreamArray.safeParse(raw);
  if (!array.success) throw new UpstreamUnavailableError();

  const seen = new Set<number>();
  const products: Product[] = [];
  for (const [index, value] of array.data.entries()) {
    const result = fakeStoreProductSchema.safeParse(value);
    if (!result.success || seen.has(result.data.id)) {
      onInvalid?.(index);
      continue;
    }
    seen.add(result.data.id);
    products.push(mapFakeStoreProduct(result.data, currency));
  }

  if (products.length === 0 && array.data.length > 0)
    throw new UpstreamUnavailableError();
  return products;
}

export function assertRecordableSnapshot(raw: unknown, currency: string): void {
  const products = decodeFakeStoreProducts(raw, currency, () => {
    throw new Error("Snapshot contains an invalid or duplicate product");
  });
  if (products.length === 0) throw new Error("Snapshot contains no products");
}
