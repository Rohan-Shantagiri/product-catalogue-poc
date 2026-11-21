import { queryOptions } from "@tanstack/react-query";
import { getCategories, getCategory, getProduct, getTopRated } from "./api";

export const categoriesQuery = queryOptions({
  queryKey: ["catalogue", "categories"],
  queryFn: ({ signal }) => getCategories(signal),
});

export const topRatedQuery = queryOptions({
  queryKey: ["catalogue", "top-rated"],
  queryFn: ({ signal }) => getTopRated(signal),
});

export function categoryQuery(slug: string) {
  return queryOptions({
    queryKey: ["catalogue", "category", slug],
    queryFn: ({ signal }) => getCategory(slug, signal),
  });
}

export function productQuery(id: string) {
  return queryOptions({
    queryKey: ["catalogue", "product", id],
    queryFn: ({ signal }) => getProduct(id, signal),
  });
}
