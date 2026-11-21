import type { ProductDto } from "@catalogue/contracts";
import { ProductTile } from "./ProductTile";
import styles from "./Products.module.css";

export function ProductGrid({ products }: { products: ProductDto[] }) {
  return (
    <div className={styles.grid}>
      {products.map((product) => (
        <ProductTile key={product.id} product={product} />
      ))}
    </div>
  );
}
