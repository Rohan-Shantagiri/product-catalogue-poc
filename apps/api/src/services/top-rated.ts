import type { Product, ProductId } from "../domain/product.js";

export function selectCategoryTopRated(
  products: readonly Product[],
  chosenIds: readonly ProductId[],
  fallbackCount: number,
) {
  const byId = new Map(products.map((product) => [product.id, product]));
  const chosen = chosenIds.flatMap((id) => {
    const product = byId.get(id);
    return product ? [product] : [];
  });
  const mode = chosen.length ? "chosen" : "fallback";

  const topRated =
    mode === "chosen"
      ? chosen
      : products
          .toSorted(
            (a, b) =>
              (b.rating?.average ?? -1) - (a.rating?.average ?? -1) ||
              (b.rating?.count ?? 0) - (a.rating?.count ?? 0),
          )
          .slice(0, fallbackCount);
  const topRatedIds = new Set(topRated.map(({ id }) => id));
  return {
    topRated,
    others: products.filter(({ id }) => !topRatedIds.has(id)),
    mode,
  };
}
