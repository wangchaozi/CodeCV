import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // 配置共享包的路径别名
      "@ai-platform/shared-types": path.resolve(
        __dirname,
        "../../packages/shared-types/src",
      ),
      // 前端内部别名（可选）
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    // 配置代理，解决跨域
    proxy: {
      "/api": {
        target: "http://localhost:4000", // 后端服务地址
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
    port: 3000, // 前端端口
  },
});
