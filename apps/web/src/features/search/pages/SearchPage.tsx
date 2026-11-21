import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router";
import { pageTitle } from "../../../shared/lib/brand";
import { ErrorState, StatusMessage } from "../../../shared/ui/Status";
import { ProductSection } from "../../catalogue/components/ProductSection";
import styles from "../../catalogue/pages/Pages.module.css";
import { searchQuery } from "../queries";

export function SearchPage() {
  const [params] = useSearchParams();
  const query = params.get("q")?.trim() ?? "";
  const prompt = !query
    ? "Enter a product name or keyword to search."
    : query.length > 100
      ? "Enter up to 100 characters to search."
      : undefined;
  const result = useQuery({ ...searchQuery(query), enabled: !prompt });
  const heading = prompt ? "Search" : `Results for "${query}"`;

  let content;
  if (prompt) {
    content = <StatusMessage message={prompt} />;
  } else if (result.data) {
    content =
      result.data.items.length > 0 ? (
        <ProductSection title="Products" products={result.data.items} />
      ) : (
        <StatusMessage message={`No products match "${query}".`} />
      );
  } else if (result.isError) {
    content = (
      <ErrorState
        message="Could not load search results."
        onRetry={() => void result.refetch()}
      />
    );
  } else {
    content = <StatusMessage message="Searching products…" />;
  }

  return (
    <div className={styles.page}>
      <title>{pageTitle(heading)}</title>
      <h1 className={styles.heading}>{heading}</h1>
      {content}
    </div>
  );
}
