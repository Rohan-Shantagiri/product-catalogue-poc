import type { RouteObject } from "react-router";
import { CategoryPage } from "../features/catalogue/pages/CategoryPage";
import { HomePage } from "../features/catalogue/pages/HomePage";
import { ProductPage } from "../features/catalogue/pages/ProductPage";
import { SearchPage } from "../features/search/pages/SearchPage";
import { Layout } from "./Layout";
import { NotFoundPage } from "./NotFoundPage";
import { RouteErrorPage } from "./RouteErrorPage";

export const appRoutes: RouteObject[] = [
  {
    path: "/",
    element: <Layout />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "category/:slug", element: <CategoryPage /> },
      { path: "products/:id", element: <ProductPage /> },
      { path: "search", element: <SearchPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
];
