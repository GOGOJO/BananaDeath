import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // GitHub Pages serves the site from /<repo>/, so CI sets BASE_PATH.
  base: process.env.BASE_PATH ?? "/",
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    exclude: ["onnxruntime-web"],
  },
  test: {
    environment: "node",
  },
});
