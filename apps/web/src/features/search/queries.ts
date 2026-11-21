import { queryOptions } from "@tanstack/react-query";
import { searchProducts } from "./api";

export function searchQuery(q: string) {
  return queryOptions({
    queryKey: ["catalogue", "search", q],
    queryFn: ({ signal }) => searchProducts(q, signal),
  });
}
