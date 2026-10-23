import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || "/avtofakultet-demo/",
  server: { port: 5173 },
  build: { sourcemap: false },
});
