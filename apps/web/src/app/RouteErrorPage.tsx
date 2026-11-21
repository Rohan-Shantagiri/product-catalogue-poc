import { Link } from "react-router";
import { pageTitle } from "../shared/lib/brand";
import styles from "./Page.module.css";

export function RouteErrorPage() {
  return (
    <main className={`${styles.panel} ${styles.errorPage}`}>
      <title>{pageTitle("Page unavailable")}</title>
      <h1>This page is unavailable</h1>
      <p>Return to the catalogue to try again.</p>
      <Link to="/">Back to catalogue</Link>
    </main>
  );
}
