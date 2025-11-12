import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/",            // สำคัญ ถ้าเคยตั้ง base เพี้ยน ไฟล์ chunk จะ 404
  build: { target: "es2019" } // เผื่อ Safari เก่า
});
