import type { ProductDto } from "@catalogue/contracts";
import { Link } from "react-router";
import { formatPrice } from "../../../shared/lib/format-price";
import { ProductImage } from "./ProductImage";
import styles from "./Products.module.css";

export function ProductTile({ product }: { product: ProductDto }) {
  return (
    <article className={styles.tile}>
      <Link
        className={styles.tileLink}
        to={`/products/${product.id}`}
        aria-label={product.title}
        viewTransition
      >
        <div className={styles.tileMedia}>
          <ProductImage
            className={styles.image}
            imageUrl={product.imageUrl}
            title={product.title}
          />
        </div>
        <h3 className={styles.tileTitle}>{product.title}</h3>
      </Link>
      <p className={styles.tilePrice}>{formatPrice(product.price)}</p>
    </article>
  );
}
