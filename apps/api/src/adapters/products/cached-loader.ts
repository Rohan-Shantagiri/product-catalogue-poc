import type { Product } from "../../domain/product.js";

export class CachedProductLoader {
  private current?: { products: Product[]; expiresAt: number };
  private inFlight?: Promise<Product[]>;

  constructor(
    private readonly loadProducts: () => Promise<Product[]>,
    private readonly ttlMs: number,
    private readonly now = Date.now,
    private readonly onStale?: () => void,
  ) {}

  readonly load = (): Promise<Product[]> => {
    if (this.current && this.now() < this.current.expiresAt) {
      return Promise.resolve(this.current.products);
    }
    if (this.inFlight) return this.inFlight;

    this.inFlight = Promise.resolve()
      .then(this.loadProducts)
      .then((products) => {
        this.current = { products, expiresAt: this.now() + this.ttlMs };
        return products;
      })
      .catch((error: unknown) => {
        if (!this.current) throw error;
        this.onStale?.();
        return this.current.products;
      })
      .finally(() => {
        this.inFlight = undefined;
      });
    return this.inFlight;
  };
}
