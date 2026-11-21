import {
  categoryListResponseSchema,
  categoryProductsResponseSchema,
  productDtoSchema,
  productListResponseSchema,
} from "@catalogue/contracts";
import { requestJson } from "../../shared/api/http";

export function getCategories(signal: AbortSignal) {
  return requestJson("/categories", categoryListResponseSchema, { signal });
}

export function getTopRated(signal: AbortSignal) {
  return requestJson("/collections/top-rated", productListResponseSchema, {
    signal,
  });
}

export function getCategory(slug: string, signal: AbortSignal) {
  return requestJson(
    `/categories/${encodeURIComponent(slug)}/products`,
    categoryProductsResponseSchema,
    { signal },
  );
}

export function getProduct(id: string, signal: AbortSignal) {
  return requestJson(`/products/${encodeURIComponent(id)}`, productDtoSchema, {
    signal,
  });
}
