import type { CategoryDto } from "@catalogue/contracts";
import { NavLink } from "react-router";
import styles from "./CategoryNav.module.css";

export function CategoryNav({ categories }: { categories: CategoryDto[] }) {
  return (
    <nav className={styles.nav} aria-label="Categories">
      <NavLink className={styles.link} to="/" end viewTransition>
        Featured
      </NavLink>
      {categories.map(({ slug, name }) => (
        <NavLink
          className={styles.link}
          key={slug}
          to={`/category/${slug}`}
          viewTransition
        >
          {name}
        </NavLink>
      ))}
    </nav>
  );
}
