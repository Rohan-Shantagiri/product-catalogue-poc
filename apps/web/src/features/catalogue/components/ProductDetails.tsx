import type { ProductDto } from "@catalogue/contracts";
import { Link } from "react-router";
import { formatPrice } from "../../../shared/lib/format-price";
import { ProductImage } from "./ProductImage";
import styles from "./Products.module.css";

export function ProductDetails({ product }: { product: ProductDto }) {
  const { title, category, description, rating } = product;
  return (
    <article className={styles.details}>
      <div className={styles.detailMedia}>
        <ProductImage
          className={styles.image}
          imageUrl={product.imageUrl}
          title={title}
          eager
        />
      </div>
      <div className={styles.detailContent}>
        <Link
          className={styles.categoryLink}
          to={`/category/${category.slug}`}
          viewTransition
        >
          {category.name}
        </Link>
        <h1>{title}</h1>
        <p className={styles.detailPrice}>{formatPrice(product.price)}</p>
        {rating && (
          <p className={styles.rating}>
            {rating.average.toFixed(1)} out of 5 ({rating.count}{" "}
            {rating.count === 1 ? "review" : "reviews"})
          </p>
        )}
        <p className={styles.description}>{description}</p>
      </div>
    </article>
  );
}
