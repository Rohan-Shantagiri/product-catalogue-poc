import { NotFoundError } from "../domain/errors.js";
import type { ProductId } from "../domain/product.js";
import type { ImageFetcher } from "../ports/image-fetcher.js";
import type { MerchandisingSource } from "../ports/merchandising-source.js";
import type { ProductRepository } from "../ports/product-repository.js";
import { selectCategoryTopRated } from "./top-rated.js";

export type CatalogueEvent =
  | { type: "merchandising.unknown_id"; id: ProductId }
  | { type: "catalogue.top_rated_fallback"; slug: string };

export class CatalogueService {
  constructor(
    private readonly products: ProductRepository,
    private readonly merchandising: MerchandisingSource,
    private readonly images: ImageFetcher,
    private readonly report?: (event: CatalogueEvent) => void,
  ) {}

  async getTopRated() {
    const { topRatedProductIds } = await this.merchandising.getConfig();
    const products = await this.products.getByIds(topRatedProductIds);
    const found = new Set(products.map(({ id }) => id));
    for (const id of topRatedProductIds) {
      if (!found.has(id))
        this.report?.({ type: "merchandising.unknown_id", id });
    }
    return products;
  }

  listCategories() {
    return this.products.listCategories();
  }

  async getCategoryPage(slug: string) {
    const [products, config] = await Promise.all([
      this.products.listByCategory(slug),
      this.merchandising.getConfig(),
    ]);
    if (!products) throw new NotFoundError();
    const category =
      products[0]?.category ??
      (await this.products.listCategories()).find((item) => item.slug === slug);
    if (!category) throw new NotFoundError();

    const { mode, topRated, others } = selectCategoryTopRated(
      products,
      config.topRatedProductIds,
      config.categoryFallbackCount,
    );
    if (mode === "fallback")
      this.report?.({ type: "catalogue.top_rated_fallback", slug });
    return { category, topRated, others };
  }

  search(query: string) {
    return this.products.search(query);
  }

  async getProduct(id: ProductId) {
    const product = await this.products.getById(id);
    if (!product) throw new NotFoundError();
    return product;
  }

  async getProductImage(id: ProductId) {
    const product = await this.getProduct(id);
    const { fetch: fetchImage } = this.images;
    return fetchImage(product.imageSourceUrl);
  }
}
