import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// The backend the dev server forwards API calls to.
const API_TARGET = process.env.VITE_API_PROXY_TARGET || "http://127.0.0.1:5000";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Local school addresses (http://bs2.localhost:5173) call the API through this
    // same origin. changeOrigin stays false, so the school name in the Host header
    // still reaches the backend and selects the school.
    proxy: {
      "/api": { target: API_TARGET, changeOrigin: false },
      "/y26": { target: API_TARGET, changeOrigin: false },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
