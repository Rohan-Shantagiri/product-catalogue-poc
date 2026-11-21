import { Link } from "react-router";
import { pageTitle } from "../shared/lib/brand";
import styles from "./Page.module.css";

export function NotFoundPage() {
  return (
    <section className={styles.panel}>
      <title>{pageTitle("Page not found")}</title>
      <h1>Page not found</h1>
      <p>Check the address or return to the catalogue.</p>
      <Link to="/">Back to catalogue</Link>
    </section>
  );
}
