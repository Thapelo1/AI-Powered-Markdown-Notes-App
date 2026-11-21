import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // Keep browser API calls same-origin in development; Express handles them on port 3001.
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
});
