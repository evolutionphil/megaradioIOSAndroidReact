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
      // Compatibility target — every Samsung Tizen 4.0+ (2018+) and
      // LG WebOS 4.0+ (2018+) TV. These ship Chromium 53+ which natively
      // supports ES2017 including async/await, optional catch, etc.
      //
      // 2017 Tizen 3.0 / WebOS 3.x devices ship Chromium 47-38 and would
      // need Babel `loose` + ES5 compile (esbuild can't downlevel `const`
      // → `var`). To support those we'd add a babel-loader stage on top
      // of esbuild — separate engineering task, ~+10% bundle size.
      // 2018+ covers >95% of in-market Samsung/LG TVs as of 2026.
      target: ['es2017', 'chrome53'],
      cssTarget: 'chrome53',
      modulePreload: { polyfill: false },
    },
    server: {
      host: "0.0.0.0",
      port: 8030,
      fs: { strict: false },
    },
  };
});
