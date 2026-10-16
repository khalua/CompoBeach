import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  root: "src/client",
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: { "/api": `http://localhost:${process.env.PORT ?? 8787}` },
  },
  build: { outDir: "../../dist", emptyOutDir: true, chunkSizeWarningLimit: 3000 },
});
