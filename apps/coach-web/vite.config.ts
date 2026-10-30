import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// Served next to the old planner: https://<user>.github.io/workout_plan/coach/
const base = process.env.NODE_ENV === "production" ? "/workout_plan/coach/" : "/";

export default defineConfig({
  base,
  build: {
    outDir: "../../dist/coach",
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  plugins: [
    react(),
    VitePWA({
      // ask before swapping versions, so an update never reloads mid-session
      registerType: "prompt",
      includeAssets: ["icons/icon.svg", "icons/apple-touch-icon.png"],
      workbox: { globPatterns: ["**/*.{js,css,html,png,svg}"], cleanupOutdatedCaches: true },
      manifest: {
        id: base,
        name: "Coach — prescrição de treino",
        short_name: "Coach",
        description: "Prescrever e registar treinos personalizados",
        lang: "pt-PT",
        dir: "ltr",
        theme_color: "#0f0f0f",
        background_color: "#0f0f0f",
        display: "standalone",
        orientation: "portrait",
        scope: base,
        start_url: base,
        categories: ["health", "fitness", "productivity"],
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
        shortcuts: [
          { name: "Clientes", url: `${base}#/`, icons: [{ src: "icons/icon-192.png", sizes: "192x192" }] },
          { name: "Biblioteca", url: `${base}#/library`, icons: [{ src: "icons/icon-192.png", sizes: "192x192" }] },
        ],
      },
    }),
  ],
});
