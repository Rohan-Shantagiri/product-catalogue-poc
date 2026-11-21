import type { Category, Product, ProductId } from "../domain/product.js";

export interface ProductRepository {
  listCategories(): Promise<Category[]>;
  listByCategory(slug: string): Promise<Product[] | null>;
  getById(id: ProductId): Promise<Product | null>;
  getByIds(ids: readonly ProductId[]): Promise<Product[]>;
  search(query: string): Promise<Product[]>;
}
