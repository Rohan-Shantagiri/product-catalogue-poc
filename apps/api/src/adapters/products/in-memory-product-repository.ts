import type { Category, Product, ProductId } from "../../domain/product.js";
import { searchProducts } from "../../domain/search.js";
import type { ProductRepository } from "../../ports/product-repository.js";

export class InMemoryProductRepository implements ProductRepository {
  constructor(private readonly loadProducts: () => Promise<Product[]>) {}

  async listCategories(): Promise<Category[]> {
    const products = await this.loadProducts();
    const bySlug = new Map(
      products.map(({ category }) => [category.slug, category]),
    );
    return [...bySlug.values()].sort((a, b) =>
      a.name.localeCompare(b.name, "en-AU"),
    );
  }

  async listByCategory(slug: string): Promise<Product[] | null> {
    const products = (await this.loadProducts()).filter(
      (product) => product.category.slug === slug,
    );
    return products.length ? products : null;
  }

  async getById(id: ProductId): Promise<Product | null> {
    return (
      (await this.loadProducts()).find((product) => product.id === id) ?? null
    );
  }

  async getByIds(ids: readonly ProductId[]): Promise<Product[]> {
    const byId = new Map(
      (await this.loadProducts()).map((product) => [product.id, product]),
    );
    return ids.flatMap((id) => {
      const product = byId.get(id);
      return product ? [product] : [];
    });
  }

  async search(query: string): Promise<Product[]> {
    return searchProducts(await this.loadProducts(), query);
  }
}
