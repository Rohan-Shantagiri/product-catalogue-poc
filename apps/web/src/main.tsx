import { createRoot } from "react-dom/client";
import { createBrowserRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import { AppProviders, createAppQueryClient } from "./app/providers";
import { appRoutes } from "./app/router";
import "./shared/theme/tokens.css";
import "./shared/theme/global.css";

const root = document.getElementById("root");
if (!root) throw new Error("Missing application root");

const queryClient = createAppQueryClient();
const router = createBrowserRouter(appRoutes);

createRoot(root).render(
  <AppProviders queryClient={queryClient}>
    <RouterProvider router={router} />
  </AppProviders>,
);
