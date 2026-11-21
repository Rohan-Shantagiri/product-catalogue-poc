import { categorySlugSchema } from "@catalogue/contracts";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router";
import { NotFoundPage } from "../../../app/NotFoundPage";
import { isNotFound } from "../../../shared/api/api-error";
import { pageTitle } from "../../../shared/lib/brand";
import { ErrorState, StatusMessage } from "../../../shared/ui/Status";
import { ProductSection } from "../components/ProductSection";
import { categoryQuery } from "../queries";
import styles from "./Pages.module.css";

export function CategoryPage() {
  const slug = useParams().slug ?? "";
  const valid = categorySlugSchema.safeParse(slug).success;
  const result = useQuery({ ...categoryQuery(slug), enabled: valid });
  if (!valid || isNotFound(result.error)) return <NotFoundPage />;

  const page = result.data;
  return (
    <div className={styles.page}>
      <title>{pageTitle(page?.category.name ?? "Category")}</title>
      <h1 className={styles.heading}>{page?.category.name ?? "Category"}</h1>
      {page ? (
        <>
          <ProductSection title="Top rated" products={page.topRated} />
          {page.others.length > 0 && (
            <ProductSection
              title={`More in ${page.category.name}`}
              products={page.others}
            />
          )}
        </>
      ) : result.isError ? (
        <ErrorState
          message="Could not load this category."
          onRetry={() => void result.refetch()}
        />
      ) : (
        <StatusMessage message="Loading category…" />
      )}
    </div>
  );
}
