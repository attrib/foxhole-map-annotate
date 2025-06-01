import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        index: "./frontend/index.ts",
        stats: "./frontend/stats.ts",
        main: "./frontend/main.ts",
        admin: "./frontend/admin.ts",
      },
    },
    copyPublicDir: false,
    manifest: true,
  },
  plugins: [vue()],
});
