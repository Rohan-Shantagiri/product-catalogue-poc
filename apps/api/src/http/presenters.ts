import {
  categoryListResponseSchema,
  categoryProductsResponseSchema,
  healthResponseSchema,
  problemDetailsSchema,
  productDtoSchema,
  productListResponseSchema,
} from "@catalogue/contracts";
import type { ProblemDetails, ProductDto } from "@catalogue/contracts";
import type { Category, Product } from "../domain/product.js";

export function presentHealth() {
  return healthResponseSchema.parse({ status: "ok" });
}

export function presentProblem(problem: Omit<ProblemDetails, "type">) {
  return problemDetailsSchema.parse({ type: "about:blank", ...problem });
}

function toProductDto(product: Product): ProductDto {
  return {
    id: product.id,
    title: product.title,
    description: product.description,
    price: product.price,
    category: product.category,
    imageUrl: `/api/v1/products/${product.id}/image`,
    rating: product.rating,
  };
}

export function presentProduct(product: Product) {
  return productDtoSchema.parse(toProductDto(product));
}

export function presentProducts(products: Product[]) {
  return productListResponseSchema.parse({ items: products.map(toProductDto) });
}

export function presentCategories(categories: Category[]) {
  return categoryListResponseSchema.parse({ items: categories });
}

export function presentCategoryPage(page: {
  category: Category;
  topRated: Product[];
  others: Product[];
}) {
  return categoryProductsResponseSchema.parse({
    category: page.category,
    topRated: page.topRated.map(toProductDto),
    others: page.others.map(toProductDto),
  });
}
