import type { Category } from "./product.js";
import { tokenize } from "./search.js";

export function toCategory(source: string): Category {
  const name = source
    .trim()
    .split(/\s+/u)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");

  return { slug: tokenize(source).join("-"), name };
}
