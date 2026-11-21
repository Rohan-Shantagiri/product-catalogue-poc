import { productListResponseSchema } from "@catalogue/contracts";
import { requestJson } from "../../shared/api/http";

export function searchProducts(q: string, signal: AbortSignal) {
  return requestJson(
    `/products?${new URLSearchParams({ q })}`,
    productListResponseSchema,
    { signal },
  );
}
