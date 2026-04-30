import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// MegaRadio TV Web Preview — served by FastAPI at /tv-preview/
// Builds to /app/backend/static/tv-preview/ where backend mounts it.

export default defineConfig({
  base: "/api/tv-app/",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  publicDir: "public",
  build: {
    outDir: path.resolve(__dirname, "../../../../backend/static/tv-preview"),
    emptyOutDir: true,
    sourcemap: false,
  },
  server: {
    host: "0.0.0.0",
    port: 8030,
    fs: { strict: false },
  },
});
