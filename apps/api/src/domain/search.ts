import type { Product } from "./product.js";

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .replace(/['‘’]/gu, "")
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

export function searchProducts(
  products: readonly Product[],
  query: string,
): Product[] {
  const terms = tokenize(query).map((word) =>
    word.length > 3 && word.endsWith("s") && !word.endsWith("ss")
      ? word.slice(0, -1)
      : word,
  );
  if (terms.length === 0) return [];

  const titleMatches: Product[] = [];
  const otherMatches: Product[] = [];
  const matches = (words: string[]) =>
    terms.every((term) => words.some((word) => word.startsWith(term)));

  for (const product of products) {
    const title = tokenize(product.title);
    if (matches(title)) {
      titleMatches.push(product);
    } else if (
      matches([
        ...title,
        ...tokenize(product.description),
        ...tokenize(product.category.name),
      ])
    ) {
      otherMatches.push(product);
    }
  }

  return [...titleMatches, ...otherMatches];
}
