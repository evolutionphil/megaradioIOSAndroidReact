import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// MegaRadio TV Web Preview — served by FastAPI at /tv-preview/
// Builds to /app/backend/static/tv-preview/ where backend mounts it.

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Version injected so UpdateBanner can compare against /api/tv/version.
  // Override via VITE_APP_VERSION env var (used by prepare-tizen.js / CI).
  const APP_VERSION = env.VITE_APP_VERSION || '1.0.2';

  return {
    base: "/api/tv-app/",
    plugins: [react()],
    define: {
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(APP_VERSION),
    },
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
  };
});
