import styles from "./SearchForm.module.css";

export function SearchForm({
  initialQuery,
  onSearch,
}: {
  initialQuery: string;
  onSearch: (query: string) => void;
}) {
  return (
    <form
      className={styles.form}
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        const input = new FormData(event.currentTarget).get("q");
        if (typeof input !== "string") return;
        const query = input.trim();
        if (query && query.length <= 100) onSearch(query);
      }}
    >
      <input
        className={styles.input}
        aria-label="Search products"
        type="search"
        name="q"
        placeholder="Search products"
        required
        maxLength={100}
        defaultValue={initialQuery}
      />
      <button className={styles.button} type="submit">
        Search
      </button>
    </form>
  );
}
