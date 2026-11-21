import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const envDir = fileURLToPath(new URL("../../", import.meta.url));
  const env = loadEnv(mode, envDir, "PORT");

  return {
    plugins: [react()],
    server: {
      proxy: {
        "/api": `http://127.0.0.1:${env.PORT || "3000"}`,
      },
    },
  };
});
