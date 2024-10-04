import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        index: "./frontend/index.js",
        stats: "./frontend/stats.js",
        main: "./frontend/main.js",
        admin: "./frontend/admin.js",
      },
    },
    copyPublicDir: false,
    manifest: true,
  },
  plugins: [vue()],
});
