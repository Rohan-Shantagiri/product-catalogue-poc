import { productIdSchema } from "@catalogue/contracts";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router";
import { NotFoundPage } from "../../../app/NotFoundPage";
import { isNotFound } from "../../../shared/api/api-error";
import { pageTitle } from "../../../shared/lib/brand";
import { ErrorState, StatusMessage } from "../../../shared/ui/Status";
import { EnquirySection } from "../../enquiry/containers/EnquirySection";
import { ProductDetails } from "../components/ProductDetails";
import { productQuery } from "../queries";
import styles from "./Pages.module.css";

export function ProductPage() {
  const id = useParams().id ?? "";
  const valid = productIdSchema.safeParse(id).success;
  const result = useQuery({ ...productQuery(id), enabled: valid });
  if (!valid || isNotFound(result.error)) return <NotFoundPage />;

  const product = result.data;
  return (
    <div className={styles.page}>
      <title>{pageTitle(product?.title ?? "Product")}</title>
      {product ? (
        <>
          <ProductDetails product={product} />
          <EnquirySection
            key={product.id}
            productId={product.id}
            title={product.title}
          />
        </>
      ) : (
        <>
          <h1 className={styles.heading}>Product</h1>
          {result.isError ? (
            <ErrorState
              message="Could not load this product."
              onRetry={() => void result.refetch()}
            />
          ) : (
            <StatusMessage message="Loading product…" />
          )}
        </>
      )}
    </div>
  );
}
