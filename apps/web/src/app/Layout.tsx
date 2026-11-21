import { useQuery } from "@tanstack/react-query";
import {
  Link,
  Outlet,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router";
import { CategoryNav } from "../features/catalogue/components/CategoryNav";
import { categoriesQuery } from "../features/catalogue/queries";
import { SearchForm } from "../features/search/components/SearchForm";
import { brand } from "../shared/lib/brand";
import styles from "./Layout.module.css";

export function Layout() {
  const categories = useQuery(categoriesQuery);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const query = pathname === "/search" ? (params.get("q")?.trim() ?? "") : "";

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
          <SearchForm
            key={query}
            initialQuery={query}
            onSearch={(q) =>
              void navigate(
                {
                  pathname: "/search",
                  search: new URLSearchParams({ q }).toString(),
                },
                { viewTransition: true },
              )
            }
          />
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
