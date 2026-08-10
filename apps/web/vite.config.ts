import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(async () => {
  const { cloudflare } = await import("@cloudflare/vite-plugin");
  return {
    plugins: [react(), cloudflare()],
    server: { port: 43117, strictPort: true },
    preview: { port: 43117, strictPort: true },
  };
});
