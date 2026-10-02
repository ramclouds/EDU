import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    // Silences "[BABEL] Note: The code generator has deoptimised the
    // styling ... as it exceeds the max of 500KB" for the very large
    // dashboard files. It is only a note (output is still correct).
    react({ babel: { compact: false } }),
    tailwindcss(),
  ],
  server: {
    port: 5173,
  },
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
