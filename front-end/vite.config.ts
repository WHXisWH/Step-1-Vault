import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  optimizeDeps: {
    include: [
        "echarts-for-react", 
        "echarts", 
        "@massalabs/massa-web3"
    ],
    esbuildOptions: { 
      target: "es2020"
    }  
  },

  build: {
    target: "es2020",                       
    outDir: "dist",
    sourcemap: true,
    commonjsOptions: {
      // <-- 添加这个配置
      transformMixedEsModules: true,
    }
  },

  define: { "process.env": {} },
  server: { port: 3000, open: true }
});