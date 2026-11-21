import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  define: {
    __PWA_BUILD_ID__: JSON.stringify(Date.now().toString()),
  },
  build: {
    manifest: "asset-manifest.json",
  },
  server: {
    // Keep browser API calls same-origin in development; Express handles them on port 3002.
    proxy: {
      "/api": "http://localhost:3002",
    },
  },
});
