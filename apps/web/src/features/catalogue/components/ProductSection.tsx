import type { ProductDto } from "@catalogue/contracts";
import { useId } from "react";
import { StatusMessage } from "../../../shared/ui/Status";
import { ProductGrid } from "./ProductGrid";
import styles from "./Products.module.css";

export function ProductSection({
  title,
  products,
  id,
}: {
  title: string;
  products: ProductDto[];
  id?: string;
}) {
  const heading = useId();
  return (
    <section
      className={styles.section}
      id={id}
      tabIndex={id ? -1 : undefined}
      aria-labelledby={heading}
    >
      <h2 id={heading}>{title}</h2>
      {products.length > 0 ? (
        <ProductGrid products={products} />
      ) : (
        <StatusMessage message="No products available." />
      )}
    </section>
  );
}
