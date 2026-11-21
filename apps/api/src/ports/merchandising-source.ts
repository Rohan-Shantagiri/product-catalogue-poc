import type { ProductId } from "../domain/product.js";

export type MerchandisingConfig = {
  topRatedProductIds: ProductId[];
  categoryFallbackCount: number;
};

export interface MerchandisingSource {
  getConfig(): Promise<MerchandisingConfig>;
}
