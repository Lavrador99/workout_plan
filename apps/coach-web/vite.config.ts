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
      registerType: "autoUpdate",
      workbox: { globPatterns: ["**/*.{js,css,html,png,svg}"] },
      manifest: {
        name: "Coach — prescrição de treino",
        short_name: "Coach",
        description: "Prescrever e registar treinos personalizados",
        theme_color: "#0f0f0f",
        background_color: "#0f0f0f",
        display: "standalone",
        orientation: "portrait",
        scope: base,
        start_url: base,
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
    }),
  ],
});
