import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { pageTitle } from "../../../shared/lib/brand";
import { formatPrice } from "../../../shared/lib/format-price";
import { ErrorState, StatusMessage } from "../../../shared/ui/Status";
import { ProductImage } from "../components/ProductImage";
import { ProductSection } from "../components/ProductSection";
import { topRatedQuery } from "../queries";
import styles from "./Pages.module.css";

export function HomePage() {
  const products = useQuery(topRatedQuery);
  const featured = products.data?.items[0];

  return (
    <div className={styles.page}>
      <title>{pageTitle("Product catalogue")}</title>
      <div
        className={
          featured ? `${styles.hero} ${styles.withFeature}` : styles.hero
        }
      >
        <div className={styles.heroCopy}>
          <h1>
            Find your next <em>favourite</em>
          </h1>
          {featured && (
            <a className={styles.browse} href="#top-rated">
              Browse top rated
            </a>
          )}
        </div>
        {featured && (
          <Link
            className={styles.feature}
            to={`/products/${featured.id}`}
            aria-label={`View ${featured.title}`}
            aria-describedby="featured-price"
            viewTransition
          >
            <div className={styles.featureMedia}>
              <ProductImage
                className={styles.featurePhoto}
                imageUrl={featured.imageUrl}
                title={featured.title}
                decorative
                eager
              />
            </div>
            <div className={styles.featureCaption}>
              <span>{featured.title}</span>
              <span id="featured-price" className={styles.featurePrice}>
                {formatPrice(featured.price)}
              </span>
            </div>
          </Link>
        )}
      </div>
      {products.data ? (
        <ProductSection
          title="Top rated"
          id="top-rated"
          products={products.data.items}
        />
      ) : products.isError ? (
        <ErrorState
          message="Could not load top-rated products."
          onRetry={() => void products.refetch()}
        />
      ) : (
        <StatusMessage message="Loading products…" />
      )}
    </div>
  );
}
