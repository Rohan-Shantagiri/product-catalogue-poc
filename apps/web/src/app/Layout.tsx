import { useQuery } from "@tanstack/react-query";
import { Link, Outlet } from "react-router";
import { CategoryNav } from "../features/catalogue/components/CategoryNav";
import { categoriesQuery } from "../features/catalogue/queries";
import { brand } from "../shared/lib/brand";
import styles from "./Layout.module.css";

export function Layout() {
  const categories = useQuery(categoriesQuery);
  return (
    <div className={styles.layout}>
      <a className={styles.skip} href="#main-content">
        Skip to main content
      </a>
      <header className={styles.header} id="page-top" tabIndex={-1}>
        <div className={`${styles.frame} ${styles.headerInner}`}>
          <Link className={styles.brand} to="/" viewTransition>
            {brand}
          </Link>
          {categories.data && (
            <CategoryNav categories={categories.data.items} />
          )}
        </div>
      </header>
      <main
        className={`${styles.frame} ${styles.main}`}
        id="main-content"
        tabIndex={-1}
      >
        <Outlet />
      </main>
      <footer className={styles.footer}>
        <div className={styles.frame}>
          <a href="#page-top">Back to top</a>
        </div>
      </footer>
    </div>
  );
}
