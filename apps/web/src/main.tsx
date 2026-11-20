import { createRoot } from "react-dom/client";
import { HealthPage } from "./app/HealthPage";

const root = document.getElementById("root");
if (!root) throw new Error("Missing application root");

createRoot(root).render(<HealthPage />);
